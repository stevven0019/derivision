/**
 * ScoreCard Component
 * Displays RAW_SCORE, explicit PENALTY_TOTAL, FINAL_SCORE, and single EFFECTIVE_THRESHOLD.
 * Displays 1/4 -> 4/4 Sequential confirmation progress and direction edge.
 */

import React from 'react';
import { DecisionRecord, PenaltyItem, SignalScores, TechnicalIndicators } from '../types/trading';
import { Target, TrendingUp, TrendingDown, AlertOctagon, ShieldAlert, CheckCircle2, ArrowRight, Activity } from 'lucide-react';

interface ScoreCardProps {
  decision: DecisionRecord;
  signalScores: SignalScores;
  indicators: TechnicalIndicators;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  decision,
  signalScores,
  indicators
}) => {
  const isCall = decision.decision === 'CALL';
  const isPut = decision.decision === 'PUT';
  const isNoTrade = decision.decision === 'NO_TRADE';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* CARD 1: Signal Direction & RAW SCORE Breakdown */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Signal Direction & Edge</span>
            <span className="text-xs font-mono text-slate-400">State: <strong className="text-slate-200">{decision.marketState}</strong></span>
          </div>

          {/* Direction Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-lg ${
              isCall ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' :
              isPut ? 'bg-rose-950/80 text-rose-400 border-rose-800' :
              'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {isCall && <TrendingUp className="w-6 h-6" />}
              {isPut && <TrendingDown className="w-6 h-6" />}
              {isNoTrade && <AlertOctagon className="w-6 h-6 text-slate-400" />}
              <span>{decision.decision}</span>
            </div>

            {/* Edge */}
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Directional Edge</div>
              <div className={`text-base font-bold font-mono ${signalScores.edge >= 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {signalScores.edge} pts {signalScores.edge < 15 && '(Edge < 15)'}
              </div>
            </div>
          </div>

          {/* CALL vs PUT Score Comparison Bars */}
          <div className="space-y-2 text-xs font-mono mb-4">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>CALL SCORE</span>
                <span className="font-bold text-emerald-400">{decision.callScore} / 100</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${decision.callScore}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>PUT SCORE</span>
                <span className="font-bold text-rose-400">{decision.putScore} / 100</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all duration-300" style={{ width: `${decision.putScore}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* RAW SCORE Box */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">RAW SCORE (Pure Evidence)</div>
            <div className="text-xs text-slate-500">Uncontaminated by risk or MG</div>
          </div>
          <div className="text-2xl font-black font-mono text-sky-400">{decision.rawScore}</div>
        </div>
      </div>

      {/* CARD 2: Penalty Engine & Audit Items */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Explicit Penalty Engine</span>
            <span className="text-xs font-mono text-amber-400">Max Penalty Cap: -15</span>
          </div>

          {/* Penalty Items List */}
          <div className="space-y-2 mb-4">
            {decision.penalties.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-slate-950/60 rounded-lg text-emerald-400 text-xs border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero penalties applied. Pristine market alignment!</span>
              </div>
            ) : (
              decision.penalties.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-rose-950/30 rounded border border-rose-900/50 text-xs">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span className="text-slate-200 font-medium">{p.name}</span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">({p.description})</span>
                  </div>
                  <span className="font-mono font-bold text-rose-400">-{p.points}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Penalty Total & Final Score calculation */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">TOTAL PENALTY DEDUCTION</div>
            <div className="text-xs text-rose-400 font-mono">-{decision.penaltyTotal} Points</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">FINAL SCORE</div>
            <div className="text-2xl font-black font-mono text-emerald-400">{decision.finalScore}</div>
          </div>
        </div>
      </div>

      {/* CARD 3: Single EFFECTIVE THRESHOLD & Sequential Confirmation */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Single Effective Threshold</span>
            <span className="text-xs font-mono text-emerald-400">Rule 01 Enforced</span>
          </div>

          {/* Threshold Formula Breakdown */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 mb-4 font-mono text-xs">
            <div className="flex justify-between text-slate-300">
              <span>BASE THRESHOLD ({decision.marketState})</span>
              <span className="font-bold">{decision.baseThreshold}</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>ADAPTIVE ADJUSTMENT</span>
              <span className={`font-bold ${decision.thresholdAdjustment >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {decision.thresholdAdjustment >= 0 ? `+${decision.thresholdAdjustment}` : decision.thresholdAdjustment}
              </span>
            </div>

            <div className="border-t border-slate-800 pt-1.5 flex justify-between text-slate-100 text-sm font-bold">
              <span className="text-emerald-400">EFFECTIVE THRESHOLD</span>
              <span className="text-emerald-400 text-lg">{decision.effectiveThreshold}</span>
            </div>
          </div>

          {/* Sequential Confirmation (1/4 -> 4/4) */}
          <div className="mb-3">
            <div className="flex justify-between items-center text-xs text-slate-300 mb-1.5 font-semibold">
              <span>Sequential Confirmation (1/4 → 4/4)</span>
              <span className="font-mono text-emerald-400">{decision.readingsPassed} / 4 Passed</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((step) => {
                const passed = decision.readingsPassed >= step;
                return (
                  <div
                    key={step}
                    className={`py-1.5 rounded text-center text-xs font-bold font-mono transition-all ${
                      passed
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    READ {step}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trade Qualification Gate Result */}
        <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
          decision.canTrade 
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
            : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div>
            <div className="font-bold text-slate-200">Execution Qualification</div>
            <div className="text-[11px] font-mono">{decision.primaryReason}</div>
          </div>

          <div className={`px-2.5 py-1 rounded font-bold text-xs ${decision.canTrade ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {decision.canTrade ? 'APPROVED' : 'BLOCKED'}
          </div>
        </div>
      </div>
    </div>
  );
};
