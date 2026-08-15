/**
 * Penalty Engine
 * Calculates explicit, auditable penalties based on technical conflicts and poor timing.
 * Enforces FINAL_SCORE = RAW_SCORE - PENALTY_TOTAL (capped at MAX_PENALTY = 15).
 * Guaranteed Invariant: FINAL_SCORE <= RAW_SCORE.
 */

import { CandleData, DecisionDirection, PenaltyItem, TechnicalIndicators } from '../types/trading';

export interface PenaltyResult {
  penalties: PenaltyItem[];
  penaltyTotal: number;
  finalScore: number;
}

export class PenaltyEngine {
  public static readonly DEFAULT_MAX_PENALTY = 15;

  public static evaluate(
    rawScore: number,
    direction: DecisionDirection,
    candles: CandleData[],
    ind: TechnicalIndicators,
    latencyMs: number = 100,
    maxPenalty: number = PenaltyEngine.DEFAULT_MAX_PENALTY
  ): PenaltyResult {
    if (direction === 'NO_TRADE' || rawScore === 0 || candles.length === 0) {
      return {
        penalties: [],
        penaltyTotal: 0,
        finalScore: 0
      };
    }

    const current = candles[candles.length - 1];
    const penalties: PenaltyItem[] = [];

    // 1. Weak Trend Penalty (ADX < 20)
    if (ind.adx < 20) {
      penalties.push({
        name: 'weakTrend',
        description: `ADX is weak (${ind.adx} < 20)`,
        points: 4
      });
    }

    // 2. Conflicting Indicators Penalty (RSI / MACD divergence)
    if (direction === 'CALL') {
      if (ind.rsi > 70) {
        penalties.push({
          name: 'conflictingIndicators',
          description: `RSI Overbought (${ind.rsi} > 70) on CALL signal`,
          points: 5
        });
      }
      if (ind.macdHist < 0) {
        penalties.push({
          name: 'conflictingIndicators',
          description: 'MACD Histogram is negative on CALL signal',
          points: 3
        });
      }
    } else if (direction === 'PUT') {
      if (ind.rsi < 30) {
        penalties.push({
          name: 'conflictingIndicators',
          description: `RSI Oversold (${ind.rsi} < 30) on PUT signal`,
          points: 5
        });
      }
      if (ind.macdHist > 0) {
        penalties.push({
          name: 'conflictingIndicators',
          description: 'MACD Histogram is positive on PUT signal',
          points: 3
        });
      }
    }

    // 3. Extreme Price Extension (Far from EMA 21 or BB outer limit)
    const distFromEma21 = Math.abs(current.close - ind.ema21) / ind.ema21;
    if (distFromEma21 > 0.015) {
      penalties.push({
        name: 'extremeExtension',
        description: `Price overextended from EMA 21 (${(distFromEma21 * 100).toFixed(2)}% > 1.5%)`,
        points: 4
      });
    }

    // 4. Poor Entry Timing (Wick Rejection against trade direction)
    const candleRange = Math.max(0.0001, current.high - current.low);
    const upperWick = current.high - Math.max(current.open, current.close);
    const lowerWick = Math.min(current.open, current.close) - current.low;

    if (direction === 'CALL' && upperWick / candleRange > 0.45) {
      penalties.push({
        name: 'poorTiming',
        description: `Upper wick rejection (${Math.round((upperWick / candleRange) * 100)}%) against CALL`,
        points: 4
      });
    } else if (direction === 'PUT' && lowerWick / candleRange > 0.45) {
      penalties.push({
        name: 'poorTiming',
        description: `Lower wick rejection (${Math.round((lowerWick / candleRange) * 100)}%) against PUT`,
        points: 4
      });
    }

    // 5. Market Instability / Network Latency
    if (latencyMs > 1000) {
      penalties.push({
        name: 'marketInstability',
        description: `Elevated execution latency (${latencyMs}ms)`,
        points: 3
      });
    }

    // Sum points and cap at maxPenalty
    const calculatedPenalty = penalties.reduce((sum, p) => sum + p.points, 0);
    const penaltyTotal = Math.min(calculatedPenalty, maxPenalty);

    // FINAL_SCORE = RAW_SCORE - PENALTY_TOTAL
    const finalScore = Math.max(0, rawScore - penaltyTotal);

    return {
      penalties,
      penaltyTotal,
      finalScore
    };
  }
}
