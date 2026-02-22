/**
 * UI controls: simulation, mesh, filter, reset view; at bottom, list of Davis
 * locations (filtered by type) with a side pop-out showing 3 chargers per location.
 */

import { useMemo } from 'react'
import type { Charger, Station } from '@/data/types'

export interface ControlsProps {
  /** All 25 Davis stations; list is filtered by filterType. */
  stations: Station[]
  /** Currently selected location (pop-out open); when set, map shows only this station. */
  selectedStationId: string | null
  onSelectedStationChange: (stationId: string | null) => void
  meshVisible: boolean
  onMeshToggle: (v: boolean) => void
  filterType: string | null
  onFilterChange: (t: string | null) => void
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
  chargerTypes,
  onResetView,
  currentDay,
  isRunning,
  speed,
  onPlayPause,
  onSpeedChange,
  onResetSimulation,
}: ControlsProps) {
  const filteredStations = useMemo(
    () =>
      filterType
        ? stations.filter((s) => s.charger_type === filterType)
        : stations,
    [stations, filterType]
  )

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

      <div>
        <div style={{ marginBottom: 8, fontWeight: 600, opacity: 0.9 }}>
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
          {filteredStations.map((station) => (
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
                border: '1px solid rgba(255,255,255,0.1)',
                background:
                  selectedStationId === station.id
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(40,40,48,0.6)',
                color: '#e8e8e8',
                cursor: 'pointer',
                fontSize: 12,
                textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: 500 }}>{station.id}</span>
              <span style={{ opacity: 0.8 }}>{station.charger_type}</span>
            </button>
          ))}
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
  const isHealthy = charger.hardware_state === 1
  return (
    <div
      style={{
        padding: 6,
        borderRadius: 4,
        background: 'rgba(40,40,48,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isHealthy ? '#22c55e' : '#ef4444',
          }}
        />
        <span style={{ fontWeight: 500 }}>{charger.machine_id}</span>
        <span style={{ opacity: 0.8, fontSize: 10 }}>{isHealthy ? 'OK' : 'Near failure'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.95 }}>
        <div>Utilization: {charger.utilization_rate}% · Grid: {charger.grid_stress}%</div>
        <div>Temp: {charger.ambient_temperature}°C · Cycles: {charger.connector_cycles}</div>
        <div>Maintenance: {charger.maintenance_gap}d</div>
      </div>
    </div>
  )
}
