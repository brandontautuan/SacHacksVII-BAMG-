let stations = [];
let agentLogs = [];
export function setStations(data) {
    stations = data;
}
export function getStations() {
    return stations;
}
export function getAgentLogs() {
    return agentLogs;
}
export function addAgentLog(source, message) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    agentLogs.push({ time, source, message });
    if (agentLogs.length > 100) {
        agentLogs = agentLogs.slice(-100);
    }
}
export function derateCharger(chargerId, level) {
    for (const station of stations) {
        for (const charger of station.chargers) {
            if (charger.machine_id === chargerId) {
                charger.is_derated = true;
                charger.status = 'derated';
                addAgentLog('agent', `Derated charger ${chargerId} to ${level}kW`);
                return true;
            }
        }
    }
    return false;
}
export function updateChargerRisk(chargerId, riskLevel, daysUntilFailure) {
    for (const station of stations) {
        for (const charger of station.chargers) {
            if (charger.machine_id === chargerId) {
                charger.risk_level = riskLevel;
                if (daysUntilFailure !== undefined) {
                    charger.days_until_failure = daysUntilFailure;
                }
                return true;
            }
        }
    }
    return false;
}
export function mockApiPlugin() {
    return {
        name: 'mock-api-plugin',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.method === 'GET' && req.url === '/api/stations') {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(stations));
                    return;
                }
                if (req.method === 'GET' && req.url === '/api/agent-logs') {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(agentLogs));
                    return;
                }
                if (req.method === 'POST' && req.url === '/api/agent/log') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const { source, message } = JSON.parse(body);
                            addAgentLog(source || 'agent', message);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        }
                        catch {
                            res.statusCode = 400;
                            res.end(JSON.stringify({ error: 'Invalid JSON' }));
                        }
                    });
                    return;
                }
                if (req.method === 'POST' && req.url === '/api/agent/derate') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const { charger_id, level } = JSON.parse(body);
                            const success = derateCharger(charger_id, level);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success }));
                        }
                        catch {
                            res.statusCode = 400;
                            res.end(JSON.stringify({ error: 'Invalid JSON' }));
                        }
                    });
                    return;
                }
                next();
            });
        }
    };
}
