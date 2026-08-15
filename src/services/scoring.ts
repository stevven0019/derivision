/**
 * Signal Engine & RAW_SCORE Calculator
 * Computes individual component scores (Trend, Timing, Quality, Momentum, Market, Structure),
 * calculates CALL_SCORE and PUT_SCORE, checks minimum directional edge,
 * and outputs RAW_SCORE without any penalty or risk contamination.
 */

import { CandleData, ComponentScores, DecisionDirection, MarketQuality, MarketState, SignalScores, TechnicalIndicators } from '../types/trading';

export class ScoringEngine {
  public static readonly MIN_DIRECTION_EDGE = 15;

  public static readonly WEIGHTS = {
    trendStrength: 0.25,
    entryTiming: 0.30,
    trendQuality: 0.15,
    momentum: 0.10,
    marketQuality: 0.10,
    visionStructure: 0.10
  };

  /**
   * Evaluates signal components and calculates CALL_SCORE, PUT_SCORE, and RAW_SCORE.
   */
  public static calculateSignal(
    candles: CandleData[],
    ind: TechnicalIndicators,
    marketState: MarketState,
    marketQuality: MarketQuality
  ): SignalScores {
    if (candles.length < 10 || marketState === 'UNKNOWN' || !marketQuality.dataQualityPass) {
      return {
        callScore: 0,
        putScore: 0,
        rawScore: 0,
        direction: 'NO_TRADE',
        edge: 0,
        components: {
          trendStrength: 0,
          entryTiming: 0,
          trendQuality: 0,
          momentum: 0,
          marketQuality: 0,
          visionStructure: 0
        }
      };
    }

    const current = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    // --- CALL SCORE COMPONENTS ---
    const callTrendStrength = this.getCallTrendStrength(ind, marketState);
    const callEntryTiming = this.getCallEntryTiming(current, prev, ind);
    const callTrendQuality = this.getCallTrendQuality(ind);
    const callMomentum = this.getCallMomentum(ind);
    const mktQualScore = marketQuality.score; // 0-100
    const callStructure = this.getCallStructure(candles, ind);

    const callComponents: ComponentScores = {
      trendStrength: callTrendStrength,
      entryTiming: callEntryTiming,
      trendQuality: callTrendQuality,
      momentum: callMomentum,
      marketQuality: mktQualScore,
      visionStructure: callStructure
    };

    const callScore = Math.round(
      callComponents.trendStrength * this.WEIGHTS.trendStrength +
      callComponents.entryTiming * this.WEIGHTS.entryTiming +
      callComponents.trendQuality * this.WEIGHTS.trendQuality +
      callComponents.momentum * this.WEIGHTS.momentum +
      callComponents.marketQuality * this.WEIGHTS.marketQuality +
      callComponents.visionStructure * this.WEIGHTS.visionStructure
    );

    // --- PUT SCORE COMPONENTS ---
    const putTrendStrength = this.getPutTrendStrength(ind, marketState);
    const putEntryTiming = this.getPutEntryTiming(current, prev, ind);
    const putTrendQuality = this.getPutTrendQuality(ind);
    const putMomentum = this.getPutMomentum(ind);
    const putStructure = this.getPutStructure(candles, ind);

    const putComponents: ComponentScores = {
      trendStrength: putTrendStrength,
      entryTiming: putEntryTiming,
      trendQuality: putTrendQuality,
      momentum: putMomentum,
      marketQuality: mktQualScore,
      visionStructure: putStructure
    };

    const putScore = Math.round(
      putComponents.trendStrength * this.WEIGHTS.trendStrength +
      putComponents.entryTiming * this.WEIGHTS.entryTiming +
      putComponents.trendQuality * this.WEIGHTS.trendQuality +
      putComponents.momentum * this.WEIGHTS.momentum +
      putComponents.marketQuality * this.WEIGHTS.marketQuality +
      putComponents.visionStructure * this.WEIGHTS.visionStructure
    );

    const edge = Math.abs(callScore - putScore);

    let direction: DecisionDirection = 'NO_TRADE';
    let chosenComponents = callComponents;
    let rawScore = Math.max(callScore, putScore);

    if (edge < this.MIN_DIRECTION_EDGE) {
      direction = 'NO_TRADE';
    } else if (callScore > putScore) {
      direction = 'CALL';
      chosenComponents = callComponents;
      rawScore = callScore;
    } else {
      direction = 'PUT';
      chosenComponents = putComponents;
      rawScore = putScore;
    }

    return {
      callScore,
      putScore,
      rawScore,
      direction,
      edge,
      components: chosenComponents
    };
  }

  // --- Component Score Calculation Helpers ---

  private static getCallTrendStrength(ind: TechnicalIndicators, state: MarketState): number {
    let score = 50;
    if (state === 'TREND_UP' || state === 'CONTINUATION') score += 30;
    if (state === 'PULLBACK') score += 25;
    if (ind.ema9 > ind.ema21) score += 10;
    if (ind.ema21 > ind.ema50) score += 10;
    if (ind.plusDI > ind.minusDI) score += 10;
    return Math.min(100, score);
  }

  private static getPutTrendStrength(ind: TechnicalIndicators, state: MarketState): number {
    let score = 50;
    if (state === 'TREND_DOWN' || state === 'CONTINUATION') score += 30;
    if (state === 'PULLBACK') score += 25;
    if (ind.ema9 < ind.ema21) score += 10;
    if (ind.ema21 < ind.ema50) score += 10;
    if (ind.minusDI > ind.plusDI) score += 10;
    return Math.min(100, score);
  }

  private static getCallEntryTiming(current: CandleData, prev: CandleData, ind: TechnicalIndicators): number {
    let score = 60;
    // Bullish candle close above EMA 9
    if (current.close > ind.ema9 && current.close > current.open) score += 20;
    // Bouncing off EMA 21 or BB Lower
    if (current.low <= ind.ema21 * 1.001 && current.close > ind.ema21) score += 20;
    // RSI in bullish sweet spot (45 - 65)
    if (ind.rsi >= 45 && ind.rsi <= 65) score += 10;
    return Math.min(100, score);
  }

  private static getPutEntryTiming(current: CandleData, prev: CandleData, ind: TechnicalIndicators): number {
    let score = 60;
    // Bearish candle close below EMA 9
    if (current.close < ind.ema9 && current.close < current.open) score += 20;
    // Rejecting off EMA 21 or BB Upper
    if (current.high >= ind.ema21 * 0.999 && current.close < ind.ema21) score += 20;
    // RSI in bearish sweet spot (35 - 55)
    if (ind.rsi >= 35 && ind.rsi <= 55) score += 10;
    return Math.min(100, score);
  }

  private static getCallTrendQuality(ind: TechnicalIndicators): number {
    let score = 50;
    if (ind.adx >= 25) score += 30;
    if (ind.adx >= 35) score += 10;
    if (ind.ema9 - ind.ema21 > 0) score += 10;
    return Math.min(100, score);
  }

  private static getPutTrendQuality(ind: TechnicalIndicators): number {
    let score = 50;
    if (ind.adx >= 25) score += 30;
    if (ind.adx >= 35) score += 10;
    if (ind.ema21 - ind.ema9 > 0) score += 10;
    return Math.min(100, score);
  }

  private static getCallMomentum(ind: TechnicalIndicators): number {
    let score = 50;
    if (ind.macdHist > 0) score += 25;
    if (ind.macdLine > ind.macdSignal) score += 25;
    return Math.min(100, score);
  }

  private static getPutMomentum(ind: TechnicalIndicators): number {
    let score = 50;
    if (ind.macdHist < 0) score += 25;
    if (ind.macdLine < ind.macdSignal) score += 25;
    return Math.min(100, score);
  }

  private static getCallStructure(candles: CandleData[], ind: TechnicalIndicators): number {
    if (candles.length < 5) return 60;
    const last3 = candles.slice(-3);
    const makingHigherLows = last3[2].low > last3[1].low && last3[1].low >= last3[0].low;
    return makingHigherLows ? 85 : 55;
  }

  private static getPutStructure(candles: CandleData[], ind: TechnicalIndicators): number {
    if (candles.length < 5) return 60;
    const last3 = candles.slice(-3);
    const makingLowerHighs = last3[2].high < last3[1].high && last3[1].high <= last3[0].high;
    return makingLowerHighs ? 85 : 55;
  }
}
