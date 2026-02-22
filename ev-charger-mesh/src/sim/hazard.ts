/**
 * Daily hazard and P_fail: lambda_entropy, lambda_age, lambda_d, P_fail (clamped [0,1]).
 * Mirrors Python failure_engine/hazard.py.
 */

import type { FailureConfig } from './config'

export function lambdaEntropy(
  entropyH: number,
  hardwareState: number,
  config: FailureConfig
): number {
  const hw = Math.max(0, Math.min(1, hardwareState))
  return config.alpha * entropyH + config.beta * (1 - hw)
}

export function lambdaAge(ageDays: number, config: FailureConfig): number {
  const age = Math.max(0, ageDays)
  if (config.eta <= 0) throw new Error('eta must be > 0')
  return config.gamma * Math.pow(age / config.eta, config.k)
}

export function lambdaD(
  entropyH: number,
  hardwareState: number,
  ageDays: number,
  config: FailureConfig
): number {
  const base = config.lambda_base ?? 0
  const raw =
    base +
    lambdaEntropy(entropyH, hardwareState, config) +
    lambdaAge(ageDays, config)
  if (config.lambda_d_max != null) return Math.min(raw, config.lambda_d_max)
  return raw
}

/**
 * P_fail = 1 - exp(-lambda_d), clamped to [0, 1].
 */
export function pFail(lambdaD: number): number {
  if (lambdaD <= 0) return 0
  const p = 1 - Math.exp(-lambdaD)
  return Math.max(0, Math.min(1, p))
}
