/**
 * Build a mesh from charger nodes: each node is connected to its K nearest
 * neighbors. Edges are undirected and deduplicated (each edge stored once
 * as source→target with canonical order so we don't store A→B and B→A).
 */

import type { Charger, EdgeCoords } from '@/data/types'
import { haversineKm } from './haversine'

const K_NEIGHBORS = 3

/** Compare two [lon, lat] for canonical edge key (smaller first). */
function edgeKey(i: number, j: number): string {
  return i < j ? `${i}-${j}` : `${j}-${i}`
}

/**
 * For each charger, find indices of the K nearest other chargers (by Haversine),
 * then build a unique set of edges. Returns edges as source/target coordinate
 * pairs for Deck.gl LineLayer (each position [lon, lat, 0] for compatibility).
 */
export function buildGraph(chargers: Charger[]): EdgeCoords[] {
  const n = chargers.length
  if (n === 0) return []

  const seen = new Set<string>()
  const edges: EdgeCoords[] = []

  for (let i = 0; i < n; i++) {
    const a = chargers[i]
    const distances: { j: number; km: number }[] = []

    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const b = chargers[j]
      const km = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude)
      distances.push({ j, km })
    }

    // Sort by distance and take first K
    distances.sort((x, y) => x.km - y.km)
    const nearest = distances.slice(0, K_NEIGHBORS)

    for (const { j } of nearest) {
      const key = edgeKey(i, j)
      if (seen.has(key)) continue
      seen.add(key)

      const b = chargers[j]
      edges.push({
        sourcePosition: [a.longitude, a.latitude, 0],
        targetPosition: [b.longitude, b.latitude, 0],
      })
    }
  }

  return edges
}
