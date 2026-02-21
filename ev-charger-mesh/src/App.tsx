/**
 * Root app: loads charger data, builds mesh graph, holds view state and UI
 * toggles, and renders the map with tooltip and controls.
 */

import { useCallback, useMemo, useState } from 'react'
import { ErrorBoundary } from '@/ErrorBoundary'
import { MapView } from '@/map/MapView'
import { Tooltip } from '@/ui/Tooltip'
import { Controls } from '@/ui/Controls'
import { buildGraph } from '@/graph/buildGraph'
import type { Charger } from '@/data/types'

import chargersJson from '@/data/chargers.json'

const chargers = chargersJson as Charger[]

export default function App() {
  const [resetTrigger, setResetTrigger] = useState(0)
  const [meshVisible, setMeshVisible] = useState(true)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [hoveredCharger, setHoveredCharger] = useState<Charger | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  const edges = useMemo(() => buildGraph(chargers), [])

  const chargerTypes = useMemo(
    () => Array.from(new Set(chargers.map((c) => c.charger_type))).sort(),
    []
  )

  const resetView = useCallback(() => {
    setResetTrigger((t) => t + 1)
  }, [])

  const handleHover = useCallback((charger: Charger | null, coords: { x: number; y: number }) => {
    setHoveredCharger(charger)
    setPointer(coords)
  }, [])

  return (
    <ErrorBoundary>
      <div style={{ width: '100%', height: '100vh', minHeight: '100vh', position: 'relative' }}>
        <MapView
          chargers={chargers}
          edges={edges}
          meshVisible={meshVisible}
          filterType={filterType}
          resetTrigger={resetTrigger}
          onHover={handleHover}
        />
      <Controls
        meshVisible={meshVisible}
        onMeshToggle={setMeshVisible}
        filterType={filterType}
        onFilterChange={setFilterType}
        chargerTypes={chargerTypes}
        onResetView={resetView}
      />
        <Tooltip
          charger={hoveredCharger}
          x={pointer.x}
          y={pointer.y}
        />
      </div>
    </ErrorBoundary>
  )
}
