/**
 * Generates a station from a JSON row by adding exactly 5 mock chargers
 * with random simulation fields (hardware_state, utilization_rate, etc.).
 */

import type { Charger, Station, StationInput } from './types'

/** Seeded-ish randomness per station id so the same station gets same mock data. */
function seeded(seed: string, index: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i)
  return Math.abs((h + index) % 1000) / 1000
}

export function generateMockChargers(stationId: string, count: number): Charger[] {
  const out: Charger[] = []
  for (let i = 0; i < count; i++) {
    const r = (j: number) => seeded(stationId, i * 10 + j)
    out.push({
      machine_id: `${stationId}-${i + 1}`,
      hardware_state: r(1) > 0.25 ? 1 : 0,
      utilization_rate: Math.round(r(2) * 100),
      grid_stress: Math.round(r(3) * 100),
      ambient_temperature: Math.round((r(4) * 30 + 15) * 10) / 10,
      connector_cycles: Math.floor(r(5) * 5000),
      maintenance_gap: Math.floor(r(6) * 90),
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
    chargers: generateMockChargers(row.id, 5),
  }
}
