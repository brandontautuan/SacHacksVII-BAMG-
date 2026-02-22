/// <reference types="vite/client" />

declare module 'react-router-dom' {
  import type { ReactNode, ComponentType } from 'react'
  export interface LinkProps {
    to: string
    children?: ReactNode
    style?: React.CSSProperties
    className?: string
  }
  export const Link: ComponentType<LinkProps>
  export const BrowserRouter: ComponentType<{ children?: ReactNode }>
  export const Routes: ComponentType<{ children?: ReactNode }>
  export const Route: ComponentType<{
    path?: string
    element?: ReactNode
  }>
  export function useNavigate(): (to: string) => void
  export function useLocation(): { pathname: string }
}
