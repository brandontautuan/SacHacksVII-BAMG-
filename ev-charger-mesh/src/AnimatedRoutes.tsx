/**
 * Route transition: home page slides left, map page slides in from right (and reverse).
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

const TRANSITION_MS = 420

export type RouteComponentMap = Record<string, () => ReactNode>

type TransitionContextValue = {
  navigateWithTransition: (to: string) => void
}

const TransitionContext = createContext<TransitionContextValue | null>(null)

export function useNavigateWithTransition() {
  const ctx = useContext(TransitionContext)
  return ctx?.navigateWithTransition ?? null
}

type AnimatedRoutesProps = {
  routeMap: RouteComponentMap
  children: ReactNode
}

export function AnimatedRoutes({ routeMap, children }: AnimatedRoutesProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [transition, setTransition] = useState<{ from: string; to: string } | null>(null)
  const [phase, setPhase] = useState<'initial' | 'animating'>('initial')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigateWithTransition = useCallback(
    (to: string) => {
      const from = location.pathname
      if (from === to) return
      setTransition({ from, to })
      setPhase('initial')
    },
    [location.pathname]
  )

  useEffect(() => {
    if (!transition) return
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('animating'))
    })
    return () => cancelAnimationFrame(raf)
  }, [transition])

  useEffect(() => {
    if (!transition || phase !== 'animating') return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      navigate(transition.to)
      setTransition(null)
      setPhase('initial')
    }, TRANSITION_MS)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [transition, phase, navigate])

  const value: TransitionContextValue = { navigateWithTransition }

  if (!transition) {
    return <TransitionContext.Provider value={value}>{children}</TransitionContext.Provider>
  }

  const isForward = transition.to !== '/'
  const FromComponent = routeMap[transition.from]
  const ToComponent = routeMap[transition.to]
  const fromSlideOut = phase === 'animating' ? (isForward ? '-100%' : '100%') : '0'
  const toSlideIn = phase === 'animating' ? '0' : isForward ? '100%' : '-100%'

  return (
    <TransitionContext.Provider value={value}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            transform: `translateX(${fromSlideOut})`,
            transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
          }}
        >
          {FromComponent?.()}
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            transform: `translateX(${toSlideIn})`,
            transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
          }}
        >
          {ToComponent?.()}
        </div>
      </div>
    </TransitionContext.Provider>
  )
}
