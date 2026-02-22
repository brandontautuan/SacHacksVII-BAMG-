/**
 * Tooltip when hovering a station: shows station id and P_fail formula with
 * live λ_d per charger. Dark theme, position: fixed, inline styles only.
 */

import type { Charger, Station } from '@/data/types'
import {
  getChargerLambdaContext,
  STRESS_LABELS,
  defaultFailureConfig,
  type FailureConfig,
} from '@/sim'

export interface TooltipProps {
  station: Station | null
  currentDay: number
  x: number
  y: number
}

export function Tooltip({ station, currentDay, x, y }: TooltipProps) {
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
        padding: '8px 10px',
        borderRadius: 6,
        fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: 200,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>
        {station.id}
      </div>
      <div style={{ opacity: 0.9, marginBottom: 2 }}>
        {station.power_kw} kW · {station.charger_type} · {station.chargers.filter((c) => c.status === 'failed').length}/{station.chargers.length} failed
      </div>
      {station.chargers.map((c) => (
        <ChargerRow
          key={c.machine_id}
          charger={c}
          currentDay={currentDay}
          config={defaultFailureConfig}
        />
      ))}
    </div>
  )
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function fmt(v: number): string {
  if (v === 0) return '0'
  return v < 0.0001 ? v.toExponential(2) : v < 0.01 ? v.toFixed(4) : v.toFixed(3)
}

function ChargerRow({
  charger,
  currentDay,
  config,
}: {
  charger: Charger
  currentDay: number
  config: FailureConfig
}) {
  const hw = clamp01(charger.hardware_state)
  const isHealthy = charger.status !== 'failed' && hw >= 0.6
  const ctx = getChargerLambdaContext(charger, currentDay, config)
  const { lambdaD, pFail, lambdaBase, lambdaEntropy, lambdaAge, entropyH, stress } = ctx
  const isFailed = charger.status === 'failed'
  const lambdaStr = isFailed ? '—' : lambdaD < 0.0001 ? lambdaD.toExponential(2) : lambdaD.toFixed(4)
  const pFailPercent =
    pFail >= 1 ? (isFailed ? '100% (failed)' : '100%') : pFail < 0.0001 ? (pFail * 100).toFixed(3) + '%' : (pFail * 100).toFixed(2) + '%'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '3px 0',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: 4,
          background: isHealthy ? '#22c55e' : '#ef4444',
        }}
      />
      <div style={{ flex: 1, lineHeight: 1.35 }}>
        <div style={{ fontWeight: 500 }}>{charger.machine_id}</div>
        <div style={{ opacity: 0.9, fontFamily: 'ui-monospace, monospace' }}>
          P_fail = 1 − e^(−λ_d)  →  λ_d = {lambdaStr}  →  P_fail = {pFailPercent}
        </div>
        {!isFailed && (
          <>
            <div style={{ opacity: 0.75, fontSize: 11, marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>
              λ_d = λ_base + λ_entropy + λ_age = {fmt(lambdaBase)} + {fmt(lambdaEntropy)} + {fmt(lambdaAge)}
            </div>
            <div style={{ opacity: 0.7, fontSize: 10, marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>
              H = {fmt(entropyH)} · stress: {STRESS_LABELS.map((l, i) => `${l}=${stress[i].toFixed(2)}`).join(' ')}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
