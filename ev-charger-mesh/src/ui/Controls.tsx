/**
 * UI controls: mesh visibility, filter by type, reset view, and simulation (play/pause, speed, day, reset).
 */

export interface ControlsProps {
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
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: 'rgba(20, 20, 24, 0.92)',
        padding: 14,
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        color: '#e8e8e8',
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
    </div>
  )
}
