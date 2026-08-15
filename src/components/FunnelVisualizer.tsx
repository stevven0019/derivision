/**
 * FunnelVisualizer Component
 * Displays the complete 15-step Deriv Adaptive Funnel with step counters,
 * drop-off percentages, and mathematical invariant verification.
 */

import React from 'react';
import { FunnelStats } from '../types/trading';
import { Filter, CheckCircle2, AlertTriangle, ShieldCheck, ArrowDown } from 'lucide-react';

interface FunnelVisualizerProps {
  stats: FunnelStats;
  currentRawScore: number;
  currentFinalScore: number;
  currentEffectiveThreshold: number;
}

export const FunnelVisualizer: React.FC<FunnelVisualizerProps> = ({
  stats,
  currentRawScore,
  currentFinalScore,
  currentEffectiveThreshold
}) => {
  // Invariant validation: count(FINAL_SCORE >= X) <= count(RAW_SCORE >= X)
  const isInvariantValid = stats.finalScoreAboveEffective <= stats.rawScoreAboveBase;

  const funnelSteps = [
    { label: '1. Ingested Ticks', count: stats.ticksReceived, color: 'bg-slate-700' },
    { label: '2. Data Quality Gate', count: stats.validDataTicks, color: 'bg-slate-700' },
    { label: '3. M1 Candles Reconstructed', count: stats.candlesReconstructed, color: 'bg-slate-700' },
    { label: '4. Valid Market State', count: stats.validMarketState, color: 'bg-indigo-950 text-indigo-300' },
    { label: '5. Market Quality Gate', count: stats.validMarketQuality, color: 'bg-indigo-900 text-indigo-200' },
    { label: '6. Direction Edge (≥ 15pts)', count: stats.validDirectionEdge, color: 'bg-sky-950 text-sky-300' },
    { label: '7. RAW_SCORE Calculated', count: stats.rawScoreCalculated, color: 'bg-sky-900 text-sky-200' },
    { label: '8. RAW_SCORE ≥ Base Thresh', count: stats.rawScoreAboveBase, color: 'bg-blue-900 text-blue-200' },
    { label: '9. Penalties Applied', count: stats.penaltiesApplied, color: 'bg-amber-950 text-amber-300' },
    { label: '10. FINAL_SCORE Calculated', count: stats.finalScoreCalculated, color: 'bg-amber-900 text-amber-200' },
    { label: '11. FINAL_SCORE ≥ EFFECTIVE', count: stats.finalScoreAboveEffective, color: 'bg-emerald-950 text-emerald-300' },
    { label: '12. Confirmation Readings (4/4)', count: stats.sequentialReadingsPassed, color: 'bg-emerald-900 text-emerald-200' },
    { label: '13. Payout Gate Passed', count: stats.payoutGatePassed, color: 'bg-emerald-800 text-emerald-100' },
    { label: '14. Risk & MG Gate Approved', count: stats.riskGateApproved, color: 'bg-teal-700 text-white' },
    { label: '15. Executed Contracts', count: stats.executedTrades, color: 'bg-emerald-600 text-white font-bold' }
  ];

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col gap-3">
      {/* Visualizer Header & Invariant Sanity Badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-slate-100 text-sm sm:text-base">Deriv Signal Funnel & Telemetry</h3>
        </div>

        {/* Mathematical Invariant Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          isInvariantValid 
            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' 
            : 'bg-rose-950/80 text-rose-400 border border-rose-800 animate-bounce'
        }`}>
          {isInvariantValid ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Invariable Math: FINAL ≤ RAW Passed</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>CONTRADICTION DETECTED IN FUNNEL!</span>
            </>
          )}
        </div>
      </div>

      {/* Funnel Pipeline Steps Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
        {funnelSteps.map((step, idx) => {
          const passRate = stats.ticksReceived > 0 ? ((step.count / stats.ticksReceived) * 100).toFixed(1) : '0.0';
          return (
            <div
              key={step.label}
              className={`p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between transition-all ${step.color}`}
            >
              <div className="text-[11px] font-medium opacity-90 truncate" title={step.label}>
                {step.label}
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-base font-mono font-bold">{step.count}</span>
                <span className="text-[10px] opacity-75">{passRate}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Funnel Mathematical Formula Summary */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-400">Current Math Pipeline:</span>
          <span className="text-sky-400 font-bold">RAW ({currentRawScore})</span>
          <span className="text-amber-400 font-bold">- PENALTIES</span>
          <span className="text-slate-400">=</span>
          <span className="text-emerald-400 font-bold">FINAL ({currentFinalScore})</span>
          <span className="text-slate-400">vs</span>
          <span className="text-purple-400 font-bold">EFFECTIVE ({currentEffectiveThreshold})</span>
        </div>

        <div className="text-slate-400 text-[11px]">
          Rule 01 & Rule 02 Strictly Enforced (Zero Martingale Contamination)
        </div>
      </div>
    </div>
  );
};
