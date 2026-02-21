/**
 * Deck.gl layer factories: scatter plot for charger nodes (size by power_kw,
 * color by charger_type) and line layer for mesh edges.
 */

import { ScatterplotLayer, LineLayer } from '@deck.gl/layers'
import type { ChargerNode, EdgeCoords } from '@/data/types'

/** Color by charger_type for consistent encoding. */
const TYPE_COLOR: Record<string, [number, number, number]> = {
  'DC Fast': [255, 100, 80],
  'Level 2': [80, 180, 220],
  'Level 1': [120, 220, 120],
}

const DEFAULT_COLOR: [number, number, number] = [180, 180, 180]
/** Failed charger: dark red. */
const FAILED_COLOR: [number, number, number] = [180, 50, 50]

function colorForType(t: string): [number, number, number] {
  return TYPE_COLOR[t] ?? DEFAULT_COLOR
}

/** Min/max node size in pixels; scale by power_kw (e.g. 22–350 kW). */
const MIN_RADIUS = 6
const MAX_RADIUS = 28
const POWER_MIN = 20
const POWER_MAX = 360

function radiusForPower(power_kw: number): number {
  const t = (power_kw - POWER_MIN) / (POWER_MAX - POWER_MIN)
  const clamped = Math.max(0, Math.min(1, t))
  return MIN_RADIUS + clamped * (MAX_RADIUS - MIN_RADIUS)
}

export function buildScatterLayer(chargers: ChargerNode[], filterType: string | null) {
  const data = filterType
    ? chargers.filter((c) => c.charger_type === filterType)
    : chargers

  return new ScatterplotLayer<ChargerNode>({
    id: 'charger-nodes',
    data,
    getPosition: (d) => [d.longitude, d.latitude, 0],
    getRadius: (d) => radiusForPower(d.power_kw),
    getFillColor: (d) => (d.status === 'failed' ? FAILED_COLOR : colorForType(d.charger_type)),
    radiusMinPixels: 4,
    radiusMaxPixels: 40,
    pickable: true,
  })
}

export function buildLineLayer(edges: EdgeCoords[], visible: boolean): LineLayer<EdgeCoords> | null {
  if (!visible || edges.length === 0) return null

  return new LineLayer<EdgeCoords>({
    id: 'mesh-edges',
    data: edges,
    getSourcePosition: (d) => d.sourcePosition,
    getTargetPosition: (d) => d.targetPosition,
    getColor: [180, 180, 200, 100],
    getWidth: 1.5,
    widthMinPixels: 1,
  })
}
