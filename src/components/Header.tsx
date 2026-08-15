/**
 * Header Component
 * Displays system state, WS connection badge, symbol selector, mode badge, and session P&L.
 */

import React from 'react';
import { SymbolCode, OperatingMode, GlobalSystemState } from '../types/trading';
import { Activity, ShieldAlert, Wifi, WifiOff, Zap, DollarSign, Settings, RefreshCw, Clock } from 'lucide-react';

interface HeaderProps {
  systemState: GlobalSystemState;
  wsStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'AUTHORIZED';
  statusMessage: string;
  symbol: SymbolCode;
  onSymbolChange: (s: SymbolCode) => void;
  mode: OperatingMode;
  onModeChange: (m: OperatingMode) => void;
  contractDurationSeconds: number;
  onContractDurationChange: (sec: number) => void;
  sessionPnL: number;
  latencyMs: number;
  apiToken: string;
  accountBalance?: number;
  currency?: string;
  strictRealMode?: boolean;
  onOpenSettings: () => void;
  onResetSession: () => void;
}

export const SYMBOLS_LIST: { code: SymbolCode; name: string; category: string }[] = [
  { code: '1HZ10V', name: 'Volatility 10 (1s) Index', category: '1s Volatility' },
  { code: '1HZ25V', name: 'Volatility 25 (1s) Index', category: '1s Volatility' },
  { code: '1HZ50V', name: 'Volatility 50 (1s) Index', category: '1s Volatility' },
  { code: '1HZ75V', name: 'Volatility 75 (1s) Index', category: '1s Volatility' },
  { code: '1HZ100V', name: 'Volatility 100 (1s) Index', category: '1s Volatility' },
  { code: 'R_10', name: 'Volatility 10 Index', category: 'Volatility' },
  { code: 'R_25', name: 'Volatility 25 Index', category: 'Volatility' },
  { code: 'R_50', name: 'Volatility 50 Index', category: 'Volatility' },
  { code: 'R_75', name: 'Volatility 75 Index', category: 'Volatility' },
  { code: 'R_100', name: 'Volatility 100 Index', category: 'Volatility' },
  { code: 'BOOM500', name: 'Boom 500 Index', category: 'Boom/Crash' },
  { code: 'CRASH500', name: 'Crash 500 Index', category: 'Boom/Crash' },
  { code: 'JD10', name: 'Jump 10 Index', category: 'Jump' },
  { code: 'JD75', name: 'Jump 75 Index', category: 'Jump' }
];

export const Header: React.FC<HeaderProps> = ({
  systemState,
  wsStatus,
  statusMessage,
  symbol,
  onSymbolChange,
  mode,
  onModeChange,
  contractDurationSeconds,
  onContractDurationChange,
  sessionPnL,
  latencyMs,
  apiToken,
  accountBalance,
  currency,
  strictRealMode,
  onOpenSettings,
  onResetSession
}) => {
  const isPositivePnL = sessionPnL >= 0;

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-slate-100 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-lg">
      {/* Brand & Symbol Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 rounded-lg font-bold text-white shadow-md">
          <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
          <span className="tracking-wide text-sm sm:text-base">DERIV ADAPTIVE FUNNEL</span>
        </div>

        {/* Symbol Select */}
        <select
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value as SymbolCode)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
        >
          {SYMBOLS_LIST.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>

      {/* Connection, Duration & Latency Badges */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        {/* Connection status */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
          wsStatus === 'AUTHORIZED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
          wsStatus === 'CONNECTED' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
          wsStatus === 'CONNECTING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
          'bg-rose-950 text-rose-400 border border-rose-800'
        }`}>
          {wsStatus === 'DISCONNECTED' ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 animate-pulse" />}
          <span>{wsStatus === 'AUTHORIZED' ? `DERIV LIVE (${currency || 'USD'})` : wsStatus === 'CONNECTED' ? 'DERIV CONNECTED' : wsStatus}</span>
        </div>

        {/* Live Balance Badge */}
        {wsStatus === 'AUTHORIZED' && accountBalance !== undefined && (
          <div className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-300">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Balance: ${accountBalance.toFixed(2)} {currency || 'USD'}</span>
          </div>
        )}

        {/* Strict Real Mode Indicator */}
        {strictRealMode && (
          <div className="flex items-center gap-1 bg-amber-950/80 border border-amber-700/60 px-2.5 py-1 rounded-full text-xs font-bold text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>STRICT REAL LIVE</span>
          </div>
        )}

        {/* Contract Duration Quick Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-xs font-semibold text-emerald-400">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400 hidden xs:inline">Contract:</span>
          <select
            value={contractDurationSeconds}
            onChange={(e) => onContractDurationChange(Number(e.target.value))}
            className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer"
          >
            <option value={60} className="bg-slate-900 text-slate-200">1m (60s)</option>
            <option value={120} className="bg-slate-900 text-slate-200">2m (120s)</option>
            <option value={180} className="bg-slate-900 text-slate-200">3m (180s)</option>
            <option value={300} className="bg-slate-900 text-slate-200">5m (300s)</option>
          </select>
        </div>

        {/* Latency */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded border border-slate-700 text-slate-400">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>{latencyMs}ms</span>
        </div>

        {/* Operating Mode Selector */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {(['ANALYSIS', 'DEMO', 'LIVE'] as OperatingMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                mode === m
                  ? m === 'LIVE'
                    ? 'bg-rose-600 text-white shadow'
                    : m === 'DEMO'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Session PnL & Quick Controls */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono font-bold text-sm ${
          isPositivePnL 
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' 
            : 'bg-rose-950/60 border-rose-800 text-rose-400'
        }`}>
          <DollarSign className="w-4 h-4" />
          <span>PnL: {isPositivePnL ? `+$${sessionPnL.toFixed(2)}` : `-$${Math.abs(sessionPnL).toFixed(2)}`}</span>
        </div>

        <button
          onClick={onResetSession}
          title="Reset Session Stats"
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          title="Risk & API Settings"
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <Settings className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
    </header>
  );
};
