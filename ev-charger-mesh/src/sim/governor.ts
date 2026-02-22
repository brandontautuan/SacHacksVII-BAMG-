import type { Station, Charger } from '@/data/types'

/**
 * Shared mutable reference so the LLM agent tools can read/write
 * the live simulation state from DavisPage.
 */
let _stationsRef: Station[] = []
let _setStations: ((updater: (prev: Station[]) => Station[]) => void) | null = null

export function bindStations(
    stations: Station[],
    setter: (updater: (prev: Station[]) => Station[]) => void
) {
    _stationsRef = stations
    _setStations = setter
}

export function getStationsSnapshot(): Station[] {
    return _stationsRef
}

export interface AgentEvent {
    id: string
    timestamp: number
    source: 'agent' | 'tool' | 'thinking'
    action: string
    detail: string
    status: 'info' | 'success' | 'warning' | 'error'
}

// ── Days saved counter ─────────────────────────────────────────────
// Only incremented when the agent successfully remote-fixes a charger
// (avoids a physical support ticket). +3 days per successful fix.
let _daysSaved = 0

export function getDaysSaved(): number {
    return _daysSaved
}
export function resetDaysSaved(): void {
    _daysSaved = 0
}

// ── Support tickets store ──────────────────────────────────────────
export interface SupportTicket {
    id: string
    stationId: string
    machineId: string
    severity: 'high' | 'critical'
    description: string
    createdAt: number
    status: 'open'
}

const _supportTickets: SupportTicket[] = []

export function getSupportTickets(): SupportTicket[] {
    return [..._supportTickets]
}
export function resetSupportTickets(): void {
    _supportTickets.length = 0
}

// ── Helper: check for critical electrical issues ───────────────────
function hasCriticalElectricalIssues(c: Charger): boolean {
    if (c.insulation_resistance_mohm < 100) return true
    if (c.ground_fault_current_ma > 30) return true
    if (c.internal_temp_celsius > 70) return true
    return false
}

// ── Tool implementations ───────────────────────────────────────────

/**
 * Get all chargers that are in a bad state (failed, derated, or partially_operational).
 */
export function getBadChargers(): {
    stationId: string
    machineId: string
    status: string
    hardwareState: number
    utilizationRate: number
}[] {
    const results: {
        stationId: string
        machineId: string
        status: string
        hardwareState: number
        utilizationRate: number
    }[] = []

    for (const station of _stationsRef) {
        for (const charger of station.chargers) {
            if (
                charger.status === 'failed' ||
                charger.status === 'derated' ||
                charger.status === 'partially_operational'
            ) {
                results.push({
                    stationId: station.id,
                    machineId: charger.machine_id,
                    status: charger.status ?? 'unknown',
                    hardwareState: charger.hardware_state,
                    utilizationRate: charger.utilization_rate,
                })
            }
        }
    }

    return results
}

/**
 * Inspect full electrical telemetry for a specific charger.
 */
export function inspectChargerDetails(stationId: string, machineId: string): string {
    for (const station of _stationsRef) {
        if (station.id !== stationId) continue
        for (const charger of station.chargers) {
            if (charger.machine_id !== machineId) continue

            const isDcfc = charger.voltage_v > 300
            const nomV = isDcfc ? 440 : 224

            return JSON.stringify({
                machineId: charger.machine_id,
                stationId: station.id,
                status: charger.status,
                hardwareState: `${(charger.hardware_state * 100).toFixed(1)}%`,
                utilizationRate: `${charger.utilization_rate}%`,
                gridStress: `${charger.grid_stress}%`,
                ambientTemp: `${charger.ambient_temperature}°C`,
                connectorCycles: charger.connector_cycles,
                maintenanceGap: `${charger.maintenance_gap} days`,
                electrical: {
                    voltage: `${charger.voltage_v}V (nominal: ${nomV}V, deviation: ${Math.abs(charger.voltage_v - nomV).toFixed(1)}V)`,
                    current: `${charger.current_a}A`,
                    powerFactor: `${charger.power_factor} (healthy: ≥0.95, degraded: <0.85)`,
                    insulationResistance: `${charger.insulation_resistance_mohm}MΩ (healthy: ≥500, warning: <300, critical: <100)`,
                    groundFaultCurrent: `${charger.ground_fault_current_ma}mA (healthy: <5, warning: >10, trip: >30)`,
                    thd: `${charger.thd_percent}% (healthy: <5%, degraded: >8%)`,
                    internalTemp: `${charger.internal_temp_celsius}°C (healthy: <45°C, warning: >55°C, critical: >70°C)`,
                },
                diagnosis: generateDiagnosis(charger),
            }, null, 2)
        }
    }
    return `Charger ${machineId} not found at station ${stationId}.`
}

/** Generate a diagnosis based on electrical properties. */
function generateDiagnosis(c: Charger): string[] {
    const issues: string[] = []
    const isDcfc = c.voltage_v > 300
    const nomV = isDcfc ? 440 : 224
    const vDev = Math.abs(c.voltage_v - nomV)

    if (vDev > (isDcfc ? 30 : 15)) issues.push(`HIGH VOLTAGE DEVIATION: ${vDev.toFixed(1)}V from nominal — potential supply/inverter issue`)
    if (c.insulation_resistance_mohm < 100) issues.push(`CRITICAL INSULATION: ${c.insulation_resistance_mohm}MΩ — risk of ground fault, immediate action needed`)
    else if (c.insulation_resistance_mohm < 300) issues.push(`LOW INSULATION: ${c.insulation_resistance_mohm}MΩ — degrading, monitor closely`)
    if (c.ground_fault_current_ma > 20) issues.push(`HIGH GROUND FAULT LEAKAGE: ${c.ground_fault_current_ma}mA — near trip threshold (30mA)`)
    else if (c.ground_fault_current_ma > 10) issues.push(`ELEVATED GROUND FAULT: ${c.ground_fault_current_ma}mA — should recalibrate`)
    if (c.thd_percent > 8) issues.push(`HIGH THD: ${c.thd_percent}% — harmonic distortion indicates inverter degradation`)
    if (c.internal_temp_celsius > 70) issues.push(`CRITICAL TEMPERATURE: ${c.internal_temp_celsius}°C — thermal runaway risk, derate immediately`)
    else if (c.internal_temp_celsius > 55) issues.push(`HIGH TEMPERATURE: ${c.internal_temp_celsius}°C — consider reducing load`)
    if (c.power_factor < 0.85) issues.push(`LOW POWER FACTOR: ${c.power_factor} — inefficient power conversion, needs recalibration`)

    if (issues.length === 0) issues.push('No critical electrical issues detected.')
    return issues
}

/**
 * Recalibrate a charger's electrical systems.
 */
export function recalibrateCharger(stationId: string, machineId: string): string {
    if (!_setStations) return 'State setter not available.'
    let result = ''

    _setStations((prev) =>
        prev.map((station) => {
            if (station.id !== stationId) return station
            return {
                ...station,
                chargers: station.chargers.map((c) => {
                    if (c.machine_id !== machineId) return c
                    if (c.status === 'failed') {
                        result = `Cannot recalibrate ${machineId} — it is FAILED. Inspect it first and use fix_charger or create_support_ticket.`
                        return c
                    }
                    const newPf = Math.min(0.99, c.power_factor + 0.08)
                    const newThd = Math.max(2, c.thd_percent - 3)
                    const newInsul = Math.min(550, c.insulation_resistance_mohm + 80)
                    const newGf = Math.max(1, c.ground_fault_current_ma - 4)
                    const newHw = Math.min(1, c.hardware_state + 0.05)
                    result = `✅ Recalibrated ${machineId}: PF ${c.power_factor.toFixed(3)}→${newPf.toFixed(3)}, THD ${c.thd_percent.toFixed(1)}%→${newThd.toFixed(1)}%, Insulation ${c.insulation_resistance_mohm}→${newInsul}MΩ, GF ${c.ground_fault_current_ma}→${newGf}mA, HW +5% to ${(newHw * 100).toFixed(0)}%.`
                    return { ...c, power_factor: newPf, thd_percent: newThd, insulation_resistance_mohm: newInsul, ground_fault_current_ma: newGf, hardware_state: newHw }
                }),
            }
        })
    )
    return result || `Charger ${machineId} not found at ${stationId}.`
}

/**
 * Derate a charger — reduce utilization to extend life.
 */
export function derateCharger(stationId: string, machineId: string): string {
    if (!_setStations) return 'State setter not available.'
    let result = ''

    _setStations((prev) =>
        prev.map((station) => {
            if (station.id !== stationId) return station
            return {
                ...station,
                chargers: station.chargers.map((c) => {
                    if (c.machine_id !== machineId) return c
                    if (c.status === 'failed') {
                        result = `Cannot derate ${machineId} — it is FAILED.`
                        return c
                    }
                    const newUtil = Math.max(20, c.utilization_rate - 30)
                    const newInternalTemp = Math.max(25, c.internal_temp_celsius - 8)
                    result = `⚡ Derated ${machineId}: utilization ${c.utilization_rate}%→${newUtil}%, internal temp ${c.internal_temp_celsius.toFixed(1)}°C→${newInternalTemp.toFixed(1)}°C. Status set to partially_operational.`
                    return { ...c, utilization_rate: newUtil, internal_temp_celsius: newInternalTemp, status: 'partially_operational' as const, is_derated: true }
                }),
            }
        })
    )
    return result || `Charger ${machineId} not found at ${stationId}.`
}

/**
 * Fix a charger. Works on derated, partially_operational, AND failed chargers.
 *
 * For failed chargers:
 *   - If HW > 0.3 and no critical electrical issues → lowers kWh/voltage,
 *     sets to partially_operational, increments daysSaved by 3
 *   - If HW ≤ 0.3 or critical electrical issues → returns error,
 *     agent must create a support ticket instead
 *
 * For derated/partially_operational:
 *   - Sets to partially_operational with hardware boost + lowered output
 */
export function fixCharger(stationId: string, machineId: string): string {
    if (!_setStations) return 'State setter not available.'
    let result = ''

    _setStations((prev) =>
        prev.map((station) => {
            if (station.id !== stationId) return station
            return {
                ...station,
                chargers: station.chargers.map((c) => {
                    if (c.machine_id !== machineId) return c

                    // ── Failed charger: attempt remote recovery ──
                    if (c.status === 'failed') {
                        // Can't fix if hardware is too degraded or critical electrical issues
                        if (c.hardware_state <= 0.3 || hasCriticalElectricalIssues(c)) {
                            const reasons: string[] = []
                            if (c.hardware_state <= 0.3) reasons.push(`hardware too low (${(c.hardware_state * 100).toFixed(0)}%)`)
                            if (c.insulation_resistance_mohm < 100) reasons.push(`critical insulation (${c.insulation_resistance_mohm}MΩ)`)
                            if (c.ground_fault_current_ma > 30) reasons.push(`ground fault trip (${c.ground_fault_current_ma}mA)`)
                            if (c.internal_temp_celsius > 70) reasons.push(`thermal critical (${c.internal_temp_celsius}°C)`)
                            result = `CANNOT remotely fix ${machineId} — ${reasons.join(', ')}. Physical support ticket required.`
                            return c
                        }

                        // Software crash recovery: lower output, set to partially_operational
                        const isDcfc = c.voltage_v > 300
                        const newVoltage = Math.round(c.voltage_v * 0.85 * 10) / 10   // lower voltage by 15%
                        const newCurrent = Math.round(c.current_a * 0.80 * 10) / 10   // lower current by 20%
                        const newUtil = Math.max(20, c.utilization_rate - 25)           // reduce utilization by 25%
                        const newHw = Math.min(1, c.hardware_state + 0.10)

                        _daysSaved += 3  // avoided a physical truck roll

                        result = `✅ Remote fix successful for ${machineId}! Status: PARTIALLY OPERATIONAL. Voltage ${c.voltage_v}V→${newVoltage}V, Current ${c.current_a}A→${newCurrent}A, Utilization ${c.utilization_rate}%→${newUtil}%. HW boosted to ${(newHw * 100).toFixed(0)}%. (+3 days saved)`
                        return {
                            ...c,
                            status: 'partially_operational' as const,
                            is_derated: false,
                            hardware_state: newHw,
                            voltage_v: newVoltage,
                            current_a: newCurrent,
                            utilization_rate: newUtil,
                        }
                    }

                    // ── Derated / partially_operational: standard fix ──
                    if (c.status === 'derated' || c.status === 'partially_operational') {
                        const newVoltage = Math.round(c.voltage_v * 0.90 * 10) / 10
                        const newCurrent = Math.round(c.current_a * 0.85 * 10) / 10
                        const newUtil = Math.max(20, c.utilization_rate - 15)
                        const newHw = Math.min(1, c.hardware_state + 0.15)

                        _daysSaved += 3

                        result = `✅ Fixed ${machineId}: PARTIALLY OPERATIONAL. Voltage ${c.voltage_v}V→${newVoltage}V, Current ${c.current_a}A→${newCurrent}A, Util ${c.utilization_rate}%→${newUtil}%. HW boosted to ${(newHw * 100).toFixed(0)}%. (+3 days saved)`
                        return {
                            ...c,
                            status: 'partially_operational' as const,
                            is_derated: false,
                            hardware_state: newHw,
                            voltage_v: newVoltage,
                            current_a: newCurrent,
                            utilization_rate: newUtil,
                        }
                    }

                    result = `${machineId} is already operational. No action needed.`
                    return c
                }),
            }
        })
    )

    return result || `Charger ${machineId} not found at ${stationId}.`
}

/**
 * Create a support ticket for a failed charger that requires physical intervention.
 * NO days saved — this is the expensive path.
 */
export function createSupportTicket(
    stationId: string,
    machineId: string,
    description: string
): string {
    const existing = _supportTickets.find(
        t => t.stationId === stationId && t.machineId === machineId && t.status === 'open'
    )
    if (existing) {
        return `Support ticket ${existing.id} already exists for ${machineId} at ${stationId}. Status: OPEN.`
    }

    const ticket: SupportTicket = {
        id: `TKT-${Date.now().toString(36).toUpperCase()}`,
        stationId,
        machineId,
        severity: 'critical',
        description,
        createdAt: Date.now(),
        status: 'open',
    }

    _supportTickets.push(ticket)

    return `🎫 Support ticket ${ticket.id} created for ${machineId} at ${stationId}. Severity: CRITICAL. Physical support team dispatched. No downtime savings — this requires on-site repair.`
}
