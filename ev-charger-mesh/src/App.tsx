/**
 * Root app: routing. Landing at /, Davis at /davis, Sacramento at /sacramento, Folsom at /folsom.
 */

import { Routes, Route } from 'react-router-dom'
import { Landing } from '@/pages/Landing'
import { DavisPage } from '@/pages/DavisPage'
import { SacramentoPage } from '@/pages/SacramentoPage'
import { FolsomPage } from '@/pages/FolsomPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/davis" element={<DavisPage />} />
      <Route path="/sacramento" element={<SacramentoPage />} />
      <Route path="/folsom" element={<FolsomPage />} />
    </Routes>
  )
}
