/**
 * Single-node tick: compute H, lambda_d, P_fail; sample; update status and degradation.
 * Mirrors Python failure_engine/node.py tick logic (no repair in this port for simplicity).
 */

import type { ChargerNode } from '@/data/types'
import type { FailureConfig } from './config'
import { stressVector, entropyFromConfig } from './stress'
import { lambdaD, pFail } from './hazard'

function age(node: ChargerNode, day: number): number {
  return Math.max(0, day - node.install_day)
}

/**
 * One day step. Returns a new node object with updated state (or same if failed and no repair).
 * Uses Math.random() for failure trial. Stores last_p_fail and last_lambda_d on the node for tooltip.
 */
export function tickNode(node: ChargerNode, day: number, config: FailureConfig): ChargerNode {
  if (node.status === 'failed') {
    return node
  }

  const stress = stressVector(
    node.hardware_state,
    node.utilization_rate,
    node.grid_stress,
    node.ambient_temperature,
    node.connector_cycles,
    node.maintenance_gap
  )
  const h = entropyFromConfig(stress, config)
  const ageDays = age(node, day)
  const lD = lambdaD(h, node.hardware_state, ageDays, config)
  const prob = pFail(lD)

  const u = Math.random()
  if (u < prob) {
    return {
      ...node,
      status: 'failed',
      failed_at_day: day,
      last_p_fail: prob,
      last_lambda_d: lD,
    }
  }

  return {
    ...node,
    hardware_state: Math.max(0, node.hardware_state - 0.0001),
    connector_cycles: Math.min(1, node.connector_cycles + 0.001),
    last_p_fail: prob,
    last_lambda_d: lD,
  }
}
