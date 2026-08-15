# Real Deriv API Connection & Persistent Codebase Auto-Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate real Deriv WebSocket live execution (disabling simulator fallback when operating in REAL/DEMO mode) and implement a persistent Codebase Auto-Learning Engine to store trade history, dynamically adapt decision thresholds, and provide backup/restore controls.

**Architecture:** 
1. `DerivWebSocketAdapter` is upgraded with `strictRealMode` to disable simulator fallback, handle token authorization (`authorize`), subscribe to live balance (`balance`), and execute/monitor live contracts (`buy`, `proposal_open_contract`).
2. `AutoTunerEngine` is upgraded to persist trade outcome history to `localStorage` (`deriv_codebase_learning_v1`), compute dynamic threshold offsets based on rolling win rates, and export/import JSON learning models.
3. UI components (`Header.tsx` and `CalibrationSuite.tsx`) are updated with Deriv token input, live balance display, connection badges, and codebase learning controls.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS v4, Lucide React icons, Deriv WebSocket API v3.

## Global Constraints
- Target workspace: `c:\Users\esteb\deriv-adaptive-funnel-trader`
- Strict architecture: RAW_SCORE → Penalties → FINAL_SCORE → Threshold → Decision → Risk Engine
- Zero simulator fallback when REAL/DEMO mode is active with invalid token or disconnected WS.

---

### Task 1: Real Deriv Connection & Execution Engine (`src/services/websocket.ts`)

**Files:**
- Modify: `c:\Users\esteb\deriv-adaptive-funnel-trader\src\services\websocket.ts`

**Interfaces:**
- Consumes: `SymbolCode`, `TickData`, `CandleData` from `../types/trading`
- Produces: `DerivWSOptions` upgraded with `strictRealMode?: boolean`, `onBalanceUpdate?: (balance: number, currency: string) => void`, `onTradeOutcome?: (contractId: string, win: boolean, profit: number) => void`

- [ ] **Step 1: Update WebSocket Adapter for Strict Real Mode and Balance Tracking**

Modify `src/services/websocket.ts` to add `strictRealMode`, handle `balance` subscription, and suppress simulator fallback when strict mode is enabled or when mode is REAL/DEMO.

```typescript
// Add balance and outcome callbacks to DerivWSOptions
export interface DerivWSOptions {
  appId?: string;
  token?: string;
  symbol: SymbolCode;
  strictRealMode?: boolean;
  onTick?: (tick: TickData) => void;
  onCandleHistory?: (candles: CandleData[]) => void;
  onStatusChange?: (status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'AUTHORIZED', info?: string) => void;
  onError?: (err: string) => void;
  onContractUpdate?: (contract: any) => void;
  onBalanceUpdate?: (balance: number, currency: string) => void;
  onTradeOutcome?: (contractId: string, win: boolean, profit: number) => void;
}
```

- [ ] **Step 2: Update `connect()` and message handler for authorization, balance, and contract outcomes**

Ensure `{ balance: 1, subscribe: 1 }` is sent on authorization. Ensure `startSimulator` is ONLY invoked if `!this.options.strictRealMode`.

- [ ] **Step 3: Test compilation**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/services/websocket.ts
git commit -m "feat: upgrade DerivWebSocketAdapter with strict real mode, balance tracking, and trade outcome handling"
```

---

### Task 2: Persistent Codebase Auto-Learning Engine (`src/services/autotuner.ts`)

**Files:**
- Modify: `c:\Users\esteb\deriv-adaptive-funnel-trader\src\services\autotuner.ts`

**Interfaces:**
- Consumes: `AutoTunerState` from `../types/trading`
- Produces: `LearnedTradeRecord`, `exportLearningData()`, `importLearningData(json)`, `resetLearningData()`

- [ ] **Step 1: Implement LocalStorage persistence and detailed trade recording in `AutoTunerEngine`**

Update `src/services/autotuner.ts` to load saved learning records from `localStorage.getItem('deriv_codebase_learning_v1')`, calculate rolling win rates per market condition, and adjust entry threshold dynamically.

```typescript
export interface LearnedTradeRecord {
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

- [ ] **Step 2: Implement Export, Import, and Reset methods**

```typescript
public exportLearningData(): string {
  return JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    samples: this.samples,
    state: this.state
  }, null, 2);
}

public importLearningData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.samples && Array.isArray(data.samples)) {
      this.samples = data.samples;
      this.saveToStorage();
      this.recalculate();
      return true;
    }
  } catch (e) {
    console.error('Failed to import learning data', e);
  }
  return false;
}
```

- [ ] **Step 3: Test compilation**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/services/autotuner.ts
git commit -m "feat: enable persistent learning memory, adaptive threshold tuning, and JSON backup in AutoTunerEngine"
```

---

### Task 3: UI Settings & Codebase Learning Dashboard Integration (`src/components/Header.tsx`, `src/components/CalibrationSuite.tsx`, `src/App.tsx`)

**Files:**
- Modify: `c:\Users\esteb\deriv-adaptive-funnel-trader\src\components\Header.tsx`
- Modify: `c:\Users\esteb\deriv-adaptive-funnel-trader\src\components\CalibrationSuite.tsx`
- Modify: `c:\Users\esteb\deriv-adaptive-funnel-trader\src\App.tsx`

- [ ] **Step 1: Update Header with Deriv API Token modal, balance display, and Strict Real Mode toggle**

Add API Token input, account balance display ($0.00 USD), and connection status badge in `Header.tsx`. Save token to `localStorage` key `deriv_api_token`.

- [ ] **Step 2: Update CalibrationSuite with Codebase Auto-Learning Panel**

Add visual metrics for total learned trades, rolling win rate, score compression alert badge, and database Export / Import / Reset buttons in `CalibrationSuite.tsx`.

- [ ] **Step 3: Connect WebSocket and AutoTuner in `App.tsx`**

Pass `apiToken`, `onBalanceUpdate`, `onTradeOutcome`, and `strictRealMode` options from `App.tsx` to `DerivWebSocketAdapter`. Ensure real contract outcomes update `riskEngine` and `autoTunerEngine`.

- [ ] **Step 4: Test build**

Run: `npm run lint` && `npm run build`
Expected: PASS with 0 build errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/components/CalibrationSuite.tsx src/App.tsx
git commit -m "feat: complete Real Deriv token UI integration and Codebase Auto-Learning panel"
```
