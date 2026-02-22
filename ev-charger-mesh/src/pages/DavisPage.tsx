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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { tickCharger, getChargerPFail, defaultFailureConfig } from '@/sim'
import type { Station, StationInput } from '@/data/types'
import { setStations as syncStations } from '@/server/mockApiPlugin'
import { startAgent, stopAgent } from '@/agent/agentService'
import { bindStations, getDaysSaved, resetDaysSaved, type AgentEvent } from '@/sim/governor'
import { runGridAgent } from '@/agent/gridSummaryAgent'

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

  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([])
  const [gridSummary, setGridSummary] = useState<string>('Initializing Grid Governor...')

  const [stations, setStations] = useState<Station[]>(() => rawRows.map(stationFromInput))
  const [currentDay, setCurrentDay] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [viewMode, setViewMode] = useState<'map' | 'graph'>('map')
  const [pfailHistory, setPfailHistory] = useState<
    Array<{ day: number; avgPfail: number; avgPfailNoAgent: number }>
  >([])
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

  const chargerDaysDowntimeSaved = getDaysSaved()
  const moneySaved = chargerDaysDowntimeSaved * 150  // $150/day per charger
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
    setCumulativeChargerDaysDownNoAgent(0)
    resetDaysSaved()
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
    // Keep the shared governor reference in sync
    bindStations(stations, setStations)
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

  // Refs for setInterval
  const currentDayRef = useRef(currentDay)
  currentDayRef.current = currentDay
  const stationsRef = useRef(stations)
  stationsRef.current = stations

  useEffect(() => {
    if (currentDay <= 50 && currentDay > lastAppendedDayRef.current) {
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
      const countNoAgentFailed = noAgentStationsRef.current.reduce(
        (n, s) => n + s.chargers.filter((c) => c.status === 'failed').length,
        0
      )
      setCumulativeChargerDaysDownNoAgent((prev) => prev + countNoAgentFailed)
      setPfailHistory((h) => {
        const next = [...h, { day: currentDay, avgPfail, avgPfailNoAgent }]
        return next.length <= 51 ? next : next.slice(-51)
      })
    }
  }, [currentDay, stations, config])

  // Adaptive tick: fast-forward when healthy, slow down + LLM agent when a charger fails
  const tickIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const llmInFlightRef = useRef(false)

  useEffect(() => {
    if (!isRunning) return

    const FAST_MS = 200   // speed through uneventful days
    const SLOW_MS = 7000  // slow down when there's action

    const doTick = () => {
      const nextDay = currentDayRef.current + 1

      noAgentStationsRef.current = noAgentStationsRef.current.map((s) => ({
        ...s,
        chargers: s.chargers.map((c) => tickCharger(c, nextDay, config)),
      }))

      const prevStations = stationsRef.current
      const tickedStations = prevStations.map((s) => ({
        ...s,
        chargers: s.chargers.map((c) => tickCharger(c, nextDay, config)),
      }))

      // Check if any charger has issues
      const hasIncident = tickedStations.some(s =>
        s.chargers.some(c => c.status === 'failed' || c.status === 'derated' || c.status === 'partially_operational')
      )

      // Update stations in state (this also triggers bindStations via the useEffect)
      setStations(tickedStations)
      syncStations(tickedStations)
      setCurrentDay(nextDay)

      if (hasIncident && !llmInFlightRef.current) {
        // Slow mode: call the ReAct agent with tools
        llmInFlightRef.current = true
        runGridAgent(nextDay).then(result => {
          setGridSummary(result.summary)
          setAgentEvents((prev) => {
            const next = [...prev, ...result.events]
            return next.length > 50 ? next.slice(-50) : next
          })
          llmInFlightRef.current = false
        })
      }

      // Schedule next tick: fast if healthy, slow if incident
      const nextMs = hasIncident ? SLOW_MS : FAST_MS
      tickIntervalRef.current = setTimeout(doTick, nextMs)
    }

    // Kick off the first tick
    tickIntervalRef.current = setTimeout(doTick, FAST_MS)

    return () => {
      if (tickIntervalRef.current) clearTimeout(tickIntervalRef.current)
    }
  }, [isRunning, config])

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
                Average P_fail vs days (0–50, real-time)
              </div>
              <div style={{ flex: 1, minHeight: 0, position: 'relative', pointerEvents: 'auto' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pfailHistory} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      type="number"
                      dataKey="day"
                      domain={[0, 50]}
                      ticks={[0, 10, 20, 30, 40, 50]}
                      tick={{ fontSize: 11, fill: '#a0a0a0' }}
                      stroke="rgba(255,255,255,0.2)"
                    />
                    <YAxis
                      type="number"
                      dataKey="avgPfailNoAgent"
                      domain={graphYDomain}
                      tick={{ fontSize: 11, fill: '#a0a0a0' }}
                      tickFormatter={(v) =>
                        (typeof v === 'number' ? (v * 100).toFixed(3) + '%' : String(v))
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
                        typeof value === 'number' ? (value * 100).toFixed(4) + '%' : String(value)
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
            top: 16,
            right: 16,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: 400,
            maxHeight: '85vh',
            pointerEvents: 'none',
          }}
        >
          <AgentActivityPanel
            events={agentEvents}
            gridSummary={gridSummary}
          />
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

function AgentActivityPanel({ events, gridSummary }: { events: AgentEvent[], gridSummary: string }) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())
  const processedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const newEvents = events.filter(e => !processedRef.current.has(e.id))
    if (newEvents.length === 0) return

    const newIds = new Set<string>()
    newEvents.forEach(e => {
      processedRef.current.add(e.id)
      newIds.add(e.id)
    })

    setVisibleIds(prev => {
      const next = new Set(prev)
      newIds.forEach(id => next.add(id))
      return next
    })

    const fadeTimer = setTimeout(() => {
      setFadingIds(prev => {
        const next = new Set(prev)
        newIds.forEach(id => next.add(id))
        return next
      })
    }, 8000)

    const removeTimer = setTimeout(() => {
      setVisibleIds(prev => {
        const next = new Set(prev)
        newIds.forEach(id => next.delete(id))
        return next
      })
      setFadingIds(prev => {
        const next = new Set(prev)
        newIds.forEach(id => next.delete(id))
        return next
      })
    }, 10000)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [events])

  const visibleEvents = events.filter(e => visibleIds.has(e.id)).reverse()

  const statusColor = (s: AgentEvent['status']) =>
    s === 'success' ? '#22c55e' : s === 'warning' ? '#eab308' : s === 'error' ? '#ef4444' : '#3b82f6'

  const statusBg = (s: AgentEvent['status']) =>
    s === 'success' ? 'rgba(34,197,94,0.1)' : s === 'warning' ? 'rgba(234,179,8,0.1)' : s === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)'

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeOutRight {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(40px); opacity: 0; }
        }
        .agent-notif-enter {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .agent-notif-exit {
          animation: fadeOutRight 2s ease forwards;
        }
      `}</style>

      {/* Grid Governor LLM Summary — always visible */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 10,
          background: 'rgba(20, 20, 24, 0.95)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 12, color: '#3b82f6', letterSpacing: '0.06em', marginBottom: 4 }}>
          🤖 GRID GOVERNOR AGENT
        </div>
        <div style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.5 }}>
          {gridSummary}
        </div>
      </div>

      {/* Push notifications for agent actions */}
      {visibleEvents.map((e) => (
        <div
          key={e.id}
          className={fadingIds.has(e.id) ? 'agent-notif-exit' : 'agent-notif-enter'}
          style={{
            padding: e.source === 'thinking' ? '8px 12px' : '10px 12px',
            borderRadius: 10,
            background: e.source === 'thinking' ? 'rgba(88, 28, 135, 0.15)' : statusBg(e.status),
            border: `1px solid ${e.source === 'thinking' ? 'rgba(168, 85, 247, 0.3)' : statusColor(e.status) + '33'}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(12px)',
            fontSize: e.source === 'thinking' ? 11 : 12,
            fontStyle: e.source === 'thinking' ? 'italic' : 'normal',
            color: e.source === 'thinking' ? '#c4b5fd' : '#e8e8e8',
            lineHeight: 1.4,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                background: statusColor(e.status),
                boxShadow: `0 0 6px ${statusColor(e.status)}`,
              }} />
              <strong style={{ color: '#fff', fontSize: 13 }}>{e.action}</strong>
            </div>
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 600,
              color: statusColor(e.status),
              background: `${statusColor(e.status)}22`,
            }}>
              {e.source.toUpperCase()}
            </span>
          </div>
          <div style={{ color: '#d1d5db' }}>{e.detail}</div>
        </div>
      ))}
    </>
  )
}
