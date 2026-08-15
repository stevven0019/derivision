/**
 * Single Effective Threshold Manager
 * Manages BASE_THRESHOLD per market state and calculates EFFECTIVE_THRESHOLD.
 * Enforces RULE 01: A single effective threshold governs trade decisions.
 */

import { MarketState, ThresholdConfig } from '../types/trading';

export class ThresholdEngine {
  public static readonly DEFAULT_CONFIG: ThresholdConfig = {
    baseThresholds: {
      TREND_UP: 64,
      TREND_DOWN: 64,
      PULLBACK: 62,
      BREAKOUT: 68,
      CONTINUATION: 64,
      RANGE: 72,
      MIXED: 75,
      UNKNOWN: 999
    },
    minThreshold: 60,
    maxThreshold: 78,
    maxAdjustmentPerCycle: 2
  };

  /**
   * Calculates BASE_THRESHOLD, ADAPTIVE_ADJUSTMENT, and EFFECTIVE_THRESHOLD.
   */
  public static calculateEffectiveThreshold(
    marketState: MarketState,
    adaptiveAdjustment: number = 0,
    customConfig?: Partial<ThresholdConfig>
  ): { baseThreshold: number; adaptiveAdjustment: number; effectiveThreshold: number } {
    const config = { ...this.DEFAULT_CONFIG, ...customConfig };
    const baseThreshold = config.baseThresholds[marketState] ?? 64;

    if (marketState === 'UNKNOWN') {
      return { baseThreshold: 999, adaptiveAdjustment: 0, effectiveThreshold: 999 };
    }

    // Clamp adaptive adjustment between -5 and +5
    const clampedAdjustment = Math.max(-5, Math.min(5, Math.round(adaptiveAdjustment)));
    
    // Calculate raw effective threshold
    const rawEffective = baseThreshold + clampedAdjustment;

    // Bound effective threshold between min and max config bounds
    const effectiveThreshold = Math.max(config.minThreshold, Math.min(config.maxThreshold, rawEffective));

    return {
      baseThreshold,
      adaptiveAdjustment: clampedAdjustment,
      effectiveThreshold
    };
  }

  /**
   * Evaluates if final score satisfies the single effective threshold.
   */
  public static satisfiesThreshold(finalScore: number, effectiveThreshold: number): boolean {
    return finalScore >= effectiveThreshold;
  }
}
