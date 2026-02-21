/**
 * Stress variables (0–1) and entropy H = -sum_i w_i * x_i * log(x_i + epsilon).
 * Mirrors Python failure_engine/stress.py.
 */

import type { FailureConfig } from './config'

function clamp(x: number): number {
  return Math.max(0, Math.min(1, x))
}

export function stressVector(
  hardware_state: number,
  utilization_rate: number,
  grid_stress: number,
  ambient_temperature: number,
  connector_cycles: number,
  maintenance_gap: number
): [number, number, number, number, number, number] {
  return [
    clamp(hardware_state),
    clamp(utilization_rate),
    clamp(grid_stress),
    clamp(ambient_temperature),
    clamp(connector_cycles),
    clamp(maintenance_gap),
  ]
}

/**
 * Entropy H = -sum_i w_i * x_i * log(x_i + epsilon). Returns H >= 0.
 */
export function entropy(
  stressValues: readonly number[],
  weights: readonly number[],
  epsilon: number = 0.01
): number {
  if (stressValues.length !== 6 || weights.length !== 6) {
    throw new Error('stressValues and weights must have length 6')
  }
  let h = 0
  for (let i = 0; i < 6; i++) {
    const x = Math.max(0, Math.min(1, stressValues[i]))
    h -= weights[i] * x * Math.log(x + epsilon)
  }
  return Math.max(0, h)
}

export function entropyFromConfig(stressValues: readonly number[], config: FailureConfig): number {
  return entropy(stressValues, config.weights, config.epsilon)
}
