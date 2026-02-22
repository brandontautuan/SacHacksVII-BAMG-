/**
 * Fetch EV charging stations from NREL Alternative Fuel Data Center API
 * (same source as AFDC Station Locator) and write city-specific JSON for the app.
 * Usage: node scripts/fetch-nrel-chargers.js
 * Uses NREL DEMO_KEY; for production use set NREL_API_KEY env.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.NREL_API_KEY || 'DEMO_KEY';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (ch) => (body += ch));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function nrelToStation(nrelStation, cityPrefix, index) {
  const lat = Number(nrelStation.latitude);
  const lng = Number(nrelStation.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  const dc = Number(nrelStation.ev_dc_fast_num) || 0;
  const l2 = Number(nrelStation.ev_level2_evse_num) || 0;
  const l1 = Number(nrelStation.ev_level1_evse_num) || 0;

  let charger_type = 'Level 2';
  let power_kw = 50;
  if (dc > 0) {
    charger_type = 'DC Fast';
    power_kw = 350;
    const units = nrelStation.ev_charging_units || [];
    for (const u of units) {
      const conn = u.connectors || {};
      for (const k of Object.keys(conn)) {
        const p = conn[k] && conn[k].power_kw;
        if (p != null && p > 0) power_kw = Math.max(power_kw, Math.round(p));
      }
    }
    if (power_kw === 350) power_kw = 150;
  } else if (l2 > 0) {
    charger_type = 'Level 2';
    power_kw = 62;
  } else if (l1 > 0) {
    charger_type = 'Level 1';
    power_kw = 22;
  }

  return {
    id: `${cityPrefix}-${String(index + 1).padStart(3, '0')}`,
    latitude: Math.round(lat * 10000) / 10000,
    longitude: Math.round(lng * 10000) / 10000,
    power_kw,
    charger_type,
  };
}

async function main() {
  const base = 'https://developer.nrel.gov/api/alt-fuel-stations/v1/nearest.json';
  const opts = (lat, lng, radius) =>
    `${base}?api_key=${encodeURIComponent(API_KEY)}&latitude=${lat}&longitude=${lng}&radius=${radius}&fuel_type=ELEC&status=E&access=public&limit=100`;

  console.log('Fetching Sacramento area stations...');
  const sacRes = await fetchJson(opts(38.5816, -121.4944, 15));
  const sacStations = (sacRes.fuel_stations || []).filter(
    (s) => (s.city || '').toLowerCase().replace('sacremento', 'sacramento').includes('sacramento')
  );
  const sacOut = sacStations.slice(0, 80).map((s, i) => nrelToStation(s, 'sacramento', i)).filter(Boolean);

  console.log('Fetching Folsom area stations...');
  const folRes = await fetchJson(opts(38.678, -121.1762, 12));
  const folStations = (folRes.fuel_stations || []).filter(
    (s) => (s.city || '').toLowerCase().includes('folsom')
  );
  const folOut = folStations.slice(0, 80).map((s, i) => nrelToStation(s, 'folsom', i)).filter(Boolean);

  const dataDir = path.join(__dirname, '..', 'src', 'data');
  fs.writeFileSync(
    path.join(dataDir, 'sacramentoChargers.json'),
    JSON.stringify(sacOut, null, 2) + '\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(dataDir, 'folsomChargers.json'),
    JSON.stringify(folOut, null, 2) + '\n',
    'utf8'
  );
  console.log('Wrote sacramentoChargers.json:', sacOut.length, 'stations');
  console.log('Wrote folsomChargers.json:', folOut.length, 'stations');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
