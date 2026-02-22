/**
 * Root app: routing with slide transition between home and map pages.
 * Landing at /, Davis mesh at /davis, Sacramento at /sacramento, Folsom mesh at /folsom.
 */

import { Routes, Route } from 'react-router-dom'
import { AnimatedRoutes, type RouteComponentMap } from '@/AnimatedRoutes'
import { Landing } from '@/pages/Landing'
import { DavisPage } from '@/pages/DavisPage'
import { SacramentoPage } from '@/pages/SacramentoPage'
import { FolsomPage } from '@/pages/FolsomPage'

const routeMap: RouteComponentMap = {
  '/': () => <Landing />,
  '/davis': () => <DavisPage />,
  '/sacramento': () => <SacramentoPage />,
  '/folsom': () => <FolsomPage />,
}

export default function App() {
  return (
    <AnimatedRoutes routeMap={routeMap}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/davis" element={<DavisPage />} />
        <Route path="/sacramento" element={<SacramentoPage />} />
        <Route path="/folsom" element={<FolsomPage />} />
      </Routes>
    </AnimatedRoutes>
  )
}
