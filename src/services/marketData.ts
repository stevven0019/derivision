/**
 * Market Data Store & Data Quality Gate
 * Reconstructs 1-minute (M1) candles from live ticks, manages candle buffers per symbol,
 * and enforces strict Data Quality Gate rules before running technical indicators.
 */

import { SymbolCode, TickData, CandleData } from '../types/trading';

export interface DataQualityResult {
  passed: boolean;
  reason: string;
  candleCount: number;
  lastTickAgeMs: number;
}

export class MarketDataStore {
  private candleBuffers: Map<SymbolCode, CandleData[]> = new Map();
  private currentCandles: Map<SymbolCode, CandleData> = new Map();
  private lastTickEpochs: Map<SymbolCode, number> = new Map();
  private isWsConnected: boolean = false;

  public setConnectionState(connected: boolean) {
    this.isWsConnected = connected;
  }

  /**
   * Loads initial candle history from WebSocket or simulator.
   */
  public setCandleHistory(symbol: SymbolCode, candles: CandleData[]) {
    // Ensure sorted chronologically
    const sorted = [...candles].sort((a, b) => a.epoch - b.epoch);
    this.candleBuffers.set(symbol, sorted);
  }

  /**
   * Processes a live tick, updates or closes M1 candles, and returns whether a candle closed.
   */
  public ingestTick(tick: TickData): { candleClosed: boolean; currentCandle: CandleData; closedCandle?: CandleData } {
    const symbol = tick.symbol;
    this.lastTickEpochs.set(symbol, tick.epoch);

    const candleEpoch = tick.epoch - (tick.epoch % 60); // Align to M1 minute start
    let buffer = this.candleBuffers.get(symbol) || [];
    let current = this.currentCandles.get(symbol);

    let candleClosed = false;
    let closedCandle: CandleData | undefined;

    if (!current || current.epoch !== candleEpoch) {
      // New minute started! If previous candle existed, mark as closed and append to buffer
      if (current) {
        current.isClosed = true;
        candleClosed = true;
        closedCandle = { ...current };

        // Append to buffer, replacing if epoch already exists or pushing
        const existingIdx = buffer.findIndex(c => c.epoch === current!.epoch);
        if (existingIdx >= 0) {
          buffer[existingIdx] = closedCandle;
        } else {
          buffer.push(closedCandle);
        }

        // Keep buffer size around 120 candles
        if (buffer.length > 150) {
          buffer = buffer.slice(buffer.length - 120);
        }
        this.candleBuffers.set(symbol, buffer);
      }

      // Initialize new current candle
      current = {
        symbol: symbol,
        open: tick.quote,
        high: tick.quote,
        low: tick.quote,
        close: tick.quote,
        epoch: candleEpoch,
        time: new Date(candleEpoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isClosed: false
      };
    } else {
      // Update ongoing current candle
      current.high = Math.max(current.high, tick.quote);
      current.low = Math.min(current.low, tick.quote);
      current.close = tick.quote;
    }

    this.currentCandles.set(symbol, current);

    return {
      candleClosed,
      currentCandle: { ...current },
      closedCandle
    };
  }

  /**
   * Enforces Section 3: Data Quality Gate
   */
  public evaluateDataQualityGate(symbol: SymbolCode): DataQualityResult {
    const buffer = this.candleBuffers.get(symbol) || [];
    const lastTickEpoch = this.lastTickEpochs.get(symbol) || 0;
    const nowEpoch = Math.floor(Date.now() / 1000);
    const tickAgeMs = Math.max(0, (nowEpoch - lastTickEpoch) * 1000);

    if (!this.isWsConnected && tickAgeMs > 10000) {
      return {
        passed: false,
        reason: 'WS_DISCONNECTED_OR_STALE',
        candleCount: buffer.length,
        lastTickAgeMs: tickAgeMs
      };
    }

    if (buffer.length < 60) {
      return {
        passed: false,
        reason: `INSUFFICIENT_CANDLES_NEED_60_HAVE_${buffer.length}`,
        candleCount: buffer.length,
        lastTickAgeMs: tickAgeMs
      };
    }

    if (tickAgeMs > 5000) {
      return {
        passed: false,
        reason: `HIGH_LATENCY_TICK_AGE_${tickAgeMs}MS`,
        candleCount: buffer.length,
        lastTickAgeMs: tickAgeMs
      };
    }

    // Check for invalid price or chronological order
    const lastCandles = buffer.slice(-5);
    for (let i = 0; i < lastCandles.length; i++) {
      if (isNaN(lastCandles[i].close) || lastCandles[i].close <= 0) {
        return {
          passed: false,
          reason: 'INVALID_NUMERIC_PRICE_IN_CANDLE',
          candleCount: buffer.length,
          lastTickAgeMs: tickAgeMs
        };
      }
      if (i > 0 && lastCandles[i].epoch <= lastCandles[i - 1].epoch) {
        return {
          passed: false,
          reason: 'NON_CHRONOLOGICAL_CANDLES',
          candleCount: buffer.length,
          lastTickAgeMs: tickAgeMs
        };
      }
    }

    return {
      passed: true,
      reason: 'DATA_QUALITY_PASS',
      candleCount: buffer.length,
      lastTickAgeMs: tickAgeMs
    };
  }

  public getCandles(symbol: SymbolCode): CandleData[] {
    const buffer = this.candleBuffers.get(symbol) || [];
    const current = this.currentCandles.get(symbol);
    if (current) {
      return [...buffer, current];
    }
    return [...buffer];
  }

  public getClosedCandles(symbol: SymbolCode): CandleData[] {
    return this.candleBuffers.get(symbol) || [];
  }

  public getCurrentCandle(symbol: SymbolCode): CandleData | undefined {
    return this.currentCandles.get(symbol);
  }
}
