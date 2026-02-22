# EV Charger Mesh — Davis, CA

React + TypeScript + Vite app that visualizes a geospatial network of EV charging stations in Davis, California. Uses **MapLibre GL JS** with free OpenStreetMap-compatible vector tiles and **Deck.gl** for nodes and mesh edges. No API keys, no paid services, fully client-side.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run**

   ```bash
   npm run dev
   ```

   Open the URL shown (e.g. http://localhost:5173). No environment variables or API keys required.

## Stack

- **MapLibre GL JS** — map engine (replaces Mapbox; no token)
- **Carto Dark Matter** — free vector tile style (OSM-based, no key)
- **Deck.gl** — ScatterplotLayer (nodes), LineLayer (mesh edges); overlay works with MapLibre via same control API
- **React 19 + TypeScript + Vite** — app shell

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build

## Structure

- `src/data/` — charger types and `chargers.json`
- `src/graph/` — Haversine distance and mesh builder (3 nearest neighbors, no duplicate edges)
- `src/map/` — MapView (MapLibre + Deck overlay), layers (Scatterplot, Line), constants (Davis center/bounds)
- `src/ui/` — Controls (mesh toggle, filter by type, reset view), Tooltip (hover)

## Data

Chargers are loaded from `src/data/chargers.json` (Davis), `sacramentoChargers.json`, and `folsomChargers.json`. Each record has `id`, `latitude`, `longitude`, `power_kw`, `charger_type`. The mesh connects each station to its 3 nearest neighbors (Haversine); edges are stored as source → target coordinate pairs and deduplicated.

- **Davis** — `chargers.json` (curated locations).
- **Sacramento & Folsom** — Real locations from the [NREL Alternative Fuel Data Center (AFDC)](https://afdc.energy.gov/) API (same source as the [Station Locator](https://afdc.energy.gov/stations/)). To refresh: `node scripts/fetch-nrel-chargers.js` (uses `DEMO_KEY` or `NREL_API_KEY` env).
