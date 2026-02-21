/**
 * Deck.gl layer factories: scatter plot for stations (one point per station),
 * line layer for mesh edges. Picked object is the full Station (with 5 chargers).
 */

import { ScatterplotLayer, LineLayer } from '@deck.gl/layers'
import type { Station, EdgeCoords } from '@/data/types'

const TYPE_COLOR: Record<string, [number, number, number]> = {
  'DC Fast': [255, 100, 80],
  'Level 2': [80, 180, 220],
  'Level 1': [120, 220, 120],
}
const DEFAULT_COLOR: [number, number, number] = [180, 180, 180]

function colorForType(t: string): [number, number, number] {
  return TYPE_COLOR[t] ?? DEFAULT_COLOR
}

const MIN_RADIUS = 6
const MAX_RADIUS = 28
const POWER_MIN = 20
const POWER_MAX = 360

function radiusForPower(power_kw: number): number {
  const t = (power_kw - POWER_MIN) / (POWER_MAX - POWER_MIN)
  const clamped = Math.max(0, Math.min(1, t))
  return MIN_RADIUS + clamped * (MAX_RADIUS - MIN_RADIUS)
}

export function buildScatterLayer(stations: Station[], filterType: string | null) {
  const data = filterType
    ? stations.filter((s) => s.charger_type === filterType)
    : stations

  return new ScatterplotLayer<Station>({
    id: 'charger-nodes',
    data,
    getPosition: (d) => [d.longitude, d.latitude, 0],
    getRadius: (d) => radiusForPower(d.power_kw),
    getFillColor: (d) => colorForType(d.charger_type),
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
