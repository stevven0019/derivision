/**
 * Risk & Execution Engine
 * STRICT SEPARATION: Martingale belongs exclusively to Risk Engine.
 * Martingale NEVER pollutes CALL_SCORE, PUT_SCORE, RAW_SCORE, FINAL_SCORE or Direction.
 * Controls stake sizing, cooldowns, session profit/loss limits, and contract locks.
 */

import { DecisionDirection, OperatingMode, RiskSettings, RiskState } from '../types/trading';

export interface ExecutionGateResult {
  canTrade: boolean;
  stake: number;
  primaryReason: string;
  secondaryReasons: string[];
}

export class RiskEngine {
  private state: RiskState = {
    mgStep: 0,
    lossStreak: 0,
    cooldownActive: false,
    cooldownEndsAt: 0,
    sessionLimitReached: false,
    riskLocked: false,
    currentDrawdown: 0,
    sessionPnL: 0,
    totalTrades: 0,
    executedAutoTrades: 0,
    wins: 0,
    losses: 0
  };

  private settings: RiskSettings = {
    initialStake: 10,
    mgMultiplier: 2.0,
    maxMgSteps: 3,
    stopLossAmount: 100,
    takeProfitAmount: 200,
    maxDrawdownPct: 15,
    cooldownDurationSeconds: 30,
    contractDurationSeconds: 120, // Default 2 minutes contract duration
    minPayoutPercent: 75,
    autoTunerEnabled: true,
    maxAutoTrades: 10,
    scalpingMode: false,
    scalpingReadingsRequired: 1
  };

  private hasActiveContract: boolean = false;

  constructor(customSettings?: Partial<RiskSettings>) {
    if (customSettings) {
      this.settings = { ...this.settings, ...customSettings };
    }
  }

  public updateSettings(newSettings: Partial<RiskSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): RiskSettings {
    return { ...this.settings };
  }

  public calculateStake(step?: number): number {
    const mgStep = step !== undefined ? step : this.state.mgStep;
    return parseFloat(
      (this.settings.initialStake * Math.pow(this.settings.mgMultiplier, mgStep)).toFixed(2)
    );
  }

  public getState(): RiskState {
    // Check cooldown expiry
    if (this.state.cooldownActive && Date.now() >= this.state.cooldownEndsAt) {
      this.state.cooldownActive = false;
    }
    return { ...this.state };
  }

  public setActiveContractStatus(active: boolean) {
    this.hasActiveContract = active;
  }

  public resetAutoTradeCounter() {
    this.state.executedAutoTrades = 0;
    this.state.sessionLimitReached = false;
    this.state.riskLocked = false;
  }

  public incrementExecutedAutoTrades() {
    this.state.executedAutoTrades += 1;
    if (this.settings.maxAutoTrades > 0 && this.state.executedAutoTrades >= this.settings.maxAutoTrades) {
      this.state.sessionLimitReached = true;
    }
  }

  public resetMgStep() {
    this.state.mgStep = 0;
  }

  /**
   * Main Risk Execution Gate evaluation.
   */
  public evaluateExecutionGate(
    direction: DecisionDirection,
    finalScore: number,
    effectiveThreshold: number,
    payoutPercent: number,
    mode: OperatingMode,
    readingsPassed: number = 1
  ): ExecutionGateResult {
    const secondary: string[] = [];

    // Check cooldown expiry
    if (this.state.cooldownActive && Date.now() >= this.state.cooldownEndsAt) {
      this.state.cooldownActive = false;
    }

    // 1. ANALYSIS Mode check
    if (mode === 'ANALYSIS') {
      return {
        canTrade: false,
        stake: 0,
        primaryReason: 'MODE_ANALYSIS_ONLY',
        secondaryReasons: ['Trade execution disabled in ANALYSIS mode']
      };
    }

    // 2. Direction check
    if (direction === 'NO_TRADE') {
      return {
        canTrade: false,
        stake: 0,
        primaryReason: 'DIRECTION_NO_TRADE',
        secondaryReasons: []
      };
    }

    // 3. Score Threshold check
    if (finalScore < effectiveThreshold) {
      return {
        canTrade: false,
        stake: 0,
        primaryReason: 'SCORE_BELOW_THRESHOLD',
        secondaryReasons: [`FINAL_SCORE (${finalScore}) < EFFECTIVE_THRESHOLD (${effectiveThreshold})`]
      };
    }

    // 4. Sequential Readings confirmation (Scalping Mode allows 1 reading)
    const requiredReadings = this.settings.scalpingMode ? this.settings.scalpingReadingsRequired : 1;
    if (readingsPassed < requiredReadings) {
      return {
        canTrade: false,
        stake: 0,
        primaryReason: 'WAITING_SIGNAL_CONFIRMATION',
        secondaryReasons: [`Readings passed ${readingsPassed}/${requiredReadings} requirement`]
      };
    }

    // 5. Active Contract Lock
    if (this.hasActiveContract) {
      secondary.push('Active contract currently in progress');
      return {
        canTrade: false,
        stake: 0,
        primaryReason: 'ACTIVE_CONTRACT_LOCK',
        secondaryReasons: secondary
      };
    }

    // 6. Cooldown Check
    if (this.state.cooldownActive) {
      const remainingSec = Math.ceil((this.state.cooldownEndsAt - Date.now()) / 1000);
      return {
        canTrade: false,
        stake: 0,
        primaryReason: 'COOLDOWN_ACTIVE',
        secondaryReasons: [`Cooldown active for ${remainingSec}s`]
      };
    }

    // 7. Max Auto Trades Limit Check
    if (this.settings.maxAutoTrades > 0 && this.state.executedAutoTrades >= this.settings.maxAutoTrades) {
      return {
        canTrade: false,
        stake: 0,
        primaryReason: 'MAX_AUTO_TRADES_REACHED',
        secondaryReasons: [`Límite de ${this.settings.maxAutoTrades} operaciones completado (${this.state.executedAutoTrades}/${this.settings.maxAutoTrades})`]
      };
    }

    // 8. Session Limit / Lock Check
    if (this.state.sessionLimitReached || this.state.riskLocked) {
      return {
        canTrade: false,
        stake: 0,
        primaryReason: 'SESSION_RISK_LIMIT_REACHED',
        secondaryReasons: [
          this.state.sessionPnL <= -this.settings.stopLossAmount
            ? 'Stop Loss limit reached'
            : this.state.sessionPnL >= this.settings.takeProfitAmount
            ? 'Take Profit target reached'
            : 'Session auto trade limit reached'
        ]
      };
    }

    // 9. Martingale Cap Check
    if (this.settings.maxMgSteps > 0 && this.state.mgStep > this.settings.maxMgSteps) {
      return {
        canTrade: false,
        stake: 0,
        primaryReason: 'MARTINGALE_MAX_STEP_LOCK',
        secondaryReasons: [`Current MG step ${this.state.mgStep} exceeds max step ${this.settings.maxMgSteps}`]
      };
    }

    // 10. Payout Gate
    if (payoutPercent < this.settings.minPayoutPercent) {
      return {
        canTrade: false,
        stake: 0,
        primaryReason: 'PAYOUT_BELOW_MINIMUM',
        secondaryReasons: [`Payout ${payoutPercent}% < Minimum required ${this.settings.minPayoutPercent}%`]
      };
    }

    // Calculate Martingale Stake: Base Stake * (Multiplier ^ MG Step)
    const currentStake = parseFloat(
      (this.settings.initialStake * Math.pow(this.settings.mgMultiplier, this.state.mgStep)).toFixed(2)
    );

    return {
      canTrade: true,
      stake: currentStake,
      primaryReason: 'QUALIFIED_SIGNAL',
      secondaryReasons: secondary
    };
  }

  /**
   * Called when a trade settles (WON or LOST).
   */
  public recordTradeOutcome(win: boolean, pnlAmount: number) {
    this.state.totalTrades += 1;
    this.state.sessionPnL += pnlAmount;

    if (win) {
      this.state.wins += 1;
      this.state.mgStep = 0; // Reset Martingale step on WIN
      this.state.lossStreak = 0;
    } else {
      this.state.losses += 1;
      this.state.mgStep += 1; // Increment Martingale step on LOSS
      this.state.lossStreak += 1;
    }

    // Activate Cooldown after trade
    if (this.settings.cooldownDurationSeconds > 0) {
      this.state.cooldownActive = true;
      this.state.cooldownEndsAt = Date.now() + this.settings.cooldownDurationSeconds * 1000;
    }

    // Check Stop Loss or Take Profit trigger
    if (this.state.sessionPnL <= -this.settings.stopLossAmount) {
      this.state.sessionLimitReached = true;
      this.state.riskLocked = true;
    } else if (this.state.sessionPnL >= this.settings.takeProfitAmount) {
      this.state.sessionLimitReached = true;
    }
  }

  public resetSession() {
    this.state = {
      mgStep: 0,
      lossStreak: 0,
      cooldownActive: false,
      cooldownEndsAt: 0,
      sessionLimitReached: false,
      riskLocked: false,
      currentDrawdown: 0,
      sessionPnL: 0,
      totalTrades: 0,
      executedAutoTrades: 0,
      wins: 0,
      losses: 0
    };
    this.hasActiveContract = false;
  }
}
