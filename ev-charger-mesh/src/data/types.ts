/**
 * Shared types for EV charger data and graph structures.
 */

/** One physical outlet/machine at a station. Simulation fields per charger. */
export interface Charger {
  machine_id: string
  /** 1 = new, 0 = end-of-life; degrades marginally each day */
  hardware_state: number
  /** 0–100 */
  utilization_rate: number
  /** 0–100 */
  grid_stress: number
  /** °C */
  ambient_temperature: number
  connector_cycles: number
  /** days until/since maintenance */
  maintenance_gap: number

  // ── Electrical telemetry ────────────────────────────────────
  /** AC supply voltage in volts (nominal 208–240 V for L2, 400–480 V for DCFC) */
  voltage_v: number
  /** Output current in amps (0 when idle, up to max_rate when charging) */
  current_a: number
  /** Power factor 0–1 (unity = 1.0; degraded inverter → drops toward 0.7) */
  power_factor: number
  /** Insulation resistance in megaohms (healthy ≥ 500; critical < 100) */
  insulation_resistance_mohm: number
  /** Ground-fault leakage current in milliamps (healthy < 5; trip at 30) */
  ground_fault_current_ma: number
  /** Total harmonic distortion % (healthy < 5%; degraded > 8%) */
  thd_percent: number
  /** Internal component temperature °C (power electronics / rectifier) */
  internal_temp_celsius: number

  // ── Status & control ───────────────────────────────────────
  /** Set by simulation tick */
  status?: 'operational' | 'failed' | 'derated'
  /** True when agent has sent DERATE_POWER command */
  is_derated?: boolean
  /** Days since installation (for Weibull aging); default 0 */
  install_day?: number
  /** Agent-calculated risk level */
  risk_level?: string
  /** Agent-predicted days until failure */
  days_until_failure?: number
}

/** Extended node used by the per-node failure simulation (node.ts). */
export interface ChargerNode extends Charger {
  status: 'operational' | 'failed' | 'derated'
  install_day: number
  last_p_fail?: number
  last_lambda_d?: number
  failed_at_day?: number
}

/** One map point: a station with location and exactly 3 chargers. */
export interface Station {
  id: string
  latitude: number
  longitude: number
  power_kw: number
  charger_type: string
  chargers: Charger[]
}

/** Raw row from chargers.json (before generating 3 chargers per station). */
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
