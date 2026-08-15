/**
 * Sequential Readings Confirmation Manager (1/4 -> 4/4)
 * Enforces multi-step signal confirmation before trade execution.
 * Prevents premature entries by verifying candle continuity.
 */

import { DecisionDirection, MarketState, ReadingStep } from '../types/trading';

export class ReadingsManager {
  private activeCandidate: {
    symbol: string;
    direction: DecisionDirection;
    readings: ReadingStep[];
    status: 'ACTIVE' | 'CONFIRMED' | 'INVALIDATED';
  } | null = null;

  public processReading(
    symbol: string,
    candleEpoch: number,
    finalScore: number,
    effectiveThreshold: number,
    marketState: MarketState,
    direction: DecisionDirection
  ): { readingsPassed: number; confirmed: boolean; invalidated: boolean; reason: string } {
    const isPassing = direction !== 'NO_TRADE' && finalScore >= effectiveThreshold;

    if (!isPassing) {
      if (this.activeCandidate && this.activeCandidate.symbol === symbol) {
        this.activeCandidate.status = 'INVALIDATED';
        const passedCount = this.activeCandidate.readings.length;
        this.activeCandidate = null;
        return {
          readingsPassed: 0,
          confirmed: false,
          invalidated: true,
          reason: `Signal condition deteriorated at reading ${passedCount + 1}`
        };
      }
      return { readingsPassed: 0, confirmed: false, invalidated: false, reason: 'No active candidate' };
    }

    // New candidate initiation
    if (!this.activeCandidate || this.activeCandidate.symbol !== symbol || this.activeCandidate.direction !== direction) {
      const step1: ReadingStep = {
        readingNumber: 1,
        candleEpoch,
        candidateScore: finalScore,
        effectiveThreshold,
        marketState,
        direction,
        passed: true,
        timestamp: Date.now()
      };

      this.activeCandidate = {
        symbol,
        direction,
        readings: [step1],
        status: 'ACTIVE'
      };

      return {
        readingsPassed: 1,
        confirmed: false,
        invalidated: false,
        reason: 'Candidate reading 1/4 established'
      };
    }

    // Check if candle epoch changed (to avoid double-counting within same minute)
    const lastReading = this.activeCandidate.readings[this.activeCandidate.readings.length - 1];
    if (lastReading.candleEpoch === candleEpoch) {
      return {
        readingsPassed: this.activeCandidate.readings.length,
        confirmed: this.activeCandidate.readings.length >= 4,
        invalidated: false,
        reason: `Within same candle epoch (${this.activeCandidate.readings.length}/4)`
      };
    }

    // Increment confirmation step
    const nextStepNum = this.activeCandidate.readings.length + 1;
    const nextStep: ReadingStep = {
      readingNumber: nextStepNum,
      candleEpoch,
      candidateScore: finalScore,
      effectiveThreshold,
      marketState,
      direction,
      passed: true,
      timestamp: Date.now()
    };

    this.activeCandidate.readings.push(nextStep);

    if (nextStepNum >= 4) {
      this.activeCandidate.status = 'CONFIRMED';
      return {
        readingsPassed: 4,
        confirmed: true,
        invalidated: false,
        reason: 'Signal 4/4 fully confirmed!'
      };
    }

    return {
      readingsPassed: nextStepNum,
      confirmed: false,
      invalidated: false,
      reason: `Confirmation reading ${nextStepNum}/4 passed`
    };
  }

  public getReadingsCount(): number {
    return this.activeCandidate?.readings.length || 0;
  }

  public reset() {
    this.activeCandidate = null;
  }
}
