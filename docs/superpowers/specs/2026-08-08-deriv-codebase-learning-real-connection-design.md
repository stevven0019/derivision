# Design Specification: Real Deriv API Connection & Persistent Codebase Auto-Learning Engine

**Date:** 2026-08-08  
**Status:** Approved by User  
**Target Application:** Deriv Adaptive Funnel Trader (`deriv-adaptive-funnel-trader`)

---

## 1. Overview & Objectives

This design specification details two major enhancements to the Deriv Adaptive Funnel Trader:

1. **Real Deriv API Live Connection & Order Execution**:
   - Direct connection to `wss://ws.derivws.com/websockets/v3` with user-provided API Token.
   - Elimination of synthetic simulator fallback when operating in `REAL` or `DEMO` live mode (`strictRealMode`).
   - Account authorization, real-time balance streaming, live contract purchasing (`buy`), and contract outcome tracking (`proposal_open_contract`).

2. **Persistent Codebase Auto-Learning & AutoTuner Engine**:
   - Multi-factor trade outcome memory persisted in browser storage (`localStorage` / `IndexedDB`).
   - Tracks RAW score, FINAL score, Market State, RSI/EMA indicators, and contract win/loss resolution.
   - Dynamic threshold adaptation based on rolling win-rate statistics (last 50-200 trades).
   - Export and import tools (JSON format) to backup and restore trained codebase memory models.

---

## 2. Architecture & Subsystems

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              User Interface                             │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐ │
│ │ Header & Token Modal │ │  Calibration Panel   │ │  Trade Controls   │ │
│ └──────────┬───────────┘ └──────────┬───────────┘ └─────────┬─────────┘ │
└────────────┼────────────────────────┼───────────────────────┼───────────┘
             │                        │                       │
             ▼                        ▼                       ▼
┌────────────────────────┐┌───────────────────────┐┌──────────────────────┐
│ DerivWebSocketAdapter  ││   AutoTunerEngine     ││      RiskEngine      │
│ (ws.derivws.com)       ││ (Codebase Learning)   ││ (Position & Rules)   │
└────────────┬───────────┘└───────────┬───────────┘└───────────┬──────────┘
             │                        │                       │
             ▼                        ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Browser Persistent Storage                         │
│       - `deriv_api_token`                                               │
│       - `deriv_codebase_learning_v1`                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Details

### 3.1. Deriv WebSocket Adapter (`src/services/websocket.ts`)
- **`strictRealMode` Feature**:
  - When enabled or when operating mode is `REAL`/`DEMO`, synthetic tick/candle simulation fallback is disabled.
  - Returns `DISCONNECTED` or `UNAUTHORIZED` status with explicit diagnostic notifications.
- **Account & Balance Management**:
  - Sends `{ authorize: token }` on open.
  - Subscribes to `{ balance: 1, subscribe: 1 }` upon authorization to retrieve account currency, balance, and login ID.
- **Trade Execution & Contract Tracking**:
  - `buyContract(symbol, amount, contractType, durationSeconds)`: Submits `{ buy: 1, price: amount, parameters: { ... } }`.
  - Subscribes to open contracts to capture contract `status` (`won`, `lost`), contract `profit`, `buy_price`, and settlement timing.

### 3.2. Codebase Auto-Learning Engine (`src/services/autotuner.ts`)
- **Data Persistence**:
  - Keys: `deriv_codebase_learning_v1`.
  - Record Schema:
    ```typescript
    interface LearnedTradeRecord {
      id: string;
      timestamp: number;
      symbol: string;
      direction: 'CALL' | 'PUT';
      rawScore: number;
      finalScore: number;
      marketState: string;
      win: boolean;
      profit: number;
    }
    ```
- **Adaptive Tuning Logic**:
  - Evaluates rolling window (default 100 samples).
  - If Win Rate < 50% across last 20 trades -> Threshold adjustment increases by +2 to +4.
  - If Win Rate > 65% across last 20 trades -> Threshold adjustment decreases by -1 to -2.
  - Tracks score compression (`rawAverage - finalAverage > 15`) and alerts user of overly harsh penalty filters.
- **Data Management**:
  - `exportLearningData()`: Serializes memory database to downloadable JSON file.
  - `importLearningData(jsonString)`: Restores learning database from external file.
  - `resetLearningData()`: Clears persistent learning memory.

### 3.3. UI & Settings Integration
- **`src/components/Header.tsx`**:
  - Added API Token modal trigger and active account balance display.
  - Strict Real Mode toggle and live connection indicator badge.
- **`src/components/CalibrationSuite.tsx`**:
  - Dedicated **Codebase Auto-Learning** section.
  - Visual summary of learned win rates, total recorded trades, score compression, and adaptive threshold adjustment.
  - Memory controls: Reset, Export JSON, Import JSON.

---

## 4. Verification Plan

### Automated Verification
- Run TypeScript build check: `npm run lint` (`tsc --noEmit`) to verify zero compilation or type errors.

### Manual Verification
1. Input Deriv API token in UI, verify WebSocket connects to `wss://ws.derivws.com`, authorizes account, and displays live balance.
2. Toggle Strict Real Mode, verify simulator fallback does not run when disconnected.
3. Record trades in live/demo mode, verify trade outcomes are persisted in `localStorage`.
4. Check AutoTuner adjustment recalculation and verify Export/Import JSON features.
