/**
 * Tick one Charger (Station model): normalize fields to 0–1, run hazard, sample failure.
 * Updates status and optional degradation. Used by the simulation loop in App.
 *
 * Charger lifecycle:
 *   operational → (random failure) → failed
 *   operational → (agent derates) → partially_operational
 *   partially_operational → (HW < 0.3 threshold) → failed
 *   failed → (agent creates support ticket) → awaiting physical repair
 *
 * Electrical properties degrade proportionally to hardware_state:
 *   - voltage deviates from nominal
 *   - insulation resistance drops
 *   - ground fault leakage current rises
 *   - THD increases
 *   - internal temperature rises
 *   - power factor degrades
 */

import type { Charger } from '@/data/types'
import type { FailureConfig } from './config'
import { entropyFromConfig } from './stress'
import { lambdaD, pFail } from './hazard'

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Normalize Charger fields to 0–1 for stress/hazard (same order as stressVector). */
function chargerToStress(c: Charger): [number, number, number, number, number, number, number, number, number, number] {
  const hw = clamp01(c.hardware_state)
  const util = clamp01(c.utilization_rate / 100)
  const grid = clamp01(c.grid_stress / 100)
  const temp = clamp01((c.ambient_temperature - 15) / 30)
  const cycles = clamp01(c.connector_cycles / 5000)
  const gap = clamp01(c.maintenance_gap / 90)

  const isDcfc = c.voltage_v > 300
  const nomV = isDcfc ? 440 : 224
  const devV = isDcfc ? 60 : 30
  const vDev = clamp01(Math.abs(c.voltage_v - nomV) / devV)
  const insul = 1 - clamp01(c.insulation_resistance_mohm / 500)
  const gf = clamp01(c.ground_fault_current_ma / 30)
  const therm = clamp01((c.internal_temp_celsius - 25) / 60)

  return [hw, util, grid, temp, cycles, gap, vDev, insul, gf, therm]
}

/**
 * Daily failure probability for this charger at the given day (same formula as tick).
 * Used by the tooltip to show P(fail today). Returns 1 if charger is already failed.
 */
export function getChargerPFail(
  charger: Charger,
  day: number,
  config: FailureConfig
): number {
  if (charger.status === 'failed') return 1
  const installDay = charger.install_day ?? 0
  const ageDays = Math.max(0, day - installDay)
  const stress = chargerToStress(charger)
  const h = entropyFromConfig(stress, config)
  const hw01 = clamp01(charger.hardware_state)
  const lD = lambdaD(h, hw01, ageDays, config)
  return pFail(lD)
}

/** Daily hardware degradation (marginal decrease). */
const HARDWARE_DEGRADATION_PER_DAY = 0.00006

/** Partially-operational chargers degrade faster (running at reduced capacity with known issues). */
const PARTIAL_OP_DEGRADATION_MULTIPLIER = 3

/** Hardware state threshold below which a partially_operational charger transitions to failed. */
const PARTIAL_OP_FAILURE_THRESHOLD = 0.3

/**
 * Degrade electrical properties based on hardware_state.
 * As hardware degrades from 1.0 → 0.0, electrical properties worsen.
 */
function degradeElectricalProperties(charger: Charger): Partial<Charger> {
  const hw = charger.hardware_state
  // degradation factor: 0 at hw=1.0, 1 at hw=0.0
  const deg = 1 - hw

  const isDcfc = charger.voltage_v > 300
  const nomV = isDcfc ? 440 : 224

  // Voltage drifts away from nominal as hardware degrades
  const voltageDrift = deg * (isDcfc ? 40 : 20) * (Math.random() > 0.5 ? 1 : -1)
  const voltage_v = Math.round((nomV + voltageDrift) * 10) / 10

  // Insulation resistance drops (healthy ≥ 500, critical < 100)
  const insulation_resistance_mohm = Math.max(
    50,
    Math.round(500 - deg * 400 + (Math.random() - 0.5) * 30)
  )

  // Ground fault leakage rises (healthy < 5mA, trip at 30mA)
  const ground_fault_current_ma = Math.round(
    Math.min(30, 1 + deg * 25 + Math.random() * 3) * 10
  ) / 10

  // THD rises (healthy < 5%, degraded > 8%)
  const thd_percent = Math.round(
    Math.min(15, 2 + deg * 10 + Math.random() * 2) * 10
  ) / 10

  // Internal temp rises (healthy ~30°C, degraded ~70°C)
  const internal_temp_celsius = Math.round(
    (28 + deg * 40 + Math.random() * 5) * 10
  ) / 10

  // Power factor degrades (healthy ~0.98, degraded ~0.75)
  const power_factor = Math.round(
    Math.max(0.7, 0.98 - deg * 0.25 + (Math.random() - 0.5) * 0.03) * 1000
  ) / 1000

  return {
    voltage_v,
    insulation_resistance_mohm,
    ground_fault_current_ma,
    thd_percent,
    internal_temp_celsius,
    power_factor,
  }
}

export function tickCharger(charger: Charger, day: number, config: FailureConfig): Charger {
  // Failed chargers don't tick — they await physical support ticket resolution
  if (charger.status === 'failed') return charger

  const installDay = charger.install_day ?? 0
  const ageDays = Math.max(0, day - installDay)
  const stress = chargerToStress(charger)
  const h = entropyFromConfig(stress, config)
  const hw01 = clamp01(charger.hardware_state)
  const lD = lambdaD(h, hw01, ageDays, config)
  const prob = pFail(lD)

  // Partially operational chargers still degrade and can transition to failed
  if (charger.status === 'partially_operational') {
    const degradedHw = Math.max(0, charger.hardware_state - (HARDWARE_DEGRADATION_PER_DAY * PARTIAL_OP_DEGRADATION_MULTIPLIER))

    // If hardware drops below threshold → charger fails completely
    if (degradedHw < PARTIAL_OP_FAILURE_THRESHOLD) {
      return { ...charger, status: 'failed', hardware_state: degradedHw }
    }

    // Random failure still possible (higher base prob for degraded units)
    if (Math.random() < prob * 1.5) {
      return { ...charger, status: 'failed', hardware_state: degradedHw }
    }

    const elecDeg = degradeElectricalProperties({ ...charger, hardware_state: degradedHw })
    return {
      ...charger,
      ...elecDeg,
      hardware_state: degradedHw,
      connector_cycles: Math.min(5000, charger.connector_cycles + 1),
    }
  }

  // Normal operational chargers
  if (Math.random() < prob) {
    return { ...charger, status: 'failed' }
  }

  const newHw = Math.max(0, charger.hardware_state - HARDWARE_DEGRADATION_PER_DAY)
  const elecDeg = degradeElectricalProperties({ ...charger, hardware_state: newHw })

  return {
    ...charger,
    ...elecDeg,
    status: 'operational',
    connector_cycles: Math.min(5000, charger.connector_cycles + 1),
    hardware_state: newHw,
  }
}
