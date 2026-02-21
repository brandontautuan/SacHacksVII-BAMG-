/**
 * Tooltip shown when hovering a charger node. Displays id, power_kw, charger_type.
 */

import type { Charger } from '@/data/types'

export interface TooltipProps {
  charger: Charger | null
  x: number
  y: number
}

export function Tooltip({ charger, x, y }: TooltipProps) {
  if (!charger) return null

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
    </div>
  )
}
