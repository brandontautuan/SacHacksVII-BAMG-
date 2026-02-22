/**
 * UI controls: simulation, mesh, filter, reset view; at bottom, list of Davis
 * locations (filtered by type) with a side pop-out showing 3 chargers per location.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigateWithTransition } from '@/AnimatedRoutes'
import type { Charger, Station } from '@/data/types'

export interface ControlsProps {
  /** All 25 Davis stations; list is filtered by filterType and filterFailedOnly. */
  stations: Station[]
  selectedStationId: string | null
  onSelectedStationChange: (stationId: string | null) => void
  meshVisible: boolean
  onMeshToggle: (v: boolean) => void
  filterType: string | null
  onFilterChange: (t: string | null) => void
  filterFailedOnly: boolean
  onFilterFailedChange: (v: boolean) => void
  chargerTypes: string[]
  onResetView: () => void
  currentDay: number
  isRunning: boolean
  speed: number
  onPlayPause: () => void
  onSpeedChange: (speed: number) => void
  onResetSimulation: () => void
}

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 5, label: '5x' },
]

export function Controls({
  stations,
  selectedStationId,
  onSelectedStationChange,
  meshVisible,
  onMeshToggle,
  filterType,
  onFilterChange,
  filterFailedOnly,
  onFilterFailedChange,
  chargerTypes,
  onResetView,
  currentDay,
  isRunning,
  speed,
  onPlayPause,
  onSpeedChange,
  onResetSimulation,
}: ControlsProps) {
  const navigateWithTransition = useNavigateWithTransition()
  const navigate = useNavigate()
  const goHome = () => (navigateWithTransition ? navigateWithTransition('/') : navigate('/'))
  const filteredStations = useMemo(() => {
    let list = filterType ? stations.filter((s) => s.charger_type === filterType) : stations
    if (filterFailedOnly) {
      list = list.filter((s) => s.chargers.some((c) => c.status === 'failed'))
    }
    return list
  }, [stations, filterType, filterFailedOnly])

  const expandedStation = selectedStationId
    ? stations.find((s) => s.id === selectedStationId)
    : null

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        color: '#e8e8e8',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: 'rgba(20, 20, 24, 0.92)',
          padding: 14,
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          minWidth: 220,
        }}
      >
        <button
          type="button"
          onClick={goHome}
          style={{
            display: 'inline-block',
            marginBottom: 8,
            fontSize: 12,
            color: 'rgba(255,255,255,0.8)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          ← Back to home
        </button>
        <div style={{ fontWeight: 600, opacity: 0.9, marginBottom: 2 }}>Simulation</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={onPlayPause}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: isRunning ? 'rgba(80,120,80,0.9)' : 'rgba(60,60,72,0.95)',
            color: '#e8e8e8',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {isRunning ? 'Pause' : 'Play'}
        </button>
        <span style={{ opacity: 0.9 }}>Day {currentDay}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ opacity: 0.9 }}>Speed</span>
        <select
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(40,40,48,0.95)',
            color: '#e8e8e8',
            cursor: 'pointer',
          }}
        >
          {SPEED_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={onResetSimulation}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(60,60,72,0.95)',
          color: '#e8e8e8',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Reset simulation
      </button>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={meshVisible}
          onChange={(e) => onMeshToggle(e.target.checked)}
        />
        <span>Show mesh</span>
      </label>

      <button
        type="button"
        onClick={onResetView}
        style={{
          padding: '8px 14px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(60,60,72,0.95)',
          color: '#e8e8e8',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Reset view
      </button>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

      <div>
        <div style={{ marginBottom: 6, opacity: 0.9 }}>Filter by type</div>
        <select
          value={filterType ?? ''}
          onChange={(e) => onFilterChange(e.target.value || null)}
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(40,40,48,0.95)',
            color: '#e8e8e8',
            cursor: 'pointer',
          }}
        >
          <option value="">All</option>
          {chargerTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
        <input
          type="checkbox"
          checked={filterFailedOnly}
          onChange={(e) => onFilterFailedChange(e.target.checked)}
        />
        <span style={{ opacity: 0.9 }}>Only stations with failed chargers</span>
      </label>

      <div>
        <div style={{ marginBottom: 8, marginTop: 8, fontWeight: 600, opacity: 0.9 }}>
          Locations
        </div>
        <div
          className="locations-list-scroll"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {filteredStations.map((station) => {
            const failedCount = station.chargers.filter((c) => c.status === 'failed').length
            const total = station.chargers.length
            const failRatio = total > 0 ? failedCount / total : 0
            // 0 failed = green; 1+ failed = light red → dark red by ratio
            const isGreen = failedCount === 0
            const redStrength = Math.min(1, failRatio * 1.2) // 0.2–1.0 so 1 failure is light
            const borderLeft = isGreen
              ? '3px solid #22c55e'
              : `3px solid rgba(239,68,68,${0.5 + redStrength * 0.5})`
            const border = isGreen
              ? '1px solid rgba(34,197,94,0.4)'
              : `1px solid rgba(239,68,68,${0.3 + redStrength * 0.5})`
            const bgBase = isGreen
              ? 'rgba(34,197,94,0.12)'
              : `rgba(239,68,68,${0.1 + redStrength * 0.35})`
            const bgSelected = isGreen
              ? 'rgba(34,197,94,0.2)'
              : `rgba(239,68,68,${0.15 + redStrength * 0.3})`
            return (
              <button
                key={station.id}
                type="button"
                onClick={() =>
                  onSelectedStationChange(
                    selectedStationId === station.id ? null : station.id
                  )
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border,
                  borderLeft,
                  background: selectedStationId === station.id ? bgSelected : bgBase,
                  color: '#e8e8e8',
                  cursor: 'pointer',
                  fontSize: 12,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: 500 }}>{station.id}</span>
                <span style={{ opacity: 0.8 }}>
                  {station.charger_type}
                  {failedCount > 0 && (
                    <span
                      style={{
                        color: isGreen ? undefined : `rgba(239,68,68,${0.8 + redStrength * 0.2})`,
                        marginLeft: 4,
                      }}
                    >
                      ({failedCount} failed)
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      </div>

      {expandedStation && (
        <div
          style={{
            marginLeft: 6,
            padding: 8,
            width: 200,
            background: 'rgba(20, 20, 24, 0.96)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {expandedStation.id}
            <button
              type="button"
              onClick={() => onSelectedStationChange(null)}
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#e8e8e8',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              Close
            </button>
          </div>
          <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 6 }}>
            {expandedStation.power_kw} kW · {expandedStation.charger_type}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {expandedStation.chargers.map((c) => (
              <ChargerStatusBlock key={c.machine_id} charger={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ChargerStatusBlock({ charger }: { charger: Charger }) {
  const isFailed = charger.status === 'failed'
  const isHealthy = !isFailed && charger.hardware_state === 1
  return (
    <div
      style={{
        padding: 6,
        borderRadius: 4,
        background: isFailed ? 'rgba(239,68,68,0.2)' : 'rgba(40,40,48,0.6)',
        border: isFailed ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.08)',
        fontSize: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isFailed ? '#ef4444' : isHealthy ? '#22c55e' : '#f59e0b',
          }}
        />
        <span style={{ fontWeight: 500 }}>{charger.machine_id}</span>
        <span
          style={{
            opacity: 0.9,
            fontSize: 10,
            color: isFailed ? '#ef4444' : undefined,
          }}
        >
          {isFailed ? 'Failed' : isHealthy ? 'OK' : 'Near failure'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.95 }}>
        <div>Utilization: {charger.utilization_rate}% · Grid: {charger.grid_stress}%</div>
        <div>Temp: {charger.ambient_temperature}°C · Cycles: {charger.connector_cycles}</div>
        <div>Maintenance: {charger.maintenance_gap}d</div>
      </div>
    </div>
  )
}
