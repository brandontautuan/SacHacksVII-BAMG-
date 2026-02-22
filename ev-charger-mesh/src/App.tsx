/**
 * Root app: loads charger JSON, transforms to stations (3 chargers each),
 * builds mesh graph, holds view/tooltip state, renders map and controls.
 */

import { useCallback, useMemo, useState } from 'react'
import { ErrorBoundary } from '@/ErrorBoundary'
import { MapView } from '@/map/MapView'
import { Tooltip } from '@/ui/Tooltip'
import { Controls } from '@/ui/Controls'
import { buildGraph } from '@/graph/buildGraph'
import { stationFromInput } from '@/data/mockStation'
import type { Station, StationInput } from '@/data/types'

import chargersJson from '@/data/chargers.json'

const rawRows = chargersJson as StationInput[]
/** One JSON row → one station with exactly 3 mock chargers (computed once at load). */
const stations: Station[] = rawRows.map(stationFromInput)

export default function App() {
  const [resetTrigger, setResetTrigger] = useState(0)
  const [meshVisible, setMeshVisible] = useState(true)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)

  const edges = useMemo(() => buildGraph(stations), [])

  const chargerTypes = useMemo(
    () => Array.from(new Set(stations.map((s) => s.charger_type))).sort(),
    []
  )

  const resetView = useCallback(() => setResetTrigger((t) => t + 1), [])

  const handleHover = useCallback((station: Station | null, coords: { x: number; y: number }) => {
    setHoveredStation(station)
    setPointer(coords)
  }, [])

  return (
    <ErrorBoundary>
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
        <MapView
          stations={stations}
          edges={edges}
          meshVisible={meshVisible}
          filterType={filterType}
          resetTrigger={resetTrigger}
          selectedStationId={selectedStationId}
          onHover={handleHover}
        />
        <Controls
          stations={stations}
          selectedStationId={selectedStationId}
          onSelectedStationChange={setSelectedStationId}
          meshVisible={meshVisible}
          onMeshToggle={setMeshVisible}
          filterType={filterType}
          onFilterChange={setFilterType}
          chargerTypes={chargerTypes}
          onResetView={resetView}
          currentDay={0}
          isRunning={false}
          speed={1}
          onPlayPause={() => {}}
          onSpeedChange={() => {}}
          onResetSimulation={() => {}}
        />
        <Tooltip station={hoveredStation} x={pointer.x} y={pointer.y} />
      </div>
    </ErrorBoundary>
  )
}
