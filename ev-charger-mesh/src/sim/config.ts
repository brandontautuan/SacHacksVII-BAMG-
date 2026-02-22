/**
 * Default failure model parameters (mirrors Python failure_engine/config.py).
 * lambda_entropy = alpha * H + beta * (1 - hardware_state)
 * lambda_age = gamma * (age / eta) ** k
 * lambda_d = lambda_base + lambda_entropy + lambda_age [capped by lambda_d_max]
 * P_fail = 1 - exp(-lambda_d)
 *
 * Stress vector has 10 dimensions:
 *   [hardware_state, utilization_rate, grid_stress, ambient_temperature,
 *    connector_cycles, maintenance_gap,
 *    voltage_deviation, insulation_health, ground_fault_risk, thermal_stress]
 */

/** 10 weights — 6 original + 4 electrical */
export const DEFAULT_STRESS_WEIGHTS = [
  0.15,  // hardware_state
  0.10,  // utilization_rate
  0.08,  // grid_stress
  0.08,  // ambient_temperature
  0.08,  // connector_cycles
  0.08,  // maintenance_gap
  0.10,  // voltage_deviation (over/under-voltage)
  0.13,  // insulation_health (critical safety indicator)
  0.10,  // ground_fault_risk (leakage current)
  0.10,  // thermal_stress (internal component temp)
] as const

export const STRESS_DIM = 10

export interface FailureConfig {
  lambda_base: number
  alpha: number
  beta: number
  gamma: number
  eta: number
  k: number
  weights: readonly number[]
  epsilon: number
  lambda_d_max?: number
}

export const defaultFailureConfig: FailureConfig = {
  lambda_base: 0.0001,
  alpha: 0.0015,
  beta: 0.0008,
  gamma: 0.002,
  eta: 2000,
  k: 2,
  weights: DEFAULT_STRESS_WEIGHTS,
  epsilon: 0.01,
  lambda_d_max: 0.02,
}
