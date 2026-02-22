import { StateGraph, MessagesAnnotation, START, END } from '@langchain/langgraph/web';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { ChatGroq } from '@langchain/groq';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
    getBadChargers,
    inspectChargerDetails,
    recalibrateCharger,
    derateCharger,
    fixCharger,
    createSupportTicket,
    type AgentEvent,
} from '../sim/governor';

// ── Tools ──────────────────────────────────────────────────────────

const getFailedChargersTool = tool(
    () => {
        const bad = getBadChargers();
        if (bad.length === 0) {
            return 'All chargers are operational. No issues detected.';
        }
        return JSON.stringify(bad, null, 2);
    },
    {
        name: 'get_bad_chargers',
        description:
            'Retrieve all EV chargers currently with issues (failed, derated, or partially_operational). Returns station ID, machine ID, status, hardware health %, and utilization rate.',
        schema: z.object({}).passthrough(),
    }
);

const inspectChargerTool = tool(
    ({ stationId, machineId }) => {
        return inspectChargerDetails(stationId, machineId);
    },
    {
        name: 'inspect_charger',
        description:
            'Get full electrical telemetry and diagnostic report for a specific charger. Returns voltage deviation, insulation resistance, ground fault current, THD, internal temperature, power factor, and an auto-generated diagnosis. Use this to understand root causes before deciding which action to take.',
        schema: z.object({
            stationId: z.string().describe('The station ID'),
            machineId: z.string().describe('The machine/charger ID'),
        }),
    }
);

const recalibrateChargerTool = tool(
    ({ stationId, machineId }) => {
        return recalibrateCharger(stationId, machineId);
    },
    {
        name: 'recalibrate_charger',
        description:
            'Recalibrate a charger\'s electrical systems — improves power factor, reduces THD, boosts insulation resistance, and provides a small +5% hardware state boost. Best for chargers showing electrical drift (high THD, low power factor, declining insulation) but not yet failed. Cannot be used on failed chargers.',
        schema: z.object({
            stationId: z.string().describe('The station ID'),
            machineId: z.string().describe('The machine/charger ID'),
        }),
    }
);

const derateChargerTool = tool(
    ({ stationId, machineId }) => {
        return derateCharger(stationId, machineId);
    },
    {
        name: 'derate_charger',
        description:
            'Reduce a charger\'s power output (derate) to extend its life. Lowers utilization by 30% and reduces internal temperature. Sets status to partially_operational. Best for chargers with HIGH internal temperature or that are under thermal stress. Preventive action to avoid total failure. Cannot be used on failed chargers.',
        schema: z.object({
            stationId: z.string().describe('The station ID'),
            machineId: z.string().describe('The machine/charger ID'),
        }),
    }
);

const fixChargerTool = tool(
    ({ stationId, machineId }) => {
        return fixCharger(stationId, machineId);
    },
    {
        name: 'fix_charger',
        description:
            'Remote fix for a charger. Works on derated, partially_operational, AND failed chargers. For failed chargers: if hardware > 30% and no critical electrical issues, it will lower kWh/voltage and restore to partially_operational (+3 days saved). If hardware is too low or critical electrical issues exist, it will FAIL and you must use create_support_ticket instead. Always inspect_charger first to check if a remote fix is viable.',
        schema: z.object({
            stationId: z.string().describe('The station ID'),
            machineId: z.string().describe('The machine/charger ID'),
        }),
    }
);

const createSupportTicketTool = tool(
    ({ stationId, machineId, description }) => {
        return createSupportTicket(stationId, machineId, description);
    },
    {
        name: 'create_support_ticket',
        description:
            'Create a support ticket for a FAILED charger with catastrophic hardware damage. Use ONLY after inspect_charger shows critical issues (HW ≤ 30%, insulation < 100MΩ, ground fault > 30mA, or temp > 70°C) AND fix_charger has already been tried or is clearly unviable. This dispatches a physical repair team and does NOT count as days saved.',
        schema: z.object({
            stationId: z.string().describe('The station ID'),
            machineId: z.string().describe('The machine/charger ID'),
            description: z.string().describe('Diagnostic description for the field technician based on charger inspection'),
        }),
    }
);

const tools = [
    getFailedChargersTool,
    inspectChargerTool,
    recalibrateChargerTool,
    derateChargerTool,
    fixChargerTool,
    createSupportTicketTool,
];
const toolNode = new ToolNode(tools);

// ── LLM ────────────────────────────────────────────────────────────

const llm = new ChatGroq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature: 0,
}).bindTools(tools);

// ── Graph ──────────────────────────────────────────────────────────

async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await llm.invoke(state.messages);
    return { messages: [response] };
}

const workflow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', toolsCondition, ['tools', '__end__'])
    .addEdge('tools', 'agent');

const app = workflow.compile();

// ── Public API ─────────────────────────────────────────────────────

export interface AgentResult {
    summary: string;
    events: AgentEvent[];
}

export async function runGridAgent(day: number): Promise<AgentResult> {
    if (!import.meta.env.VITE_GROQ_API_KEY) {
        return {
            summary: 'VITE_GROQ_API_KEY is not set in .env',
            events: [],
        };
    }

    const systemPrompt = `You are the Grid Governor AI agent managing an EV charging mesh network in Davis, CA.
It is currently simulation day ${day}.

CHARGER STATES:
- "operational" — healthy, running normally
- "partially_operational" — degraded but still running at reduced kWh/voltage; degrades 3x faster and will fail when hardware drops below 30%
- "derated" — power output reduced due to grid stress; can be remotely fixed
- "failed" — stopped delivering power. May be a software crash OR catastrophic hardware failure.

TOOLS:
1. get_bad_chargers — scan for all chargers with issues
2. inspect_charger — get full electrical telemetry + diagnosis (ALWAYS do this before acting)
3. recalibrate_charger — fix electrical drift (high THD, low PF, declining insulation). +5% HW.
4. derate_charger — reduce load to prevent thermal failure (high temp >55°C).
5. fix_charger — remote fix that lowers kWh/voltage and sets to partially_operational. Works on failed, derated, AND partially_operational. For failed chargers, only works if HW > 30% and no critical electrical issues.
6. create_support_ticket — dispatch physical repair. LAST RESORT for catastrophic hardware failures only.

DECISION FLOWCHART:
1. get_bad_chargers to see what's wrong
2. For EVERY problematic charger, use inspect_charger FIRST
3. Based on the inspection diagnosis:
   • "No critical electrical issues" on a failed charger → fix_charger (remote recovery, saves 3 days downtime)
   • CRITICAL issues (insulation <100MΩ, GF >30mA, temp >70°C, HW ≤30%) → create_support_ticket
   • High THD or low power factor on non-failed → recalibrate_charger
   • High internal temp (>55°C) on non-failed → derate_charger
   • Derated/partial with OK electrical → fix_charger
4. Summarize your findings and actions in 2-3 sentences

IMPORTANT: NEVER create a support ticket without inspecting the charger first. Many failures are software crashes that can be fixed remotely.

Think step-by-step and explain your reasoning.`;

    const events: AgentEvent[] = [];

    try {
        const result = await app.invoke({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Run your inspection and maintenance cycle now.' },
            ],
        });

        // Extract events from all messages
        for (const msg of result.messages) {
            const msgType = msg._getType?.();

            if (msgType === 'ai') {
                const content = typeof msg.content === 'string' ? msg.content.trim() : '';

                // AI reasoning text before tool calls → thinking event
                if (content && msg.tool_calls?.length) {
                    events.push({
                        id: `think-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        timestamp: Date.now(),
                        source: 'thinking',
                        action: '💭 Agent Reasoning',
                        detail: content.slice(0, 300),
                        status: 'info',
                    });
                }

                // Tool calls
                if (msg.tool_calls?.length) {
                    for (const tc of msg.tool_calls) {
                        const toolLabels: Record<string, { action: string; detail: string; status: AgentEvent['status'] }> = {
                            get_bad_chargers: {
                                action: '🔍 Scanning Grid',
                                detail: 'Scanning all stations for failed, derated, or degraded chargers...',
                                status: 'info',
                            },
                            inspect_charger: {
                                action: `🔬 Inspecting ${tc.args?.machineId ?? 'charger'}`,
                                detail: `Reading electrical telemetry from ${tc.args?.machineId} at ${tc.args?.stationId}`,
                                status: 'info',
                            },
                            recalibrate_charger: {
                                action: `⚙️ Recalibrating ${tc.args?.machineId ?? 'charger'}`,
                                detail: `Recalibrating electrical systems on ${tc.args?.machineId} at ${tc.args?.stationId}`,
                                status: 'info',
                            },
                            derate_charger: {
                                action: `⚡ Derating ${tc.args?.machineId ?? 'charger'}`,
                                detail: `Reducing load on ${tc.args?.machineId} at ${tc.args?.stationId} to prevent failure`,
                                status: 'warning',
                            },
                            fix_charger: {
                                action: `🔧 Fixing ${tc.args?.machineId ?? 'charger'}`,
                                detail: `Remote software fix on ${tc.args?.machineId} at ${tc.args?.stationId}`,
                                status: 'info',
                            },
                            create_support_ticket: {
                                action: `🎫 Ticket → ${tc.args?.machineId ?? 'charger'}`,
                                detail: `Creating ticket: "${tc.args?.description?.slice(0, 100)}"`,
                                status: 'warning',
                            },
                        };

                        const label = toolLabels[tc.name] ?? {
                            action: `🛠️ ${tc.name}`,
                            detail: JSON.stringify(tc.args).slice(0, 100),
                            status: 'info' as const,
                        };

                        events.push({
                            id: `${tc.id}-${Date.now()}`,
                            timestamp: Date.now(),
                            source: 'agent',
                            ...label,
                        });
                    }
                }
            }

            // Tool response messages
            if (msgType === 'tool') {
                const content = typeof msg.content === 'string' ? msg.content : String(msg.content);
                const isTicket = content.includes('Support ticket');
                const isFix = content.includes('PARTIALLY OPERATIONAL');
                const isRecal = content.includes('Recalibrated');
                const isDerate = content.includes('Derated');
                const isFailed = content.includes('CANNOT');

                let action = '📋 Result';
                let status: AgentEvent['status'] = 'info';

                if (isTicket) { action = '🎫 Ticket Created'; status = 'warning'; }
                else if (isRecal) { action = '✅ Recalibration Done'; status = 'success'; }
                else if (isDerate) { action = '⚡ Derate Applied'; status = 'warning'; }
                else if (isFix) { action = '✅ Fix Applied'; status = 'success'; }
                else if (isFailed) { action = '⚠️ Action Failed'; status = 'error'; }

                events.push({
                    id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    timestamp: Date.now(),
                    source: 'tool',
                    action,
                    detail: content.slice(0, 250),
                    status,
                });
            }
        }

        // Last AI message is the summary
        const lastMsg = result.messages[result.messages.length - 1];
        const summary = typeof lastMsg.content === 'string' ? lastMsg.content : String(lastMsg.content);

        return { summary, events };
    } catch (error: any) {
        console.error('Grid Agent error:', error);
        return {
            summary: `Agent error: ${error.message}`,
            events: [{
                id: `error-${Date.now()}`,
                timestamp: Date.now(),
                source: 'agent',
                action: '❌ Agent Error',
                detail: error.message,
                status: 'error',
            }],
        };
    }
}
