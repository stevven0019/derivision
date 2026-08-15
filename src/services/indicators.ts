/**
 * Technical Indicators Engine
 * Computes EMA, RSI, ADX (+DI/-DI), ATR, Bollinger Bands, and MACD for Synthetic Indices.
 */

import { CandleData, TechnicalIndicators } from '../types/trading';

export class IndicatorEngine {
  /**
   * Computes complete technical indicators from closed candle series.
   */
  public static calculate(candles: CandleData[]): TechnicalIndicators {
    if (candles.length < 30) {
      return this.getEmptyIndicators();
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const ema9 = this.calculateEMA(closes, 9);
    const ema21 = this.calculateEMA(closes, 21);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = this.calculateEMA(closes, 200);

    const rsi = this.calculateRSI(closes, 14);
    const adxObj = this.calculateADX(highs, lows, closes, 14);
    const atr = this.calculateATR(highs, lows, closes, 14);
    const bb = this.calculateBollingerBands(closes, 20, 2);
    const macd = this.calculateMACD(closes, 12, 26, 9);

    return {
      ema9,
      ema21,
      ema50,
      ema200,
      rsi,
      adx: adxObj.adx,
      plusDI: adxObj.plusDI,
      minusDI: adxObj.minusDI,
      atr,
      bbUpper: bb.upper,
      bbMiddle: bb.middle,
      bbLower: bb.lower,
      macdLine: macd.macd,
      macdSignal: macd.signal,
      macdHist: macd.histogram
    };
  }

  private static calculateEMA(series: number[], period: number): number {
    if (series.length < period) return series[series.length - 1] || 0;
    const k = 2 / (period + 1);
    // Simple SMA for first value
    let ema = series.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < series.length; i++) {
      ema = series[i] * k + ema * (1 - k);
    }
    return parseFloat(ema.toFixed(4));
  }

  private static calculateRSI(series: number[], period: number = 14): number {
    if (series.length <= period) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = series[i] - series[i - 1];
      if (change >= 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < series.length; i++) {
      const change = series[i] - series[i - 1];
      if (change >= 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return parseFloat(rsi.toFixed(2));
  }

  private static calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (closes.length <= period) return 1.0;

    const trs: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trs.push(tr);
    }

    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
    }

    return parseFloat(atr.toFixed(4));
  }

  private static calculateBollingerBands(series: number[], period: number = 20, multiplier: number = 2) {
    if (series.length < period) {
      const last = series[series.length - 1] || 0;
      return { upper: last * 1.01, middle: last, lower: last * 0.99 };
    }

    const slice = series.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: parseFloat((middle + multiplier * stdDev).toFixed(4)),
      middle: parseFloat(middle.toFixed(4)),
      lower: parseFloat((middle - multiplier * stdDev).toFixed(4))
    };
  }

  private static calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14) {
    if (closes.length <= period * 2) {
      return { adx: 25, plusDI: 20, minusDI: 20 };
    }

    const trs: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];

      const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
      const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;

      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );

      trs.push(tr);
      plusDMs.push(plusDM);
      minusDMs.push(minusDM);
    }

    // Smoothed values
    let trSmooth = trs.slice(0, period).reduce((a, b) => a + b, 0);
    let plusDMSmooth = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
    let minusDMSmooth = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

    const dxList: number[] = [];

    for (let i = period; i < trs.length; i++) {
      trSmooth = trSmooth - (trSmooth / period) + trs[i];
      plusDMSmooth = plusDMSmooth - (plusDMSmooth / period) + plusDMs[i];
      minusDMSmooth = minusDMSmooth - (minusDMSmooth / period) + minusDMs[i];

      const plusDI = (plusDMSmooth / trSmooth) * 100;
      const minusDI = (minusDMSmooth / trSmooth) * 100;
      const diDiff = Math.abs(plusDI - minusDI);
      const diSum = plusDI + minusDI;
      const dx = diSum === 0 ? 0 : (diDiff / diSum) * 100;

      dxList.push(dx);
    }

    if (dxList.length === 0) return { adx: 25, plusDI: 20, minusDI: 20 };

    let adx = dxList.slice(0, period).reduce((a, b) => a + b, 0) / Math.min(period, dxList.length);
    for (let i = period; i < dxList.length; i++) {
      adx = (adx * (period - 1) + dxList[i]) / period;
    }

    const finalPlusDI = parseFloat(((plusDMSmooth / trSmooth) * 100).toFixed(2));
    const finalMinusDI = parseFloat(((minusDMSmooth / trSmooth) * 100).toFixed(2));

    return {
      adx: parseFloat(adx.toFixed(2)),
      plusDI: isNaN(finalPlusDI) ? 20 : finalPlusDI,
      minusDI: isNaN(finalMinusDI) ? 20 : finalMinusDI
    };
  }

  private static calculateMACD(series: number[], fast: number = 12, slow: number = 26, signal: number = 9) {
    if (series.length < slow) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    const fastEMA = this.calculateEMA(series, fast);
    const slowEMA = this.calculateEMA(series, slow);
    const macdLine = fastEMA - slowEMA;

    // Build macd history slice for signal line
    const macdHistory: number[] = [];
    for (let i = slow; i <= series.length; i++) {
      const slice = series.slice(0, i);
      const f = this.calculateEMA(slice, fast);
      const s = this.calculateEMA(slice, slow);
      macdHistory.push(f - s);
    }

    const signalLine = this.calculateEMA(macdHistory, signal);
    const histogram = macdLine - signalLine;

    return {
      macd: parseFloat(macdLine.toFixed(4)),
      signal: parseFloat(signalLine.toFixed(4)),
      histogram: parseFloat(histogram.toFixed(4))
    };
  }

  private static getEmptyIndicators(): TechnicalIndicators {
    return {
      ema9: 0,
      ema21: 0,
      ema50: 0,
      ema200: 0,
      rsi: 50,
      adx: 20,
      plusDI: 20,
      minusDI: 20,
      atr: 1.0,
      bbUpper: 0,
      bbMiddle: 0,
      bbLower: 0,
      macdLine: 0,
      macdSignal: 0,
      macdHist: 0
    };
  }
}
