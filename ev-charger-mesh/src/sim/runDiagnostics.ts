/**
 * Run failure model diagnostics (3-year Monte Carlo, 100 chargers).
 * Usage: npm run validate-failure-model
 */

import { defaultFailureConfig } from './config'
import { runMonteCarloDiagnostics } from './diagnostics'

runMonteCarloDiagnostics(defaultFailureConfig, 42)
