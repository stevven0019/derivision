/**
 * Market State Engine
 * Classifies market structure into TREND_UP, TREND_DOWN, PULLBACK, BREAKOUT,
 * CONTINUATION, RANGE, MIXED, or UNKNOWN based on EMAs, ADX, Price Action, and BB.
 */

import { CandleData, MarketState, TechnicalIndicators } from '../types/trading';

export class MarketStateEngine {
  public static classify(candles: CandleData[], ind: TechnicalIndicators): { state: MarketState; reasoning: string } {
    if (candles.length < 20 || ind.ema21 === 0) {
      return { state: 'UNKNOWN', reasoning: 'Insufficient candles or zero EMA values' };
    }

    const currentClose = candles[candles.length - 1].close;
    const prevClose = candles[candles.length - 2].close;

    const ema9 = ind.ema9;
    const ema21 = ind.ema21;
    const ema50 = ind.ema50;
    const adx = ind.adx;
    const plusDI = ind.plusDI;
    const minusDI = ind.minusDI;

    const bbWidth = (ind.bbUpper - ind.bbLower) / ind.bbMiddle;
    const isSqueezing = bbWidth < 0.005;

    // 1. Strong Bullish Trend
    if (ema9 > ema21 && ema21 > ema50 && plusDI > minusDI + 5 && adx >= 22) {
      // Check if price pulled back into EMA 9/21 zone
      if (currentClose < ema9 && currentClose >= ema21 * 0.998) {
        return { state: 'PULLBACK', reasoning: 'Bullish pullback to EMA 9/21 support in strong uptrend' };
      }
      return { state: 'TREND_UP', reasoning: 'Clean bullish EMA alignment (9 > 21 > 50) and strong ADX' };
    }

    // 2. Strong Bearish Trend
    if (ema9 < ema21 && ema21 < ema50 && minusDI > plusDI + 5 && adx >= 22) {
      // Check for pullback
      if (currentClose > ema9 && currentClose <= ema21 * 1.002) {
        return { state: 'PULLBACK', reasoning: 'Bearish pullback to EMA 9/21 resistance in strong downtrend' };
      }
      return { state: 'TREND_DOWN', reasoning: 'Clean bearish EMA alignment (9 < 21 < 50) and strong ADX' };
    }

    // 3. Breakout Detection
    if (currentClose > ind.bbUpper && prevClose <= ind.bbUpper && adx > 20) {
      return { state: 'BREAKOUT', reasoning: 'Bullish Bollinger Band upper breakout with momentum' };
    }
    if (currentClose < ind.bbLower && prevClose >= ind.bbLower && adx > 20) {
      return { state: 'BREAKOUT', reasoning: 'Bearish Bollinger Band lower breakout with momentum' };
    }

    // 4. Ranging / Flat Market
    if (adx < 18 || isSqueezing) {
      return { state: 'RANGE', reasoning: 'Low ADX (< 18) or compressed Bollinger Bands indicate sideways consolidation' };
    }

    // 5. Continuation vs Mixed
    if (Math.abs(plusDI - minusDI) < 4 && adx >= 18 && adx <= 25) {
      return { state: 'MIXED', reasoning: 'Conflicting +DI/-DI movement with weak trend momentum' };
    }

    if (ema9 > ema21) {
      return { state: 'CONTINUATION', reasoning: 'Mild bullish bias continuing above EMA21' };
    } else if (ema9 < ema21) {
      return { state: 'CONTINUATION', reasoning: 'Mild bearish bias continuing below EMA21' };
    }

    return { state: 'UNKNOWN', reasoning: 'Undetermined market state' };
  }
}
