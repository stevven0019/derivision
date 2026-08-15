/**
 * Telemetry & Funnel Recording Engine
 * Maintains auditable records of all signal decisions and funnel statistics.
 */

import { DecisionRecord, FunnelStats } from '../types/trading';

export class TelemetryEngine {
  private history: DecisionRecord[] = [];
  private stats: FunnelStats = {
    ticksReceived: 0,
    validDataTicks: 0,
    candlesReconstructed: 0,
    validMarketState: 0,
    validMarketQuality: 0,
    validDirectionEdge: 0,
    rawScoreCalculated: 0,
    rawScoreAboveBase: 0,
    penaltiesApplied: 0,
    finalScoreCalculated: 0,
    finalScoreAboveEffective: 0,
    sequentialReadingsPassed: 0,
    payoutGatePassed: 0,
    riskGateApproved: 0,
    executedTrades: 0
  };

  public recordTick(valid: boolean) {
    this.stats.ticksReceived++;
    if (valid) this.stats.validDataTicks++;
  }

  public recordCandleClose() {
    this.stats.candlesReconstructed++;
  }

  public logDecision(record: DecisionRecord) {
    this.history.unshift(record);
    if (this.history.length > 300) {
      this.history.pop();
    }

    // Update Funnel Stats counters
    if (record.marketState !== 'UNKNOWN') this.stats.validMarketState++;
    if (record.rawScore > 0) this.stats.validMarketQuality++;
    if (record.decision !== 'NO_TRADE' || Math.abs(record.callScore - record.putScore) >= 15) this.stats.validDirectionEdge++;
    if (record.rawScore > 0) this.stats.rawScoreCalculated++;
    if (record.rawScore >= record.baseThreshold) this.stats.rawScoreAboveBase++;
    if (record.penaltyTotal > 0) this.stats.penaltiesApplied++;
    if (record.finalScore > 0) this.stats.finalScoreCalculated++;
    if (record.finalScore >= record.effectiveThreshold) this.stats.finalScoreAboveEffective++;
    if (record.readingsPassed >= 1) this.stats.sequentialReadingsPassed++;
    if (record.primaryReason !== 'PAYOUT_BELOW_MINIMUM') this.stats.payoutGatePassed++;
    if (record.canTrade) this.stats.riskGateApproved++;
  }

  public recordExecution() {
    this.stats.executedTrades++;
  }

  public getHistory(): DecisionRecord[] {
    return [...this.history];
  }

  public getFunnelStats(): FunnelStats {
    return { ...this.stats };
  }

  public exportJSON(): string {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      stats: this.stats,
      history: this.history
    }, null, 2);
  }

  public exportCSV(): string {
    if (this.history.length === 0) return 'No data';
    const headers = [
      'decisionId', 'timeString', 'symbol', 'marketState',
      'callScore', 'putScore', 'rawScore', 'penaltyTotal', 'finalScore',
      'baseThreshold', 'effectiveThreshold', 'decision', 'canTrade', 'primaryReason'
    ];
    const rows = this.history.map(d => [
      d.decisionId, d.timeString, d.symbol, d.marketState,
      d.callScore, d.putScore, d.rawScore, d.penaltyTotal, d.finalScore,
      d.baseThreshold, d.effectiveThreshold, d.decision, d.canTrade, `"${d.primaryReason}"`
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  public resetStats() {
    this.stats = {
      ticksReceived: 0,
      validDataTicks: 0,
      candlesReconstructed: 0,
      validMarketState: 0,
      validMarketQuality: 0,
      validDirectionEdge: 0,
      rawScoreCalculated: 0,
      rawScoreAboveBase: 0,
      penaltiesApplied: 0,
      finalScoreCalculated: 0,
      finalScoreAboveEffective: 0,
      sequentialReadingsPassed: 0,
      payoutGatePassed: 0,
      riskGateApproved: 0,
      executedTrades: 0
    };
    this.history = [];
  }
}
