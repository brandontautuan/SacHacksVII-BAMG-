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

/** Simulation state for one charger (stress vars 0–1, status, optional last hazard for tooltip). */
export interface ChargerSimState {
  status: 'operational' | 'failed'
  hardware_state: number
  utilization_rate: number
  grid_stress: number
  ambient_temperature: number
  connector_cycles: number
  maintenance_gap: number
  install_day: number
  failed_at_day?: number
  last_p_fail?: number
  last_lambda_d?: number
}

/** Charger plus simulation state: one object per node for map and tooltip. */
export type ChargerNode = Charger & ChargerSimState

/** Edge as source → target coordinate pairs for LineLayer. */
export interface EdgeCoords {
  sourcePosition: [number, number, number]
  targetPosition: [number, number, number]
}
