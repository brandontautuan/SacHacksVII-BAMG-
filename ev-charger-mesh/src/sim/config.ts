/**
 * Default failure model parameters (mirrors Python failure_engine/config.py).
 * lambda_entropy = alpha * H + beta * (1 - hardware_state)
 * lambda_age = gamma * (age / eta) ** k
 * lambda_d = lambda_base + lambda_entropy + lambda_age [capped by lambda_d_max]
 * P_fail = 1 - exp(-lambda_d)
 */

export const DEFAULT_STRESS_WEIGHTS = [0.25, 0.15, 0.15, 0.15, 0.15, 0.15] as const

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
  lambda_base: 0.0005,
  alpha: 0.004,
  beta: 0.002,
  gamma: 0.008,
  eta: 1095,
  k: 2,
  weights: DEFAULT_STRESS_WEIGHTS,
  epsilon: 0.01,
  lambda_d_max: 0.05,
}
