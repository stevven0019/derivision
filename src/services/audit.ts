/**
 * Audit & Contradiction Detector Engine
 * Inspects all decisions, scores, and execution states to detect mathematical contradictions.
 * Guarantees mathematical invariants as specified in Section 17 of the skill document.
 */

import { ContradictionError, DecisionRecord, FunnelStats } from '../types/trading';

export class AuditEngine {
  private static errorLog: ContradictionError[] = [];

  public static auditDecision(record: DecisionRecord): ContradictionError[] {
    const errors: ContradictionError[] = [];
    const timestamp = Date.now();
    const timeString = new Date().toLocaleTimeString();

    // 1. Invariant 1: FINAL_SCORE cannot exceed RAW_SCORE
    if (record.finalScore > record.rawScore) {
      errors.push({
        id: `ERR_${timestamp}_1`,
        timestamp,
        timeString,
        code: 'FINAL_SCORE_EXCEEDS_RAW_SCORE',
        message: `FINAL_SCORE (${record.finalScore}) exceeds RAW_SCORE (${record.rawScore})`,
        severity: 'CRITICAL',
        details: { finalScore: record.finalScore, rawScore: record.rawScore }
      });
    }

    // 2. Invariant 2: Correct Penalty Subtraction
    const expectedFinal = Math.max(0, record.rawScore - record.penaltyTotal);
    if (record.finalScore !== expectedFinal) {
      errors.push({
        id: `ERR_${timestamp}_2`,
        timestamp,
        timeString,
        code: 'PENALTY_SUBTRACTION_MISMATCH',
        message: `FINAL_SCORE (${record.finalScore}) does not match RAW_SCORE (${record.rawScore}) - PENALTY_TOTAL (${record.penaltyTotal})`,
        severity: 'CRITICAL',
        details: { expectedFinal, actualFinal: record.finalScore }
      });
    }

    // 3. Invariant 3: Decision Contradiction
    if (
      record.finalScore >= record.effectiveThreshold &&
      record.decision === 'NO_TRADE' &&
      record.callScore !== record.putScore &&
      Math.abs(record.callScore - record.putScore) >= 15
    ) {
      errors.push({
        id: `ERR_${timestamp}_3`,
        timestamp,
        timeString,
        code: 'DECISION_CONTRADICTION',
        message: `FINAL_SCORE (${record.finalScore}) >= EFFECTIVE_THRESHOLD (${record.effectiveThreshold}) but decision is NO_TRADE`,
        severity: 'CRITICAL',
        details: { finalScore: record.finalScore, effectiveThreshold: record.effectiveThreshold, decision: record.decision }
      });
    }

    // 4. Invariant 4: Threshold Range Bound
    if (record.effectiveThreshold < 55 || record.effectiveThreshold > 85) {
      if (record.marketState !== 'UNKNOWN') {
        errors.push({
          id: `ERR_${timestamp}_4`,
          timestamp,
          timeString,
          code: 'THRESHOLD_OUT_OF_RANGE',
          message: `EFFECTIVE_THRESHOLD (${record.effectiveThreshold}) is outside safe boundaries [55-85]`,
          severity: 'WARNING',
          details: { effectiveThreshold: record.effectiveThreshold, marketState: record.marketState }
        });
      }
    }

    // 5. Invariant 5: RAW vs FINAL without penalties mismatch
    if (record.rawScore > record.finalScore && record.penaltyTotal === 0) {
      errors.push({
        id: `ERR_${timestamp}_5`,
        timestamp,
        timeString,
        code: 'RAW_EXCEEDS_FINAL_WITHOUT_PENALTIES',
        message: `RAW_SCORE (${record.rawScore}) > FINAL_SCORE (${record.finalScore}) despite PENALTY_TOTAL = 0`,
        severity: 'CRITICAL',
        details: { rawScore: record.rawScore, finalScore: record.finalScore, penaltyTotal: record.penaltyTotal }
      });
    }

    if (errors.length > 0) {
      this.errorLog.unshift(...errors);
      if (this.errorLog.length > 100) {
        this.errorLog = this.errorLog.slice(0, 100);
      }
    }

    return errors;
  }

  public static auditFunnelStats(stats: FunnelStats): ContradictionError[] {
    const errors: ContradictionError[] = [];
    const timestamp = Date.now();
    const timeString = new Date().toLocaleTimeString();

    // Funnel invariant: count(FINAL >= X) <= count(RAW >= X)
    if (stats.finalScoreAboveEffective > stats.rawScoreAboveBase) {
      errors.push({
        id: `ERR_FUNNEL_${timestamp}`,
        timestamp,
        timeString,
        code: 'FUNNEL_INVARIANT_CONTRADICTION',
        message: `FINAL_SCORE pass count (${stats.finalScoreAboveEffective}) exceeds RAW_SCORE pass count (${stats.rawScoreAboveBase})`,
        severity: 'CRITICAL',
        details: { finalPass: stats.finalScoreAboveEffective, rawPass: stats.rawScoreAboveBase }
      });
    }

    if (stats.executedTrades > stats.riskGateApproved) {
      errors.push({
        id: `ERR_EXEC_${timestamp}`,
        timestamp,
        timeString,
        code: 'EXECUTION_COUNT_CONTRADICTION',
        message: `Executed trades count (${stats.executedTrades}) exceeds Risk Gate approved count (${stats.riskGateApproved})`,
        severity: 'CRITICAL',
        details: { executed: stats.executedTrades, approved: stats.riskGateApproved }
      });
    }

    if (errors.length > 0) {
      this.errorLog.unshift(...errors);
    }

    return errors;
  }

  public static getErrorLog(): ContradictionError[] {
    return [...this.errorLog];
  }

  public static clearLogs() {
    this.errorLog = [];
  }
}
