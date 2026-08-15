/**
 * DerivAccountMonitor Component
 * Displays live Deriv account balance, connection status, account ID,
 * and a real-time WebSocket connection log console.
 */

import React, { useState } from 'react';
import { DollarSign, ShieldCheck, Wifi, WifiOff, Terminal, RefreshCw, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { OperatingMode } from '../types/trading';

export interface WSLogEntry {
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
}

interface DerivAccountMonitorProps {
  wsStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'AUTHORIZED';
  statusMessage: string;
  accountBalance?: number;
  currency?: string;
  loginId?: string;
  mode: OperatingMode;
  logs: WSLogEntry[];
  onClearLogs: () => void;
  onReconnect: () => void;
}

export const DerivAccountMonitor: React.FC<DerivAccountMonitorProps> = ({
  wsStatus,
  statusMessage,
  accountBalance,
  currency = 'USD',
  loginId,
  mode,
  logs,
  onClearLogs,
  onReconnect
}) => {
  const [showLogs, setShowLogs] = useState(true);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col gap-4">
      {/* Top Bar: Account Balance & Connection Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        {/* Left Side: Balance & Account Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-700/60 rounded-xl flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold">
                Saldo Real Deriv
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                {accountBalance !== undefined ? `$${accountBalance.toFixed(2)}` : '---.--'}{' '}
                <span className="text-xs font-bold text-emerald-400">{currency}</span>
              </div>
            </div>
          </div>

          {loginId && (
            <div className="hidden sm:flex flex-col bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 font-semibold">Account ID</span>
              <span className="text-xs font-bold text-slate-200 font-mono">{loginId}</span>
            </div>
          )}
        </div>

        {/* Right Side: Status Badge & Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold shadow ${
              wsStatus === 'AUTHORIZED'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                : wsStatus === 'CONNECTED'
                ? 'bg-blue-950 text-blue-400 border border-blue-700'
                : wsStatus === 'CONNECTING'
                ? 'bg-amber-950 text-amber-400 border border-amber-700'
                : 'bg-rose-950 text-rose-400 border border-rose-700'
            }`}
          >
            {wsStatus === 'DISCONNECTED' ? (
              <WifiOff className="w-4 h-4" />
            ) : (
              <Wifi className="w-4 h-4 animate-pulse" />
            )}
            <span>
              {wsStatus === 'AUTHORIZED'
                ? 'DERIV LIVE CONECTADO'
                : wsStatus === 'CONNECTED'
                ? 'WS CONNECTED'
                : wsStatus}
            </span>
          </div>

          {/* Mode Pill */}
          <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 font-bold text-slate-300">
            Modo: <span className={mode === 'LIVE' ? 'text-rose-400' : 'text-amber-400'}>{mode}</span>
          </div>

          {/* Toggle Log Drawer */}
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>{showLogs ? 'Ocultar Logs' : 'Ver Logs WS'}</span>
          </button>

          {/* Force Reconnect */}
          <button
            onClick={onReconnect}
            title="Reconectar WebSocket Deriv"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Status Message Header */}
      <div className="text-xs text-slate-400 flex items-center justify-between font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
        <span className="truncate" title={statusMessage}>
          <span className="text-emerald-400 font-bold">Diagnóstico:</span> {statusMessage}
        </span>
        <span className="text-[10px] text-slate-500 font-sans hidden sm:inline">
          API: wss://ws.derivws.com/websockets/v3
        </span>
      </div>

      {/* Real-time Connection Log Console */}
      {showLogs && (
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-300 font-mono">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>Consola de Eventos Deriv WebSocket</span>
              <span className="text-[10px] text-slate-500 font-normal">({logs.length} eventos)</span>
            </div>

            <button
              onClick={onClearLogs}
              title="Limpiar Consola"
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] rounded border border-slate-800 transition"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          </div>

          {/* Log Stream Area */}
          <div className="max-h-36 overflow-y-auto font-mono text-[11px] flex flex-col gap-1 pr-1 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic text-center py-2">Sin eventos registrados aún...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`px-1 rounded text-[10px] font-bold shrink-0 ${
                      log.level === 'SUCCESS'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : log.level === 'ERROR'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : log.level === 'WARN'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-slate-200 break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
