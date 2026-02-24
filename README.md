# 🤖 EVIncible

**Autonomous Grid Governance for the Modern EV Infrastructure.**  
Built for SacHacks VII, The Grid Governor is a multi-agent system designed to eliminate "maintenance dead-zones" in electric vehicle charging networks using high-performance digital twins and LLM-powered autonomous repair agents.

---

## 🏗️ System Architecture

The project consists of a high-fidelity physical simulation integrated with a sovereign AI agent that monitors, diagnoses, and repairs a distributed charging mesh.

### 1. The Autonomous Agent (LangGraph/Groq)
- **Framework:** Built using `@langchain/langgraph` to implement a robust ReAct (Reasoning and Acting) loop.
- **Model:** Leverages `Llama-3.3-70b-versatile` via Groq for sub-second inference and complex tool use.
- **Decision Engine:** The agent scans the grid for telemetry anomalies, inspects electrical drift (THD, Power Factor), and executes autonomous repairs or physical dispatch tickets.

### 2. Physical Simulation Engine (Digital Twin)
- **Failure Matrix:** A custom simulation that models hardware degradation, thermal stress, and electrical noise (THD/Insulation Resistance).
- **Incident Loop:** Real-time calculation of $P_{\text{fail}}$ (Failure Probability) across thousands of chargers.
- **Adaptive Time:** The simulation "fast-forwards" through healthy periods and slows to "real-time" when a critical failure is detected, allowing the AI Governor to intervene.

### 3. Digital Twin Frontend (React/Deck.gl)
- **3D Visualization:** High-performance rendering of charger meshes in **Davis, Sacramento, and Folsom** using MapLibre GL and Deck.gl.
- **Real-time Analytics:** Comparative tracking of "With Agent" vs "No Agent" failure rates to prove ROI.
- **Intercom Feed:** A live log of the agent's internal reasoning and maintenance actions.

---

## 🚀 Key Features

- **⚡ Predictive Derating:** The agent autonomously detects thermal runs and derates power output to prevent catastrophic hardware failure.
- **🔧 Remote Software Fixes:** Recovers "failed" chargers remotely by modulating voltage and frequency before physical downtime occurs.
- **📊 Impact Analytics:** Live Line Charts showing the reduction in average failure probability thanks to agent intervention.
- **🔬 Deep Diagnostics:** LLM-driven inspection of ground fault currents, insulation resistance (MΩ), and harmonic distortion.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript, TailwindCSS (for dashboard components).
- **Mapping:** MapLibre GL, Deck.gl (3D Arc Layers & Scatterplots).
- **Charts:** Recharts (Impact Analytics).
- **Agent Intelligence:** LangGraph, Groq, LangChain.
- **Simulation:** Custom TypeScript physics/electrical simulation loop.

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Groq API Key (for the autonomous agent)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/brandontautuan/SacHacksVII-BAMG-.git
   cd SacHacksVII-BAMG-
   ```

2. **Setup Frontend:**
   ```bash
   cd ev-charger-mesh
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file in the `ev-charger-mesh` directory:
   ```env
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Launch Dev Server:**
   ```bash
   npm run dev
   ```

---

## 📖 How it Works: The Governor's Loop

1. **Monitor:** The Agent tools scan for any charger in `failed`, `derated`, or `partially_operational` states.
2. **Inspect:** For every incident, the agent pulls a payload of hardware health and electrical telemetry (THD, Internal Temp, Insulation).
3. **Reason:** The LLM evaluates if the failure is a software crash (recoverable) or hardware destruction (requires ticket).
4. **Act:**
   - **`fix_charger`**: Remote reset + voltage modulation.
   - **`recalibrate_charger`**: Corrects electrical drift.
   - **`derate_charger`**: Thermal protection.
   - **`create_support_ticket`**: Dispatch physical repair team for hardware failure.
5. **Report:** The agent provides a natural language summary of why actions were taken.

---

**Developed by BAMG for SacHacks VII**
