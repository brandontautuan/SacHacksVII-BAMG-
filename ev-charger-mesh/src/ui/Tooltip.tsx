/**
 * Tooltip when hovering a station: shows station id and a breakdown of all 3
 * chargers (status icon, machine_id, utilization %, grid_stress, maintenance).
 * Dark theme, position: fixed, inline styles only.
 */

import type { Charger, Station } from '@/data/types'

export interface TooltipProps {
  station: Station | null
  x: number
  y: number
}

export function Tooltip({ station, x, y }: TooltipProps) {
  if (!station) return null

  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: x + 12,
        top: y + 12,
        zIndex: 1000,
        pointerEvents: 'none',
        background: 'rgba(20, 20, 24, 0.95)',
        color: '#e8e8e8',
        padding: '12px 14px',
        borderRadius: 8,
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: 260,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        {station.id}
      </div>
      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 8 }}>
        {station.power_kw} kW · {station.charger_type}
      </div>
      {station.chargers.map((c) => (
        <ChargerRow key={c.machine_id} charger={c} />
      ))}
    </div>
  )
}

function ChargerRow({ charger }: { charger: Charger }) {
  const isHealthy = charger.hardware_state === 1
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '6px 0',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: 5,
          background: isHealthy ? '#22c55e' : '#ef4444',
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{charger.machine_id}</div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          Utilization: {charger.utilization_rate}% · Grid: {charger.grid_stress}%
        </div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Maintenance: {charger.maintenance_gap}d gap · Cycles: {charger.connector_cycles}
        </div>
      </div>
    </div>
  )
}
