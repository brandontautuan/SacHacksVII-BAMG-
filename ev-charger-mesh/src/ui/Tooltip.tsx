/**
 * Tooltip shown when hovering a charger node. Displays id, power, type, and sim state.
 */

import type { ChargerNode } from '@/data/types'

export interface TooltipProps {
  charger: ChargerNode | null
  currentDay: number
  x: number
  y: number
}

export function Tooltip({ charger, currentDay, x, y }: TooltipProps) {
  if (!charger) return null

  const age = Math.max(0, currentDay - charger.install_day)

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
        padding: '10px 14px',
        borderRadius: 8,
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{charger.id}</div>
      <div>Power: {charger.power_kw} kW</div>
      <div>Type: {charger.charger_type}</div>
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div>Status: {charger.status}</div>
        <div>Day: {currentDay} · Age: {age}d</div>
        <div>Hardware: {(charger.hardware_state * 100).toFixed(1)}%</div>
        {charger.last_p_fail != null && (
          <div>P_fail: {(charger.last_p_fail * 100).toFixed(2)}%</div>
        )}
      </div>
    </div>
  )
}
