/**
 * TradeHistory Component
 * Live table of active and settled contracts, P&L breakdown, win rate stats,
 * and individual trade telemetry inspector modal.
 */

import React, { useState } from 'react';
import { TradeContract } from '../types/trading';
import { History, TrendingUp, TrendingDown, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface TradeHistoryProps {
  contracts: TradeContract[];
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ contracts }) => {
  const [selectedTelemetry, setSelectedTelemetry] = useState<TradeContract | null>(null);

  const totalTrades = contracts.length;
  const wins = contracts.filter(c => c.status === 'WON').length;
  const losses = contracts.filter(c => c.status === 'LOST').length;
  const winRate = totalTrades > 0 ? ((wins / (wins + losses || 1)) * 100).toFixed(1) : '0.0';

  const totalPnL = contracts.reduce((sum, c) => sum + (c.profitPnL || 0), 0);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col gap-4">
      {/* Table Header & Summary Badges */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-slate-100 text-sm sm:text-base">Trade History & Active Contracts</h3>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-1 rounded border border-slate-800 text-slate-300">
            Total Trades: <strong className="text-white">{totalTrades}</strong>
          </div>
          <div className="bg-slate-950 px-3 py-1 rounded border border-slate-800 text-slate-300">
            Win Rate: <strong className="text-emerald-400">{winRate}%</strong> ({wins}W / {losses}L)
          </div>
          <div className={`bg-slate-950 px-3 py-1 rounded border text-sm font-bold ${totalPnL >= 0 ? 'border-emerald-800 text-emerald-400' : 'border-rose-800 text-rose-400'}`}>
            PnL: {totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`}
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Stake</th>
              <th className="py-2.5 px-3">MG Step</th>
              <th className="py-2.5 px-3">Entry Price</th>
              <th className="py-2.5 px-3">Exit Price</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">P&L</th>
              <th className="py-2.5 px-3 text-right">Telemetry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-6 text-center text-slate-500 font-sans">
                  No contracts executed yet in this session. Monitoring funnel signals...
                </td>
              </tr>
            ) : (
              contracts.map((c) => {
                const isWon = c.status === 'WON';
                const isLost = c.status === 'LOST';
                const isActive = c.status === 'ACTIVE';

                return (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-400">{c.telemetry.timeString}</td>
                    <td className="py-2.5 px-3 text-slate-200 font-bold">{c.symbol}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${c.direction === 'CALL' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                        {c.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">${c.stake.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-amber-400 font-bold">
                      {c.mgStep > 0 ? `Step ${c.mgStep}` : 'Base (0)'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{c.entryPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-300">{c.exitPrice ? c.exitPrice.toFixed(2) : '-'}</td>
                    <td className="py-2.5 px-3">
                      {isActive && (
                        <span className="flex items-center gap-1 text-amber-400 animate-pulse font-bold">
                          <Clock className="w-3.5 h-3.5" /> ACTIVE
                        </span>
                      )}
                      {isWon && (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> WON
                        </span>
                      )}
                      {isLost && (
                        <span className="flex items-center gap-1 text-rose-400 font-bold">
                          <XCircle className="w-3.5 h-3.5" /> LOST
                        </span>
                      )}
                    </td>
                    <td className={`py-2.5 px-3 font-bold ${isWon ? 'text-emerald-400' : isLost ? 'text-rose-400' : 'text-slate-400'}`}>
                      {c.profitPnL !== undefined ? (c.profitPnL >= 0 ? `+$${c.profitPnL.toFixed(2)}` : `-$${Math.abs(c.profitPnL).toFixed(2)}`) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedTelemetry(c)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded transition"
                        title="View Full Telemetry JSON"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Telemetry Inspector Modal */}
      {selectedTelemetry && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 text-slate-100 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-bold text-sm">Contract Telemetry #{selectedTelemetry.id}</h4>
              <button onClick={() => setSelectedTelemetry(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <pre className="bg-slate-950 p-3 rounded text-xs font-mono text-emerald-400 overflow-x-auto max-h-[350px]">
              {JSON.stringify(selectedTelemetry.telemetry, null, 2)}
            </pre>

            <button
              onClick={() => setSelectedTelemetry(null)}
              className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
