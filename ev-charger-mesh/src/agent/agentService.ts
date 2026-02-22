import { defaultFailureConfig, getChargerPFail } from '@/sim'
import { getStations, derateCharger, updateChargerRisk, type Charger } from '@/server/mockApiPlugin'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskAssessment {
  chargerId: string
  riskLevel: RiskLevel
  score: number
  factors: string[]
  daysUntilFailure?: number
}

function calculateRiskScore(charger: Charger, day: number): RiskAssessment {
  const factors: string[] = []
  let score = 0

  if (charger.status === 'failed') {
    return {
      chargerId: charger.machine_id,
      riskLevel: 'critical',
      score: 100,
      factors: ['Charger has failed'],
      daysUntilFailure: 0
    }
  }

  if (charger.internal_temp_celsius > 80) {
    factors.push(`Overheating (${charger.internal_temp_celsius}°C)`)
    score += 40
  }

  if (charger.insulation_resistance_mohm < 50) {
    factors.push(`Low insulation (${charger.insulation_resistance_mohm}MΩ)`)
    score += 35
  }

  if (charger.ground_fault_current_ma > 20) {
    factors.push(`High ground fault (${charger.ground_fault_current_ma}mA)`)
    score += 25
  }

  if (charger.hardware_state < 0.5) {
    factors.push(`Degraded hardware (${(charger.hardware_state * 100).toFixed(0)}%)`)
    score += 20
  }

  if (charger.hardware_state < 0.7) {
    factors.push(`Moderate hardware wear`)
    score += 10
  }

  if (charger.utilization_rate > 80) {
    factors.push(`High utilization (${charger.utilization_rate}%)`)
    score += 10
  }

  if (charger.grid_stress > 70) {
    factors.push(`High grid stress (${charger.grid_stress}%)`)
    score += 10
  }

  let pFail = 0
  try {
    pFail = getChargerPFail(charger, day, defaultFailureConfig)
  } catch {
    pFail = 0
  }

  if (pFail > 0.01) {
    factors.push(`High failure probability (${(pFail * 100).toFixed(2)}%/day)`)
    score += 15
  }

  const daysUntilFailure = pFail > 0 ? Math.round(1 / pFail) : undefined

  let riskLevel: RiskLevel = 'low'
  if (score >= 50 || charger.internal_temp_celsius > 80 || charger.insulation_resistance_mohm < 50) {
    riskLevel = 'critical'
  } else if (score >= 30) {
    riskLevel = 'high'
  } else if (score >= 15) {
    riskLevel = 'medium'
  }

  if (charger.is_derated) {
    riskLevel = 'low'
    factors.push('Power already derated')
  }

  return {
    chargerId: charger.machine_id,
    riskLevel,
    score: Math.min(100, score),
    factors,
    daysUntilFailure
  }
}

export function getChargerTelemetry(chargerId: string): Charger | null {
  const stations = getStations()
  for (const station of stations) {
    for (const charger of station.chargers) {
      if (charger.machine_id === chargerId) {
        return charger
      }
    }
  }
  return null
}

export function calculateRisk(chargerId: string, day: number = 0): RiskAssessment | null {
  const charger = getChargerTelemetry(chargerId)
  if (!charger) return null
  
  const assessment = calculateRiskScore(charger, day)
  updateChargerRisk(chargerId, assessment.riskLevel, assessment.daysUntilFailure)
  return assessment
}

export function analyzeAllChargers(day: number = 0): RiskAssessment[] {
  const stations = getStations()
  const assessments: RiskAssessment[] = []
  
  for (const station of stations) {
    for (const charger of station.chargers) {
      const assessment = calculateRiskScore(charger, day)
      updateChargerRisk(charger.machine_id, assessment.riskLevel, assessment.daysUntilFailure)
      assessments.push(assessment)
    }
  }
  
  return assessments
}

export function getStationSummary(): { total: number; operational: number; failed: number; derated: number; atRisk: number } {
  const stations = getStations()
  let total = 0
  let operational = 0
  let failed = 0
  let derated = 0
  let atRisk = 0

  for (const station of stations) {
    for (const charger of station.chargers) {
      total++
      if (charger.status === 'failed') failed++
      else if (charger.status === 'derated') derated++
      else operational++
      
      if (charger.risk_level === 'high' || charger.risk_level === 'critical') {
        atRisk++
      }
    }
  }

  return { total, operational, failed, derated, atRisk }
}

export function derateChargerById(chargerId: string, level: number = 50): boolean {
  return derateCharger(chargerId, level)
}

async function logToApi(source: string, message: string) {
  try {
    await fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, message })
    })
  } catch (e) {
    console.error('[Agent] Failed to log to API:', e)
  }
}

export async function runAgentCycle(day: number = 0): Promise<void> {
  console.log('[Agent] Running diagnostics cycle, day:', day)
  await logToApi('agent', 'Running diagnostics cycle...')
  
  const stations = getStations()
  console.log('[Agent] Stations loaded:', stations.length)
  
  if (stations.length === 0) {
    await logToApi('agent', 'Waiting for station data...')
    console.log('[Agent] No stations data!')
    return
  }
  
  const summary = getStationSummary()
  console.log('[Agent] Summary:', summary)
  await logToApi('agent', `Status: ${summary.operational} operational, ${summary.failed} failed, ${summary.derated} derated, ${summary.atRisk} at risk`)
  
  const assessments = analyzeAllChargers(day)
  
  const critical = assessments.filter(a => a.riskLevel === 'critical')
  const high = assessments.filter(a => a.riskLevel === 'high')
  
  if (critical.length > 0) {
    await logToApi('agent', `⚠️ ${critical.length} CRITICAL risk chargers detected!`)
    for (const c of critical.slice(0, 3)) {
      await logToApi('agent', `  - ${c.chargerId}: ${c.factors.join(', ')}`)
      if (!c.chargerId.includes('derated') && !getChargerTelemetry(c.chargerId)?.is_derated) {
        await logToApi('agent', `  → Auto-derating ${c.chargerId} to prevent failure`)
        derateChargerById(c.chargerId, 25)
      }
    }
  } else if (high.length > 0) {
    await logToApi('agent', `⚠️ ${high.length} high-risk chargers detected`)
    for (const c of high.slice(0, 2)) {
      await logToApi('agent', `  - ${c.chargerId}: ${c.factors.join(', ')}`)
    }
  } else {
    await logToApi('agent', '✓ All systems nominal')
  }
}

let agentIntervalId: number | null = null

export function startAgent(intervalMs: number = 5000, getDay: () => number): void {
  if (agentIntervalId !== null) {
    return
  }
  
  logToApi('agent', 'Agent system initialized')
  console.log('[Agent] Agent started')
  
  agentIntervalId = window.setInterval(() => {
    const day = getDay()
    runAgentCycle(day)
  }, intervalMs)
}

export function stopAgent(): void {
  if (agentIntervalId !== null) {
    window.clearInterval(agentIntervalId)
    agentIntervalId = null
    logToApi('agent', 'Agent system stopped')
    console.log('[Agent] Agent stopped')
  }
}
