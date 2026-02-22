/**
 * 3-year Monte Carlo diagnostics for the failure model: H distribution,
 * lambda components, mean P_fail, MTBF, annual failure rate, uptime.
 * Run via: npm run validate-failure-model
 */

import type { FailureConfig } from './config'
import { defaultFailureConfig } from './config'
import { entropyFromConfig } from './stress'
import { lambdaEntropy, lambdaAge, lambdaD, pFail } from './hazard'

const N_CHARGERS = 100
const T_DAYS = 3 * 365 // 1095

/** Minimal charger state for diagnostics (no station/lat/lon). */
interface DiagCharger {
  machine_id: string
  hardware_state: number
  utilization_rate: number
  grid_stress: number
  ambient_temperature: number
  connector_cycles: number
  maintenance_gap: number
  status: 'operational' | 'failed'
  install_day: number
}

function seededRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffff_ffff
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function chargerToStress(c: DiagCharger): [number, number, number, number, number, number] {
  const hw = clamp01(c.hardware_state)
  const util = clamp01(c.utilization_rate / 100)
  const grid = clamp01(c.grid_stress / 100)
  const temp = clamp01((c.ambient_temperature - 15) / 30)
  const cycles = clamp01(c.connector_cycles / 5000)
  const gap = clamp01(c.maintenance_gap / 90)
  return [hw, util, grid, temp, cycles, gap]
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const i = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (i - lo) * (sorted[hi] - sorted[lo])
}

export interface DiagnosticsResult {
  H_dist: { min: number; max: number; mean: number; p10: number; p50: number; p90: number }
  lambda_base_mean: number
  lambda_entropy_mean: number
  lambda_age_mean: number
  lambda_d_mean: number
  mean_P_fail: number
  total_failures: number
  failures_per_charger_per_year: number
  uptime_mean: number
  uptime_p10: number
  uptime_p90: number
  operational_days_per_charger: number[]
  MTBF_days: number
  annual_failure_rate: number
}

export function runMonteCarloDiagnostics(
  config: FailureConfig = defaultFailureConfig,
  seed: number = 42
): DiagnosticsResult {
  const rng = seededRng(seed)
  const lambdaBase = config.lambda_base ?? 0

  const chargers: DiagCharger[] = []
  for (let i = 0; i < N_CHARGERS; i++) {
    chargers.push({
      machine_id: `mc-${i + 1}`,
      hardware_state: 0.85 + rng() * 0.15,
      utilization_rate: 10 + rng() * 70,
      grid_stress: rng() * 40,
      ambient_temperature: 15 + rng() * 25,
      connector_cycles: Math.floor(rng() * 2500),
      maintenance_gap: Math.floor(rng() * 60),
      status: 'operational',
      install_day: 0,
    })
  }

  const H_samples: number[] = []
  const lEnt_samples: number[] = []
  const lAge_samples: number[] = []
  const lD_samples: number[] = []
  const pFail_samples: number[] = []
  const failuresPerCharger: number[] = chargers.map(() => 0)
  const operationalDaysPerCharger: number[] = chargers.map(() => 0)

  for (let day = 0; day < T_DAYS; day++) {
    for (let i = 0; i < N_CHARGERS; i++) {
      const c = chargers[i]
      if (c.status === 'failed') continue

      const stress = chargerToStress(c)
      const h = entropyFromConfig(stress, config)
      const ageDays = day - c.install_day
      const lEnt = lambdaEntropy(h, c.hardware_state, config)
      const lAge = lambdaAge(Math.max(0, ageDays), config)
      const lD = lambdaD(h, c.hardware_state, ageDays, config)
      const prob = pFail(lD)

      H_samples.push(h)
      lEnt_samples.push(lEnt)
      lAge_samples.push(lAge)
      lD_samples.push(lD)
      pFail_samples.push(prob)

      operationalDaysPerCharger[i] += 1

      if (rng() < prob) {
        c.status = 'failed'
        failuresPerCharger[i] += 1
      } else {
        c.connector_cycles = Math.min(5000, c.connector_cycles + 1)
        c.hardware_state = Math.max(0, c.hardware_state - 0.0002)
      }
    }
  }

  const totalFailures = failuresPerCharger.reduce((a, b) => a + b, 0)
  const meanPFail =
    pFail_samples.length > 0
      ? pFail_samples.reduce((a, b) => a + b, 0) / pFail_samples.length
      : 0
  const meanDailyFailureRate = totalFailures / (N_CHARGERS * T_DAYS)
  const MTBF_days = meanDailyFailureRate > 0 ? 1 / meanDailyFailureRate : Infinity
  const failuresPerChargerPerYear = totalFailures / N_CHARGERS / 3
  const annualFailureRate = failuresPerChargerPerYear

  const uptimes = operationalDaysPerCharger.map((d) => d / T_DAYS)
  const uptimeMean = uptimes.reduce((a, b) => a + b, 0) / uptimes.length
  const uptimeSorted = [...uptimes].sort((a, b) => a - b)

  const H_sorted = [...H_samples].sort((a, b) => a - b)
  const result: DiagnosticsResult = {
    H_dist: {
      min: H_samples.length ? Math.min(...H_samples) : 0,
      max: H_samples.length ? Math.max(...H_samples) : 0,
      mean: H_samples.length ? H_samples.reduce((a, b) => a + b, 0) / H_samples.length : 0,
      p10: percentile(H_sorted, 10),
      p50: percentile(H_sorted, 50),
      p90: percentile(H_sorted, 90),
    },
    lambda_base_mean: lambdaBase,
    lambda_entropy_mean:
      lEnt_samples.length > 0 ? lEnt_samples.reduce((a, b) => a + b, 0) / lEnt_samples.length : 0,
    lambda_age_mean:
      lAge_samples.length > 0 ? lAge_samples.reduce((a, b) => a + b, 0) / lAge_samples.length : 0,
    lambda_d_mean:
      lD_samples.length > 0 ? lD_samples.reduce((a, b) => a + b, 0) / lD_samples.length : 0,
    mean_P_fail: meanPFail,
    total_failures: totalFailures,
    failures_per_charger_per_year: failuresPerChargerPerYear,
    uptime_mean: uptimeMean,
    uptime_p10: percentile(uptimeSorted, 10),
    uptime_p90: percentile(uptimeSorted, 90),
    operational_days_per_charger: operationalDaysPerCharger,
    MTBF_days,
    annual_failure_rate: annualFailureRate,
  }

  logDiagnostics(result)
  return result
}

function logDiagnostics(r: DiagnosticsResult): void {
  console.log('--- Failure model diagnostics (3-year, 100 chargers) ---')
  console.log('H distribution: min=%s max=%s mean=%s p10=%s p50=%s p90=%s', r.H_dist.min.toFixed(4), r.H_dist.max.toFixed(4), r.H_dist.mean.toFixed(4), r.H_dist.p10.toFixed(4), r.H_dist.p50.toFixed(4), r.H_dist.p90.toFixed(4))
  console.log('lambda_base (mean): %s', r.lambda_base_mean.toFixed(6))
  console.log('lambda_entropy (mean): %s', r.lambda_entropy_mean.toFixed(6))
  console.log('lambda_age (mean): %s', r.lambda_age_mean.toFixed(6))
  console.log('lambda_d (mean): %s', r.lambda_d_mean.toFixed(6))
  console.log('Mean P_fail (daily): %s (%s%%)', r.mean_P_fail.toFixed(6), (r.mean_P_fail * 100).toFixed(3))
  console.log('Total failures: %s', r.total_failures)
  console.log('Failures per charger per year: %s (target 1–4)', r.failures_per_charger_per_year.toFixed(2))
  console.log('Uptime: mean=%s%% p10=%s%% p90=%s%% (target 95–99%%)', (r.uptime_mean * 100).toFixed(2), (r.uptime_p10 * 100).toFixed(2), (r.uptime_p90 * 100).toFixed(2))
  console.log('MTBF (days): %s (%s years)', r.MTBF_days.toFixed(0), (r.MTBF_days / 365).toFixed(1))
  console.log('Annual failure rate (per charger): %s', r.annual_failure_rate.toFixed(2))
  console.log('---')
}
