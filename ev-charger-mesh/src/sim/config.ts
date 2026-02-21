/**
 * Default failure model parameters (mirrors Python failure_engine/config.py).
 * lambda_entropy = alpha * H + beta * (1 - hardware_state)
 * lambda_age = gamma * (age / eta) ** k
 * lambda_d = lambda_entropy + lambda_age
 * P_fail = 1 - exp(-lambda_d)
 */

export const DEFAULT_STRESS_WEIGHTS = [0.25, 0.15, 0.15, 0.15, 0.15, 0.15] as const

export interface FailureConfig {
  alpha: number
  beta: number
  gamma: number
  eta: number
  k: number
  weights: readonly number[]
  epsilon: number
}

export const defaultFailureConfig: FailureConfig = {
  alpha: 0.1,
  beta: 0.2,
  gamma: 0.01,
  eta: 365,
  k: 2,
  weights: DEFAULT_STRESS_WEIGHTS,
  epsilon: 0.01,
}
