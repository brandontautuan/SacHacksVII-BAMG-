/**
 * EV Incident Response landing: active minimalism, dark node network,
 * glassmorphic city selectors, cyan/yellow accents.
 */

import { useNavigate } from 'react-router-dom'

const TITLE = 'EV Incident Response'
const SUBTITLE = 'Select a city to view the dashboard'
const CITIES = [
  { to: '/davis', label: 'Davis' },
  { to: '/sacramento', label: 'Sacramento' },
  { to: '/folsom', label: 'Folsom' },
] as const

const NODES = [
  { x: 12, y: 18 },
  { x: 28, y: 12 },
  { x: 45, y: 22 },
  { x: 62, y: 15 },
  { x: 78, y: 28 },
  { x: 88, y: 45 },
  { x: 72, y: 58 },
  { x: 55, y: 72 },
  { x: 35, y: 65 },
  { x: 18, y: 52 },
  { x: 22, y: 38 },
  { x: 52, y: 48 },
  { x: 38, y: 42 },
]

const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0],
  [1, 10], [10, 11], [11, 2], [8, 11], [10, 12], [12, 3],
]

export function Landing() {
  const navigate = useNavigate()
  const goTo = (to: string) => navigate(to)

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #0b0e14 0%, #0f1624 40%, #0a0d12 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Scoped keyframes for landing only */}
      <style>{`
        @keyframes landing-node-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes landing-trail {
          0% { stroke-dashoffset: 600; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes landing-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.25), 0 0 40px rgba(34, 211, 238, 0.1); }
          50% { box-shadow: 0 0 28px rgba(34, 211, 238, 0.4), 0 0 56px rgba(34, 211, 238, 0.15); }
        }
        .landing-node {
          animation: landing-node-pulse 3s ease-in-out infinite;
        }
        .landing-node:nth-child(odd) { animation-delay: 0.5s; }
        .landing-trail {
          stroke-dasharray: 600;
          animation: landing-trail 2.5s linear infinite;
        }
        .landing-trail-2 { animation-delay: 0.8s; }
        .landing-trail-3 { animation-delay: 1.6s; }
      `}</style>

      {/* Glowing node network background */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
            <stop offset="40%" stopColor="rgba(34, 211, 238, 0.9)" />
            <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
          </linearGradient>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Edges with moving light trail */}
        <g fill="none" stroke="url(#trailGrad)" strokeWidth="0.5" opacity="0.85">
          {EDGES.slice(0, 6).map((e, i) => {
            const a = NODES[e[0]], b = NODES[e[1]]
            return (
              <line
                key={i}
                x1={`${a.x}%`}
                y1={`${a.y}%`}
                x2={`${b.x}%`}
                y2={`${b.y}%`}
                className={i % 3 === 0 ? 'landing-trail' : i % 3 === 1 ? 'landing-trail landing-trail-2' : 'landing-trail landing-trail-3'}
              />
            )
          })}
        </g>
        {/* Static faint connections */}
        <g fill="none" stroke="rgba(34, 211, 238, 0.12)" strokeWidth="0.3">
          {EDGES.slice(6).map((e, i) => {
            const a = NODES[e[0]], b = NODES[e[1]]
            return (
              <line key={i} x1={`${a.x}%`} y1={`${a.y}%`} x2={`${b.x}%`} y2={`${b.y}%`} />
            )
          })}
        </g>
        {/* Glowing nodes */}
        <g fill="#22d3ee" filter="url(#nodeGlow)" opacity="0.9">
          {NODES.map((n, i) => (
            <circle
              key={i}
              cx={`${n.x}%`}
              cy={`${n.y}%`}
              r="4"
              className="landing-node"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </g>
      </svg>

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(2.2rem, 6vw, 3.8rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            textShadow: '0 0 40px rgba(34, 211, 238, 0.3), 0 0 80px rgba(34, 211, 238, 0.15)',
            textAlign: 'center',
          }}
        >
          {TITLE}
        </h1>
        <p
          style={{
            margin: '16px 0 40px',
            fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)',
            color: 'rgba(255, 255, 255, 0.6)',
            letterSpacing: '0.02em',
          }}
        >
          {SUBTITLE}
        </p>

        {/* Glassmorphic city selectors with outer glow */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {CITIES.map((city) => (
            <button
              key={city.to}
              type="button"
              onClick={() => goTo(city.to)}
              className="landing-city-btn"
              style={{
                padding: '18px 40px',
                borderRadius: 14,
                border: '1px solid rgba(34, 211, 238, 0.35)',
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#f0f9ff',
                fontWeight: 600,
                fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(34, 211, 238, 0.2), 0 0 40px rgba(34, 211, 238, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
                transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.7)'
                e.currentTarget.style.boxShadow = '0 0 28px rgba(34, 211, 238, 0.35), 0 0 56px rgba(34, 211, 238, 0.12), inset 0 1px 0 rgba(255,255,255,0.08)'
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.35)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(34, 211, 238, 0.2), 0 0 40px rgba(34, 211, 238, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)'
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)'
                e.currentTarget.style.color = '#f0f9ff'
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
