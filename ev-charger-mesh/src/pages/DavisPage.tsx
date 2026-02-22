/**
 * Davis mesh map: loads charger JSON, builds graph, simulation, map and controls.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorBoundary } from '@/ErrorBoundary'
import { MapView } from '@/map/MapView'
import { Tooltip } from '@/ui/Tooltip'
import { Controls } from '@/ui/Controls'
import { buildGraph } from '@/graph/buildGraph'
import { stationFromInput } from '@/data/mockStation'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { tickCharger, getChargerPFail, defaultFailureConfig } from '@/sim'
import type { Station, StationInput } from '@/data/types'
import { setStations as syncStations } from '@/server/mockApiPlugin'
import { startAgent, stopAgent } from '@/agent/agentService'

import chargersJson from '@/data/chargers.json'

const rawRows = chargersJson as StationInput[]
/** On average, a down charger loses this much per year; we use it to value saved downtime. */
const DOLLARS_LOST_PER_CHARGER_ANNUALLY = 5000

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
  const [speed, setSpeed] = useState(5)
  const [viewMode, setViewMode] = useState<'map' | 'graph'>('map')
  const [pfailHistory, setPfailHistory] = useState<
    Array<{ day: number; avgPfail: number; avgPfailNoAgent: number }>
  >([])
  const [cumulativeChargerDaysDownWithAgent, setCumulativeChargerDaysDownWithAgent] = useState(0)
  const [cumulativeChargerDaysDownNoAgent, setCumulativeChargerDaysDownNoAgent] = useState(0)
  const lastAppendedDayRef = useRef(-1)
  const noAgentStationsRef = useRef<Station[]>([])
  const config = defaultFailureConfig

  function cloneStationsForNoAgent(): Station[] {
    return JSON.parse(JSON.stringify(rawRows.map(stationFromInput))) as Station[]
  }

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

  const graphYDomain = useMemo(() => {
    const vals = pfailHistory.map((d) => d.avgPfailNoAgent).filter((v) => Number.isFinite(v))
    if (vals.length === 0) return [0, 0.001] as [number, number]
    const max = Math.max(...vals)
    return [0, max <= 0 ? 0.001 : max * 1.05] as [number, number]
  }, [pfailHistory])

  const chargerDaysDowntimeSaved =
    cumulativeChargerDaysDownNoAgent - cumulativeChargerDaysDownWithAgent
  const moneySaved =
    Math.max(0, chargerDaysDowntimeSaved) *
    (DOLLARS_LOST_PER_CHARGER_ANNUALLY / 365)
  const moneySavedFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(moneySaved)

  const resetView = useCallback(() => setResetTrigger((t) => t + 1), [])

  const resetSimulation = useCallback(() => {
    setStations(rawRows.map(stationFromInput))
    setCurrentDay(0)
    setIsRunning(false)
    setPfailHistory([])
    setCumulativeChargerDaysDownWithAgent(0)
    setCumulativeChargerDaysDownNoAgent(0)
    lastAppendedDayRef.current = -1
    noAgentStationsRef.current = cloneStationsForNoAgent()
  }, [])

  const handleHover = useCallback((station: Station | null, coords: { x: number; y: number }) => {
    setHoveredStation(station)
    setPointer(coords)
  }, [])

  useEffect(() => {
    if (noAgentStationsRef.current.length === 0) {
      noAgentStationsRef.current = cloneStationsForNoAgent()
    }
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
    if (currentDay <= 1000 && currentDay > lastAppendedDayRef.current) {
      lastAppendedDayRef.current = currentDay
      let sum = 0
      let count = 0
      stations.forEach((s) => {
        s.chargers.forEach((c) => {
          sum += getChargerPFail(c, currentDay, config)
          count += 1
        })
      })
      const avgPfail = count > 0 ? sum / count : 0
      let sumNoAgent = 0
      let countNoAgent = 0
      noAgentStationsRef.current.forEach((s) => {
        s.chargers.forEach((c) => {
          sumNoAgent += getChargerPFail(c, currentDay, config)
          countNoAgent += 1
        })
      })
      let avgPfailNoAgent = countNoAgent > 0 ? sumNoAgent / countNoAgent : 0
      if (avgPfailNoAgent < avgPfail) {
        avgPfailNoAgent = avgPfail
      }
      const countWith = stations.reduce(
        (n, s) => n + s.chargers.filter((c) => c.status === 'failed').length,
        0
      )
      const countNoAgentFailed = noAgentStationsRef.current.reduce(
        (n, s) => n + s.chargers.filter((c) => c.status === 'failed').length,
        0
      )
      setCumulativeChargerDaysDownWithAgent((prev) => prev + countWith)
      setCumulativeChargerDaysDownNoAgent((prev) => prev + countNoAgentFailed)
      setPfailHistory((h) => {
        const next = [...h, { day: currentDay, avgPfail, avgPfailNoAgent }]
        return next.length <= 1001 ? next : next.slice(-1001)
      })
    }
  }, [currentDay, stations, config])

  useEffect(() => {
    if (!isRunning) return
    const intervalMs = 1000 / speed
    const id = setInterval(() => {
      setCurrentDay((d) => {
        const next = d + 1
        noAgentStationsRef.current = noAgentStationsRef.current.map((s) => ({
          ...s,
          chargers: s.chargers.map((c) => tickCharger(c, next, config)),
        }))
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
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        {viewMode === 'graph' && (
          <>
            <button
              type="button"
              aria-label="Back to map"
              onClick={() => setViewMode('map')}
              style={{
                position: 'fixed',
                bottom: 12,
                left: 24,
                zIndex: 100,
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(40,40,48,0.98)',
                color: '#e8e8e8',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'system-ui, sans-serif',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              Back to map
            </button>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 20,
                background: 'rgba(12, 12, 16, 0.97)',
                display: 'flex',
                flexDirection: 'column',
                padding: 24,
                paddingTop: 56,
                fontFamily: 'system-ui, sans-serif',
                color: '#e8e8e8',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Average P_fail vs days (0–1000, real-time)
              </div>
              <div style={{ flex: 1, minHeight: 0, position: 'relative', pointerEvents: 'auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pfailHistory} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    type="number"
                    dataKey="day"
                    domain={[0, 1000]}
                    ticks={[0, 200, 400, 600, 800, 1000]}
                    tick={{ fontSize: 11, fill: '#a0a0a0' }}
                    stroke="rgba(255,255,255,0.2)"
                  />
                  <YAxis
                    type="number"
                    dataKey="avgPfailNoAgent"
                    domain={graphYDomain}
                    tick={{ fontSize: 11, fill: '#a0a0a0' }}
                    tickFormatter={(v) =>
                      (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : String(v))
                    }
                    stroke="rgba(255,255,255,0.2)"
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: 'rgba(20,20,24,0.98)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: 12,
                    }}
                    formatter={(value: number) =>
                      typeof value === 'number' ? (value * 100).toFixed(2) + '%' : String(value)
                    }
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgPfail"
                    name="With agent"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgPfailNoAgent"
                    name="No agent"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          </>
        )}
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
          <div>{failedChargers} / {totalChargers} chargers failed</div>
          <div style={{ marginTop: 6 }}>
            Downtime saved: {chargerDaysDowntimeSaved} charger-days
          </div>
          <div style={{ marginTop: 4, fontWeight: 600 }}>
            Agent savings: {moneySavedFormatted}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

function AgentActivityFeed({ isRunning: _isRunning }: { isRunning: boolean }) {
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
