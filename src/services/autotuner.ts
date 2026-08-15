/**
 * AutoTuner & Codebase Auto-Learning Engine
 * Persists trade outcome history into LocalStorage (deriv_codebase_learning_v1).
 * Monitors signal funnel performance across rolling windows.
 * Dynamically adjusts effective entry threshold based on empirical win rates.
 * Provides JSON export/import for codebase memory backups.
 */

import { AutoTunerState } from '../types/trading';

export interface LearnedTradeRecord {
  id: string;
  timestamp: number;
  symbol: string;
  direction?: 'CALL' | 'PUT';
  rawScore: number;
  finalScore: number;
  marketState?: string;
  win?: boolean;
  profit?: number;
}

const STORAGE_KEY = 'deriv_codebase_learning_v1';

export class AutoTunerEngine {
  private samples: LearnedTradeRecord[] = [];
  private state: AutoTunerState = {
    enabled: true,
    sampleCount: 0,
    minSamples: 10,
    rollingWindow: 500,
    currentAdjustment: 0,
    status: 'OBSERVE_ONLY',
    rawAverage: 0,
    finalAverage: 0,
    compressionAlert: false,
    suggestedAction: 'Collecting learning samples...'
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.samples = parsed;
          this.recalculate();
        }
      }
    } catch (e) {
      console.warn('Failed to load codebase learning data from LocalStorage:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.samples));
    } catch (e) {
      console.warn('Failed to save codebase learning data to LocalStorage:', e);
    }
  }

  public recordDecision(rawScore: number, finalScore: number, win?: boolean, details?: Partial<LearnedTradeRecord>) {
    const record: LearnedTradeRecord = {
      id: `TRD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      symbol: details?.symbol || 'GLOBAL',
      direction: details?.direction,
      rawScore,
      finalScore,
      marketState: details?.marketState || 'UNKNOWN',
      win,
      profit: details?.profit || 0
    };

    this.samples.push(record);

    if (this.samples.length > this.state.rollingWindow) {
      this.samples.shift();
    }

    this.state.sampleCount = this.samples.length;
    this.saveToStorage();
    this.recalculate();
  }

  public recordTradeOutcome(contractId: string, win: boolean, profit: number) {
    // Find recent trade matching or attach win outcome to last trade
    for (let i = this.samples.length - 1; i >= 0; i--) {
      if (this.samples[i].win === undefined) {
        this.samples[i].win = win;
        this.samples[i].profit = profit;
        break;
      }
    }
    this.saveToStorage();
    this.recalculate();
  }

  public setEnabled(enabled: boolean) {
    this.state.enabled = enabled;
    this.recalculate();
  }

  public getState(): AutoTunerState {
    return { ...this.state };
  }

  public getLearnedWinRatesByMarketState(): Record<string, { total: number; wins: number; winRate: number }> {
    const stats: Record<string, { total: number; wins: number; winRate: number }> = {};
    
    this.samples.forEach(s => {
      if (s.win !== undefined && s.marketState) {
        if (!stats[s.marketState]) {
          stats[s.marketState] = { total: 0, wins: 0, winRate: 0 };
        }
        stats[s.marketState].total += 1;
        if (s.win) stats[s.marketState].wins += 1;
      }
    });

    Object.keys(stats).forEach(ms => {
      const item = stats[ms];
      item.winRate = item.total > 0 ? parseFloat(((item.wins / item.total) * 100).toFixed(1)) : 0;
    });

    return stats;
  }

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
      if (data && Array.isArray(data.samples)) {
        this.samples = data.samples;
        this.saveToStorage();
        this.recalculate();
        return true;
      }
    } catch (e) {
      console.error('Failed to import codebase learning data:', e);
    }
    return false;
  }

  public reset() {
    this.samples = [];
    localStorage.removeItem(STORAGE_KEY);
    this.state.sampleCount = 0;
    this.state.rawAverage = 0;
    this.state.finalAverage = 0;
    this.state.currentAdjustment = 0;
    this.state.status = 'OBSERVE_ONLY';
    this.state.compressionAlert = false;
    this.state.suggestedAction = 'Codebase learning memory reset.';
  }

  private recalculate() {
    if (this.samples.length === 0) {
      this.state.rawAverage = 0;
      this.state.finalAverage = 0;
      this.state.compressionAlert = false;
      this.state.sampleCount = 0;
      return;
    }

    const rawSum = this.samples.reduce((s, item) => s + item.rawScore, 0);
    const finalSum = this.samples.reduce((s, item) => s + item.finalScore, 0);

    const rawAvg = parseFloat((rawSum / this.samples.length).toFixed(1));
    const finalAvg = parseFloat((finalSum / this.samples.length).toFixed(1));

    this.state.rawAverage = rawAvg;
    this.state.finalAverage = finalAvg;

    // Check excessive compression: RAW avg - FINAL avg > 15
    const compressionDrop = rawAvg - finalAvg;
    this.state.compressionAlert = compressionDrop > 15;

    // Status check
    if (this.samples.length < this.state.minSamples) {
      this.state.status = 'OBSERVE_ONLY';
      this.state.currentAdjustment = 0;
      this.state.suggestedAction = `Observing... ${this.samples.length}/${this.state.minSamples} samples in codebase memory`;
      return;
    }

    if (!this.state.enabled) {
      this.state.status = 'OBSERVE_ONLY';
      this.state.currentAdjustment = 0;
      this.state.suggestedAction = 'AutoTuner disabled by user';
      return;
    }

    this.state.status = 'ACTIVE_TUNING';

    // Calculate win rate among completed trades
    const trades = this.samples.filter(s => s.win !== undefined);
    if (trades.length >= 10) {
      const wins = trades.filter(s => s.win === true).length;
      const winRate = wins / trades.length;

      if (winRate > 0.65) {
        this.state.currentAdjustment = -2; // Lower threshold slightly to capture more winning signals
        this.state.suggestedAction = `High Win Rate (${(winRate * 100).toFixed(0)}%). Adaptive threshold adjusted -2 pts.`;
      } else if (winRate < 0.48) {
        this.state.currentAdjustment = 3; // Increase threshold to filter weak trades
        this.state.suggestedAction = `Low Win Rate (${(winRate * 100).toFixed(0)}%). Adaptive threshold increased +3 pts to filter noise.`;
      } else {
        this.state.currentAdjustment = 0;
        this.state.suggestedAction = `Balanced Win Rate (${(winRate * 100).toFixed(0)}%). Base threshold optimal.`;
      }
    } else {
      this.state.currentAdjustment = 0;
      this.state.suggestedAction = `Active tuning: ${trades.length} completed trade outcomes logged in memory.`;
    }
  }
}

