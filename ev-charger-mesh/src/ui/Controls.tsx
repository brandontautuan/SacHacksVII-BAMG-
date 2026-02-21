/**
 * UI controls: mesh visibility toggle, filter by charger type, reset view.
 */

export interface ControlsProps {
  meshVisible: boolean
  onMeshToggle: (v: boolean) => void
  filterType: string | null
  onFilterChange: (t: string | null) => void
  chargerTypes: string[]
  onResetView: () => void
}

export function Controls({
  meshVisible,
  onMeshToggle,
  filterType,
  onFilterChange,
  chargerTypes,
  onResetView,
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
