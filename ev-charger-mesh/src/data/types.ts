/**
 * Shared types for EV charger data and graph structures.
 */

/** One physical outlet/machine at a station. Simulation fields per charger. */
export interface Charger {
  machine_id: string
  /** 1 = new, 0 = near failure */
  hardware_state: 0 | 1
  /** 0–100 */
  utilization_rate: number
  /** 0–100 */
  grid_stress: number
  /** °C */
  ambient_temperature: number
  connector_cycles: number
  /** days until/since maintenance */
  maintenance_gap: number
}

/** One map point: a station with location and exactly 5 chargers. */
export interface Station {
  id: string
  latitude: number
  longitude: number
  power_kw: number
  charger_type: string
  chargers: Charger[]
}

/** Raw row from chargers.json (before generating 5 chargers per station). */
export interface StationInput {
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
