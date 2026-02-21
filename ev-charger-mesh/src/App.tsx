/**
 * Root app: loads charger data, builds mesh graph, holds view state and UI
 * toggles, simulation state, and renders the map with tooltip and controls.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErrorBoundary } from '@/ErrorBoundary'
import { MapView } from '@/map/MapView'
import { Tooltip } from '@/ui/Tooltip'
import { Controls } from '@/ui/Controls'
import { buildGraph } from '@/graph/buildGraph'
import { initChargerNodes, tickNode, defaultFailureConfig } from '@/sim'
import type { Charger, ChargerNode } from '@/data/types'

import chargersJson from '@/data/chargers.json'

const chargers = chargersJson as Charger[]

export default function App() {
  const [resetTrigger, setResetTrigger] = useState(0)
  const [meshVisible, setMeshVisible] = useState(true)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [hoveredCharger, setHoveredCharger] = useState<ChargerNode | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  const [chargerNodes, setChargerNodes] = useState<ChargerNode[]>(() =>
    initChargerNodes(chargers)
  )
  const [currentDay, setCurrentDay] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const config = defaultFailureConfig

  const edges = useMemo(() => buildGraph(chargers), [])

  const chargerTypes = useMemo(
    () => Array.from(new Set(chargers.map((c) => c.charger_type))).sort(),
    []
  )

  const resetView = useCallback(() => {
    setResetTrigger((t) => t + 1)
  }, [])

  const resetSimulation = useCallback(() => {
    setChargerNodes(initChargerNodes(chargers))
    setCurrentDay(0)
    setIsRunning(false)
  }, [])

  const handleHover = useCallback((charger: ChargerNode | null, coords: { x: number; y: number }) => {
    setHoveredCharger(charger)
    setPointer(coords)
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const intervalMs = 1000 / speed
    const id = setInterval(() => {
      setCurrentDay((d) => {
        const next = d + 1
        setChargerNodes((nodes) =>
          nodes.map((node) => tickNode(node, next, config))
        )
        return next
      })
    }, intervalMs)
    return () => clearInterval(id)
  }, [isRunning, speed, config])

  return (
    <ErrorBoundary>
      <div style={{ width: '100%', height: '100vh', minHeight: '100vh', position: 'relative' }}>
        <MapView
          chargers={chargerNodes}
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
          currentDay={currentDay}
          isRunning={isRunning}
          speed={speed}
          onPlayPause={() => setIsRunning((r) => !r)}
          onSpeedChange={setSpeed}
          onResetSimulation={resetSimulation}
        />
        <Tooltip
          charger={hoveredCharger}
          currentDay={currentDay}
          x={pointer.x}
          y={pointer.y}
        />
      </div>
    </ErrorBoundary>
  )
}
