/**
 * Market Quality Engine
 * Evaluates ADX, ATR volatility, tick latency, payout percent, and price anomalies
 * to calculate a Market Quality Score (0-100).
 */

import { MarketQuality, TechnicalIndicators } from '../types/trading';

export class MarketQualityEngine {
  public static evaluate(
    ind: TechnicalIndicators,
    payoutPercent: number = 85,
    latencyMs: number = 150,
    dataQualityPass: boolean = true
  ): MarketQuality {
    const reasons: string[] = [];

    // 1. ADX Trend Strength Component (0-30)
    let adxScore = 0;
    if (ind.adx >= 25 && ind.adx <= 60) {
      adxScore = 30;
    } else if (ind.adx >= 18) {
      adxScore = 20;
    } else if (ind.adx > 60) {
      adxScore = 15; // Extreme ADX can be overextended
      reasons.push('ADX > 60 (Extreme trend, watch out for sudden reversal)');
    } else {
      adxScore = 5;
      reasons.push('Low ADX (< 18, Weak directional strength)');
    }

    // 2. Volatility Stability Component (0-30) based on ATR vs BB
    let volatilityScore = 25;
    if (ind.atr <= 0 || isNaN(ind.atr)) {
      volatilityScore = 5;
      reasons.push('Invalid ATR reading');
    } else if (ind.atr > ind.bbMiddle * 0.05) {
      volatilityScore = 10;
      reasons.push('High ATR spike (Excessive market noise)');
    }

    // 3. Payout Percent (0-20)
    let payoutScore = 20;
    if (payoutPercent < 75) {
      payoutScore = 5;
      reasons.push(`Low payout percentage (${payoutPercent}% < 75%)`);
    } else if (payoutPercent < 80) {
      payoutScore = 12;
    }

    // 4. Latency / Network Quality (0-20)
    let latencyScore = 20;
    if (latencyMs > 2000) {
      latencyScore = 0;
      reasons.push(`High WebSocket latency (${latencyMs}ms > 2000ms)`);
    } else if (latencyMs > 800) {
      latencyScore = 10;
      reasons.push(`Moderate latency (${latencyMs}ms)`);
    }

    if (!dataQualityPass) {
      reasons.push('Data Quality Gate failed');
    }

    const totalScore = dataQualityPass ? (adxScore + volatilityScore + payoutScore + latencyScore) : 0;

    return {
      score: totalScore,
      adxStrength: adxScore,
      volatilityStability: volatilityScore,
      payoutPercent,
      latencyMs,
      dataQualityPass,
      reasons
    };
  }
}
