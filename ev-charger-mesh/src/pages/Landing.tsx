/**
 * Home page: EV Incident Response title, subtitle, and city buttons.
 * Selecting a city triggers slide transition (home leaves left, map slides in from right).
 */

import { useNavigate } from 'react-router-dom'
import { useNavigateWithTransition } from '@/AnimatedRoutes'

const TITLE = 'EV Incident Response'
const SUBTITLE = 'Select a city to view the dashboard'
const CITIES = [
  { to: '/davis', label: 'Davis' },
  { to: '/sacramento', label: 'Sacramento' },
  { to: '/folsom', label: 'Folsom' },
] as const

export function Landing() {
  const navigateWithTransition = useNavigateWithTransition()
  const navigate = useNavigate()
  const goTo = (to: string) =>
    navigateWithTransition ? navigateWithTransition(to) : navigate(to)

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        gap: 0,
        background: '#0a101b',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        padding: '48px 56px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      {/* Title only at top, centered */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            textAlign: 'center',
          }}
        >
          {TITLE}
        </h1>
      </div>

      {/* Spacer: positions button block slightly higher on page */}
      <div
        style={{
          flex: 0.45,
          minHeight: 40,
        }}
      />

      {/* Subtitle + buttons: text right above buttons, centered */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          width: '100%',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 'clamp(1.15rem, 3vw, 1.6rem)',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
          }}
        >
          {SUBTITLE}
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 32,
          }}
        >
        {CITIES.map((city) => (
          <button
            key={city.to}
            type="button"
            onClick={() => goTo(city.to)}
            style={{
              padding: '20px 44px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(40, 48, 64, 0.95)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              cursor: 'pointer',
            }}
          >
            {city.label}
          </button>
        ))}
        </div>
      </div>
    </div>
  )
}
