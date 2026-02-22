/**
 * Davis mesh map: loads charger JSON, builds graph, simulation, map and controls.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErrorBoundary } from '@/ErrorBoundary'
import { MapView } from '@/map/MapView'
import { Tooltip } from '@/ui/Tooltip'
import { Controls } from '@/ui/Controls'
import { buildGraph } from '@/graph/buildGraph'
import { stationFromInput } from '@/data/mockStation'
import { tickCharger, defaultFailureConfig } from '@/sim'
import { DAVIS_REGION_BOUNDS } from '@/map/constants'
import type { Station, StationInput } from '@/data/types'
import { setStations as syncStations } from '@/server/mockApiPlugin'
import { startAgent, stopAgent } from '@/agent/agentService'

import chargersJson from '@/data/chargers.json'

const rawRows = chargersJson as StationInput[]

export function DavisPage() {
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
    console.log('[DavisPage] Syncing stations, count:', stations.length)
    syncStations(stations)
  }, [stations])

  useEffect(() => {
    console.log('[DavisPage] isRunning changed:', isRunning)
    if (isRunning) {
      console.log('[DavisPage] Starting agent...')
      startAgent(5000, () => currentDay)
    } else {
      console.log('[DavisPage] Stopping agent...')
      stopAgent()
    }
    return () => {
      console.log('[DavisPage] Cleanup - stopping agent')
      stopAgent()
    }
  }, [isRunning])

  useEffect(() => {
    if (!isRunning) return
    const intervalMs = 1000 / speed
    const id = setInterval(() => {
      setCurrentDay((d) => {
        const next = d + 1
        setStations((prev) => {
          const updated = prev.map((s) => ({
            ...s,
            chargers: s.chargers.map((c) => tickCharger(c, next, config)),
          }))
          syncStations(updated)
          return updated
        })
        return next
      })
    }, intervalMs)
    return () => clearInterval(id)
  }, [isRunning, speed, config])

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
          regionBounds={DAVIS_REGION_BOUNDS}
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
        <AgentActivityFeed isRunning={isRunning} />
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

function AgentActivityFeed({ isRunning }: { isRunning: boolean }) {
  const [logs, setLogs] = useState<{ time: string; source: string; message: string }[]>([])

  useEffect(() => {
    const fetchLogs = () => {
      fetch('/api/agent-logs')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setLogs(data)
        })
        .catch(() => {})
    }

    fetchLogs()
    const id = setInterval(fetchLogs, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        width: 320,
        maxHeight: 'calc(100% - 80px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 14,
        borderRadius: 10,
        background: 'rgba(20, 20, 24, 0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
        color: '#e8e8e8',
        overflowY: 'auto'
      }}
    >
      <div style={{ fontWeight: 600, opacity: 0.9, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isRunning ? '#22c55e' : '#6b7280' }} />
        Agent Activity Feed
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 4 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {logs.slice().reverse().map((log, i) => (
          <div key={i} style={{
            background: log.source === 'agent' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            borderLeft: log.source === 'agent' ? '3px solid #3b82f6' : '3px solid #6b7280',
            padding: '6px 8px',
            borderRadius: '0 4px 4px 0'
          }}>
            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>{log.time} · {log.source.toUpperCase()}</div>
            <div style={{ lineHeight: 1.4 }}>{log.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
