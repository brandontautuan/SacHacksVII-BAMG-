/**
 * Tick one Charger (Station model): normalize fields to 0–1, run hazard, sample failure.
 * Updates status and optional degradation. Used by the simulation loop in App.
 */

import type { Charger } from '@/data/types'
import type { FailureConfig } from './config'
import { entropyFromConfig } from './stress'
import { lambdaD, pFail } from './hazard'

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Normalize Charger fields to 0–1 for stress/hazard (same order as stressVector). */
function chargerToStress(c: Charger): [number, number, number, number, number, number] {
  const hw = clamp01(c.hardware_state)
  const util = clamp01(c.utilization_rate / 100)
  const grid = clamp01(c.grid_stress / 100)
  const temp = clamp01((c.ambient_temperature - 15) / 30)
  const cycles = clamp01(c.connector_cycles / 5000)
  const gap = clamp01(c.maintenance_gap / 90)
  return [hw, util, grid, temp, cycles, gap]
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
const HARDWARE_DEGRADATION_PER_DAY = 0.0002

export function tickCharger(charger: Charger, day: number, config: FailureConfig): Charger {
  if (charger.status === 'failed') return charger

  const installDay = charger.install_day ?? 0
  const ageDays = Math.max(0, day - installDay)
  const stress = chargerToStress(charger)
  const h = entropyFromConfig(stress, config)
  const hw01 = clamp01(charger.hardware_state)
  const lD = lambdaD(h, hw01, ageDays, config)
  const prob = pFail(lD)

  if (Math.random() < prob) {
    return { ...charger, status: 'failed' }
  }

  return {
    ...charger,
    status: 'operational',
    connector_cycles: Math.min(5000, charger.connector_cycles + 1),
    hardware_state: Math.max(0, charger.hardware_state - HARDWARE_DEGRADATION_PER_DAY),
  }
}
