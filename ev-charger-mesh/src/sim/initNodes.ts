/**
 * Initialize ChargerNode[] from Charger[] with install_day=0 and random initial stress (seeded LCG).
 */

import type { Charger, ChargerNode } from '@/data/types'

/** Simple LCG for reproducible initial stress when seed is provided. */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffff_ffff
  }
}

export function initChargerNodes(chargers: Charger[], seed?: number): ChargerNode[] {
  const rng = seed !== undefined ? seededRandom(seed) : () => Math.random()
  return chargers.map((c) => {
    const node: ChargerNode = {
      ...c,
      status: 'operational',
      install_day: 0,
      hardware_state: 0.85 + rng() * 0.15,
      utilization_rate: 0.1 + rng() * 0.4,
      grid_stress: rng() * 0.3,
      ambient_temperature: 0.2 + rng() * 0.3,
      connector_cycles: rng() * 0.2,
      maintenance_gap: rng() * 0.2,
    }
    return node
  })
}
