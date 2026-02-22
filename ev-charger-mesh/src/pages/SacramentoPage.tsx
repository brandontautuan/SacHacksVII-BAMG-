/**
 * Sacramento mesh map: same mechanics as Davis — load chargers, build graph, simulation, map and controls.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErrorBoundary } from '@/ErrorBoundary'
import { MapView } from '@/map/MapView'
import { Tooltip } from '@/ui/Tooltip'
import { Controls } from '@/ui/Controls'
import { buildGraph } from '@/graph/buildGraph'
import { stationFromInput } from '@/data/mockStation'
import { tickCharger, defaultFailureConfig } from '@/sim'
import { SACRAMENTO_PAN_BOUNDS, SACRAMENTO_VIEW_STATE } from '@/map/constants'
import type { Station, StationInput } from '@/data/types'

import sacramentoChargersJson from '@/data/sacramentoChargers.json'

const rawRows = sacramentoChargersJson as StationInput[]

export function SacramentoPage() {
  const [resetTrigger, setResetTrigger] = useState(0)
  const [meshVisible, setMeshVisible] = useState(true)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterFailedOnly, setFilterFailedOnly] = useState(false)
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)

  const [stations, setStations] = useState<Station[]>(() => rawRows.map(stationFromInput))
  const [currentDay, setCurrentDay] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const config = defaultFailureConfig

  const edges = useMemo(() => buildGraph(stations), [stations])

  const chargerTypes = useMemo(
    () => Array.from(new Set(stations.map((s) => s.charger_type))).sort(),
    [stations]
  )

  const { totalChargers, failedChargers } = useMemo(() => {
    let total = 0
    let failed = 0
    for (const s of stations) {
      for (const c of s.chargers) {
        total += 1
        if (c.status === 'failed') failed += 1
      }
    }
    return { totalChargers: total, failedChargers: failed }
  }, [stations])

  const resetView = useCallback(() => setResetTrigger((t) => t + 1), [])

  const resetSimulation = useCallback(() => {
    setStations(rawRows.map(stationFromInput))
    setCurrentDay(0)
    setIsRunning(false)
  }, [])

  const handleHover = useCallback((station: Station | null, coords: { x: number; y: number }) => {
    setHoveredStation(station)
    setPointer(coords)
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const intervalMs = 1000 / speed
    const id = setInterval(() => {
      setCurrentDay((d) => {
        const next = d + 1
        setStations((prev) =>
          prev.map((s) => ({
            ...s,
            chargers: s.chargers.map((c) => tickCharger(c, next, config)),
          }))
        )
        return next
      })
    }, intervalMs)
    return () => clearInterval(id)
  }, [isRunning, speed, config])

  const sacramentoPanBounds: [[number, number], [number, number]] = [
    [SACRAMENTO_PAN_BOUNDS.minLng, SACRAMENTO_PAN_BOUNDS.minLat],
    [SACRAMENTO_PAN_BOUNDS.maxLng, SACRAMENTO_PAN_BOUNDS.maxLat],
  ]

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
          viewState={SACRAMENTO_VIEW_STATE}
          maxBounds={sacramentoPanBounds}
        />
        <Controls
          stations={stations}
          selectedStationId={selectedStationId}
          onSelectedStationChange={setSelectedStationId}
          meshVisible={meshVisible}
          onMeshToggle={setMeshVisible}
          filterType={filterType}
          onFilterChange={setFilterType}
          filterFailedOnly={filterFailedOnly}
          onFilterFailedChange={setFilterFailedOnly}
          chargerTypes={chargerTypes}
          onResetView={resetView}
          currentDay={currentDay}
          isRunning={isRunning}
          speed={speed}
          onPlayPause={() => setIsRunning((r) => !r)}
          onSpeedChange={setSpeed}
          onResetSimulation={resetSimulation}
        />
        <Tooltip station={hoveredStation} currentDay={currentDay} x={pointer.x} y={pointer.y} />
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 10,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(20, 20, 24, 0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 13,
            color: '#e8e8e8',
          }}
        >
          {failedChargers} / {totalChargers} chargers failed
        </div>
      </div>
    </ErrorBoundary>
  )
}
