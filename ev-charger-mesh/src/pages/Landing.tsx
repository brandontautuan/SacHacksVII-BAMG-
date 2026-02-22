/**
 * Minimal landing page: three city buttons (Davis, Sacramento, Folsom).
 */

import { Link } from 'react-router-dom'

export function Landing() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        background: '#141418',
        color: '#e8e8e8',
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
      }}
    >
      <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>EV Charger Mesh</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link
          to="/davis"
          style={{
            display: 'block',
            padding: '12px 24px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(60,60,72,0.95)',
            color: '#e8e8e8',
            textDecoration: 'none',
            fontWeight: 500,
            textAlign: 'center',
          }}
        >
          Davis
        </Link>
        <Link
          to="/sacramento"
          style={{
            display: 'block',
            padding: '12px 24px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(60,60,72,0.95)',
            color: '#e8e8e8',
            textDecoration: 'none',
            fontWeight: 500,
            textAlign: 'center',
          }}
        >
          Sacramento
        </Link>
        <Link
          to="/folsom"
          style={{
            display: 'block',
            padding: '12px 24px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(60,60,72,0.95)',
            color: '#e8e8e8',
            textDecoration: 'none',
            fontWeight: 500,
            textAlign: 'center',
          }}
        >
          Folsom
        </Link>
      </div>
    </div>
  )
}
