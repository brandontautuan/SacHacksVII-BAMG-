/**
 * UI controls: simulation, mesh, filter, reset view; at bottom, list of Davis
 * locations (filtered by type) with a side pop-out showing 3 chargers per location.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  /** 'map' | 'graph' – when 'graph', show average P_fail vs days chart. */
  viewMode?: 'map' | 'graph'
  onViewModeChange?: (mode: 'map' | 'graph') => void
}

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
  viewMode = 'map',
  onViewModeChange,
}: ControlsProps) {
  const navigate = useNavigate()
  const goHome = () => navigate('/')
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
        {onViewModeChange && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={() => onViewModeChange('map')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: viewMode === 'map' ? 'rgba(255,255,255,0.15)' : 'rgba(40,40,48,0.6)',
                color: '#e8e8e8',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('graph')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: viewMode === 'graph' ? 'rgba(255,255,255,0.15)' : 'rgba(40,40,48,0.6)',
                color: '#e8e8e8',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Graph
            </button>
          </div>
        )}
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
              const partialCount = station.chargers.filter((c) => c.status === 'partially_operational').length
              const total = station.chargers.length
              const failRatio = total > 0 ? failedCount / total : 0
              // 0 failed = green; partial = yellow; 1+ failed = red
              const hasPartial = partialCount > 0 && failedCount === 0
              const isGreen = failedCount === 0 && partialCount === 0
              const redStrength = Math.min(1, failRatio * 1.2)
              const borderLeft = isGreen
                ? '3px solid #22c55e'
                : hasPartial
                  ? '3px solid #f59e0b'
                  : `3px solid rgba(239,68,68,${0.5 + redStrength * 0.5})`
              const border = isGreen
                ? '1px solid rgba(34,197,94,0.4)'
                : hasPartial
                  ? '1px solid rgba(245,158,11,0.4)'
                  : `1px solid rgba(239,68,68,${0.3 + redStrength * 0.5})`
              const bgBase = isGreen
                ? 'rgba(34,197,94,0.12)'
                : hasPartial
                  ? 'rgba(245,158,11,0.12)'
                  : `rgba(239,68,68,${0.1 + redStrength * 0.35})`
              const bgSelected = isGreen
                ? 'rgba(34,197,94,0.2)'
                : hasPartial
                  ? 'rgba(245,158,11,0.2)'
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
  const isPartial = charger.status === 'partially_operational'
  const isHealthy = !isFailed && !isPartial && charger.hardware_state === 1
  const dotColor = isFailed ? '#ef4444' : isPartial ? '#f59e0b' : isHealthy ? '#22c55e' : '#f59e0b'
  const labelColor = isFailed ? '#ef4444' : isPartial ? '#f59e0b' : undefined
  const labelText = isFailed ? 'Failed' : isPartial ? 'Partial' : isHealthy ? 'OK' : 'Near failure'
  const bgColor = isFailed
    ? 'rgba(239,68,68,0.2)'
    : isPartial
      ? 'rgba(245,158,11,0.15)'
      : 'rgba(40,40,48,0.6)'
  const borderColor = isFailed
    ? '1px solid rgba(239,68,68,0.5)'
    : isPartial
      ? '1px solid rgba(245,158,11,0.4)'
      : '1px solid rgba(255,255,255,0.08)'
  return (
    <div
      style={{
        padding: 6,
        borderRadius: 4,
        background: bgColor,
        border: borderColor,
        fontSize: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
          }}
        />
        <span style={{ fontWeight: 500 }}>{charger.machine_id}</span>
        <span
          style={{
            opacity: 0.9,
            fontSize: 10,
            color: labelColor,
          }}
        >
          {labelText}
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
