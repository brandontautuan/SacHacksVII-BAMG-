# 💻 EV Charger Mesh Frontend

This directory contains the React/Vite source code for **The Grid Governor** digital twin and simulation engine.

## 🚀 Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   Create a `.env` file:
   ```env
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Run Dev Server**
   ```bash
   npm run dev
   ```

## 🏗️ Folder Structure

- `src/agent/` — **Grid Governor Logic**. LangGraph workflow and LLM summary agent.
- `src/sim/` — **Physical Simulation**. Tick logic, failure configuration ($P_{\text{fail}}$), and the `governor` toolset.
- `src/map/` — **Digital Twin Rendering**. MapLibre and Deck.gl integration.
- `src/pages/` — Main application vistas for **Davis, Sacramento, and Folsom**.
- `src/ui/` — Management console and real-time impact charts.
- `src/data/` — Static geospatial datasets for California's charging mesh.

## 📜 Full Documentation
For the full system architecture and project overview, see the [Main README](../README.md).
