/**
 * Stress variables (0–1) and entropy H = -sum_i w_i * x_i * log(x_i + epsilon).
 * Expanded to 10 dimensions: 6 original + 4 electrical.
 * Mirrors Python failure_engine/stress.py.
 */

import type { FailureConfig } from './config'
import { STRESS_DIM } from './config'

function clamp(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/**
 * Build the 10-dimensional stress vector from charger fields.
 * All values are normalized to 0–1 where higher = MORE stress.
 */
export function stressVector(
  hardware_state: number,
  utilization_rate: number,
  grid_stress: number,
  ambient_temperature: number,
  connector_cycles: number,
  maintenance_gap: number,
  voltage_deviation: number,
  insulation_health: number,
  ground_fault_risk: number,
  thermal_stress: number
): number[] {
  return [
    clamp(hardware_state),
    clamp(utilization_rate),
    clamp(grid_stress),
    clamp(ambient_temperature),
    clamp(connector_cycles),
    clamp(maintenance_gap),
    clamp(voltage_deviation),
    clamp(insulation_health),
    clamp(ground_fault_risk),
    clamp(thermal_stress),
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
  if (stressValues.length !== STRESS_DIM || weights.length !== STRESS_DIM) {
    throw new Error(`stressValues and weights must have length ${STRESS_DIM}`)
  }
  let h = 0
  for (let i = 0; i < STRESS_DIM; i++) {
    const x = Math.max(0, Math.min(1, stressValues[i]))
    h -= weights[i] * x * Math.log(x + epsilon)
  }
  return Math.max(0, h)
}

export function entropyFromConfig(stressValues: readonly number[], config: FailureConfig): number {
  return entropy(stressValues, config.weights, config.epsilon)
}
