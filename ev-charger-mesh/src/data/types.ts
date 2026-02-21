/**
 * Shared types for EV charger data and graph structures.
 */

export interface Charger {
  id: string
  latitude: number
  longitude: number
  power_kw: number
  charger_type: string
}

/** Edge as source → target coordinate pairs for LineLayer. */
export interface EdgeCoords {
  sourcePosition: [number, number, number]
  targetPosition: [number, number, number]
}
