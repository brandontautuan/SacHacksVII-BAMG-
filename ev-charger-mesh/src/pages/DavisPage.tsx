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
            position: 'fixed',
            top: 20,
            right: 16,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxWidth: 320,
          }}
        >
          <AgentActivityFeed isRunning={isRunning} />
        </div>
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

  const recentLogs = logs.slice(-3).reverse()
  const isCriticalOrFailed = (msg: string) => /CRITICAL|FAILED/i.test(msg)

  return (
    <>
      <div
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.08em',
          color: '#ffffff',
          marginBottom: 6,
        }}
      >
        AGENT LOGS
      </div>
      {recentLogs.map((log, i) => (
        <div
          key={`${log.time}-${i}-${log.message.slice(0, 20)}`}
          className="agent-log-entry"
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(30, 30, 34, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          {isCriticalOrFailed(log.message) && (
            <span
              style={{
                flexShrink: 0,
                color: '#facc15',
                fontSize: 16,
                lineHeight: 1,
              }}
              aria-hidden
            >
              ⚠
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255, 255, 255, 0.55)',
                marginBottom: 4,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {log.time} · AGENT
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: '#ffffff',
                lineHeight: 1.4,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {log.message}
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
