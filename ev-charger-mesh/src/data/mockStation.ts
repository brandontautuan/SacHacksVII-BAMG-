/**
 * Generates a station from a JSON row by adding exactly 3 mock chargers
 * with random simulation fields (hardware, electrical telemetry, etc.).
 */

import type { Charger, Station, StationInput } from './types'

/** Seeded-ish randomness per station id so the same station gets same mock data. */
function seeded(seed: string, index: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i)
  return Math.abs((h + index) % 1000) / 1000
}

/** Returns nominal voltage based on charger type string. */
function nominalVoltage(chargerType: string): number {
  const t = chargerType.toLowerCase()
  if (t.includes('dc') || t.includes('fast')) return 400 + Math.random() * 80 // 400–480
  if (t.includes('level 1') || t.includes('l1')) return 120
  return 208 + Math.random() * 32 // 208–240 for Level 2
}

export function generateMockChargers(stationId: string, count: number, chargerType: string = 'Level 2'): Charger[] {
  const out: Charger[] = []
  for (let i = 0; i < count; i++) {
    const r = (j: number) => seeded(stationId, i * 20 + j)
    const isDCFast = chargerType.toLowerCase().includes('dc') || chargerType.toLowerCase().includes('fast')
    const baseVoltage = isDCFast ? 400 + r(10) * 80 : 208 + r(10) * 32

    out.push({
      machine_id: `${stationId}-${i + 1}`,
      // ── Hardware state ──
      hardware_state: 0.85 + r(1) * 0.15,
      utilization_rate: Math.round(r(2) * 100),
      grid_stress: Math.round(r(3) * 100),
      ambient_temperature: Math.round((r(4) * 30 + 15) * 10) / 10,
      connector_cycles: Math.floor(r(5) * 5000),
      maintenance_gap: Math.floor(r(6) * 90),
      // ── Electrical telemetry ──
      voltage_v: Math.round(baseVoltage * 10) / 10,
      current_a: Math.round(r(7) * (isDCFast ? 350 : 32) * 10) / 10,
      power_factor: Math.round((0.90 + r(8) * 0.10) * 1000) / 1000,
      insulation_resistance_mohm: Math.round(450 + r(9) * 100),
      ground_fault_current_ma: Math.round(r(11) * 5 * 10) / 10,
      thd_percent: Math.round((2 + r(12) * 3) * 10) / 10,
      internal_temp_celsius: Math.round((25 + r(13) * 20) * 10) / 10,
      // ── Status ──
      status: 'operational',
      is_derated: false,
      install_day: 0,
    })
  }
  return out
}

export function stationFromInput(row: StationInput): Station {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    power_kw: row.power_kw,
    charger_type: row.charger_type,
    chargers: generateMockChargers(row.id, 3, row.charger_type),
  }
}
