/**
 * TradingArea Component (Área de Ejecución de Trading)
 * Dedicated panel for executing trades based on live signal decisions or manual overrides.
 * Includes Auto-Trading Bot toggle, Scalping Intenso settings, Martingale Calculator, and Execution Controls.
 */

import React, { useState } from 'react';
import { DecisionRecord, OperatingMode, SymbolCode, RiskSettings } from '../types/trading';
import { 
  Play, 
  Square, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Bot,
  Sliders,
  Sparkles,
  RotateCcw,
  Flame,
  Target,
  Layers
} from 'lucide-react';

interface TradingAreaProps {
  symbol: SymbolCode;
  mode: OperatingMode;
  currentDecision: DecisionRecord;
  lastPrice: number;
  mgStep: number;
  currentStake: number;
  contractDurationSeconds: number;
  autoTradeEnabled: boolean;
  onToggleAutoTrade: (enabled: boolean) => void;
  onExecuteTrade: (direction: 'CALL' | 'PUT', overrideStake?: number) => void;
  onContractDurationChange: (duration: number) => void;
  cooldownActive: boolean;
  sessionLimitReached: boolean;
  activeContractsCount: number;
  riskSettings: RiskSettings;
  executedAutoTrades: number;
  onUpdateRiskSettings: (settings: Partial<RiskSettings>) => void;
  onResetAutoTradeCounter: () => void;
}

export const TradingArea: React.FC<TradingAreaProps> = ({
  symbol,
  mode,
  currentDecision,
  lastPrice,
  mgStep,
  currentStake,
  contractDurationSeconds,
  autoTradeEnabled,
  onToggleAutoTrade,
  onExecuteTrade,
  onContractDurationChange,
  cooldownActive,
  sessionLimitReached,
  activeContractsCount,
  riskSettings,
  executedAutoTrades,
  onUpdateRiskSettings,
  onResetAutoTradeCounter
}) => {
  const [customStake, setCustomStake] = useState<number>(currentStake);
  const [useCustomStake, setUseCustomStake] = useState<boolean>(false);

  const isQualified = currentDecision.canTrade && !cooldownActive && !sessionLimitReached;
  const isCall = currentDecision.decision === 'CALL';
  const isPut = currentDecision.decision === 'PUT';
  const effectiveStake = useCustomStake ? customStake : currentStake;

  const maxAuto = riskSettings.maxAutoTrades || 10;
  const scalpingActive = riskSettings.scalpingMode;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 sm:p-5 shadow-xl flex flex-col gap-4">
      {/* Panel Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-base sm:text-lg flex items-center gap-2">
              Área de Ejecución de Trading
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                mode === 'LIVE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                mode === 'DEMO' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}>
                {mode}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Ejecución de contratos sintéticos en {symbol} — Duración: {contractDurationSeconds}s ({contractDurationSeconds / 60}m)
            </p>
          </div>
        </div>

        {/* Auto Bot Toggle Control & Progress Counter */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 px-2 text-xs font-semibold">
            <Bot className={`w-4 h-4 ${autoTradeEnabled ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className={autoTradeEnabled ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {autoTradeEnabled ? 'BOT AUTOMÁTICO ACTIVO' : 'MODO MANUAL'}
            </span>
          </div>

          {/* Executed Trades Progress Badge */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 font-mono text-xs">
            <span className="text-slate-400">Ejecutadas:</span>
            <strong className={executedAutoTrades >= maxAuto ? 'text-rose-400' : 'text-emerald-400'}>
              {executedAutoTrades} / {maxAuto}
            </strong>
          </div>

          <button
            onClick={() => onToggleAutoTrade(!autoTradeEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition shadow ${
              autoTradeEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {autoTradeEnabled ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>DETENER BOT</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ACTIVAR AUTO-TRADING</span>
              </>
            )}
          </button>

          <button
            onClick={onResetAutoTradeCounter}
            title="Reiniciar contador de operaciones de la sesión"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SECCIÓN CONFIGURABLE: MODO SCALPING INTENSO & PARÁMETROS */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Flame className={`w-4 h-4 ${scalpingActive ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Configuración de Scalping Intenso & Control de Ráfaga
            </h3>
          </div>

          {/* Scalping Mode Toggle */}
          <button
            onClick={() => onUpdateRiskSettings({ scalpingMode: !scalpingActive })}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              scalpingActive
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white border border-amber-400 shadow-md'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{scalpingActive ? 'MODO SCALPING INTENSO: ACTIVADO' : 'MODO SCALPING: DESACTIVADO'}</span>
          </button>
        </div>

        {/* Scalping Config Inputs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* 1. Target Auto Trades */}
          <div className="bg-slate-900 p-2 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Límite Ops. Auto:</span>
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={riskSettings.maxAutoTrades || 10}
              onChange={(e) => onUpdateRiskSettings({ maxAutoTrades: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* 2. Rapid Contract Duration */}
          <div className="bg-slate-900 p-2 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Duración Contrato:</span>
            </label>
            <select
              value={contractDurationSeconds}
              onChange={(e) => onContractDurationChange(Number(e.target.value))}
              className="w-full bg-slate-950 text-emerald-400 font-bold text-xs p-1 rounded border border-slate-800 focus:outline-none"
            >
              <option value={15}>15 segundos ⚡</option>
              <option value={30}>30 segundos ⚡</option>
              <option value={60}>1 minuto (60s)</option>
              <option value={120}>2 minutos (120s) ★</option>
              <option value={180}>3 minutos (180s)</option>
              <option value={300}>5 minutos (300s)</option>
            </select>
          </div>

          {/* 3. Cooldown Between Trades */}
          <div className="bg-slate-900 p-2 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              <span>Pausa / Cooldown:</span>
            </label>
            <select
              value={riskSettings.cooldownDurationSeconds}
              onChange={(e) => onUpdateRiskSettings({ cooldownDurationSeconds: Number(e.target.value) })}
              className="w-full bg-slate-950 text-sky-300 font-bold text-xs p-1 rounded border border-slate-800 focus:outline-none"
            >
              <option value={0}>0s (Inmediato / Sin Pausa)</option>
              <option value={3}>3 segundos</option>
              <option value={5}>5 segundos</option>
              <option value={10}>10 segundos</option>
              <option value={30}>30 segundos (Estándar)</option>
            </select>
          </div>

          {/* 4. Confirmation Readings Speed */}
          <div className="bg-slate-900 p-2 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Lecturas Confirmación:</span>
            </label>
            <select
              value={riskSettings.scalpingReadingsRequired || 1}
              onChange={(e) => onUpdateRiskSettings({ scalpingReadingsRequired: Number(e.target.value) })}
              className="w-full bg-slate-950 text-purple-300 font-bold text-xs p-1 rounded border border-slate-800 focus:outline-none"
            >
              <option value={1}>1 Lectura (Ultra Rápido)</option>
              <option value={2}>2 Lecturas (Rápido)</option>
              <option value={4}>4 Lecturas (Estándar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Signal Radar & Execution Suite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Signal Qualification Status Card (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-950/80 rounded-lg p-4 border border-slate-800 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
                Estado de Señal de Entrada
              </span>
              <span className="font-mono text-slate-300">
                Tick Actual: <strong className="text-emerald-400">{lastPrice.toFixed(2)}</strong>
              </span>
            </div>

            {/* Signal Badge Banner */}
            <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
              isQualified && isCall ? 'bg-emerald-950/50 border-emerald-600/60 text-emerald-300' :
              isQualified && isPut ? 'bg-rose-950/50 border-rose-600/60 text-rose-300' :
              currentDecision.decision !== 'NO_TRADE' ? 'bg-amber-950/40 border-amber-800/60 text-amber-300' :
              'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-3">
                {isCall ? (
                  <TrendingUp className="w-7 h-7 text-emerald-400 shrink-0" />
                ) : isPut ? (
                  <TrendingDown className="w-7 h-7 text-rose-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-7 h-7 text-slate-500 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {currentDecision.decision === 'CALL' ? 'SEÑAL ALCISTA DETECTADA (CALL)' :
                     currentDecision.decision === 'PUT' ? 'SEÑAL BAJISTA DETECTADA (PUT)' :
                     'SIN SEÑAL CLARA'}
                  </div>
                  <div className="text-[11px] opacity-90">
                    {currentDecision.primaryReason || 'Analizando estructura de mercado...'}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                  isQualified ? 'bg-emerald-500 text-slate-950 animate-pulse' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isQualified ? '¡SEÑAL CALIFICADA!' : 'EN ESPERA'}
                </span>
              </div>
            </div>
          </div>

          {/* Scores & Threshold Comparison */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">SCORE FINAL</span>
              <strong className={`text-sm sm:text-base font-black font-mono ${
                currentDecision.finalScore >= currentDecision.effectiveThreshold ? 'text-emerald-400' : 'text-slate-200'
              }`}>
                {currentDecision.finalScore} pts
              </strong>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">UMBRAL EXIGIDO</span>
              <strong className="text-sm sm:text-base font-black font-mono text-amber-400">
                {currentDecision.effectiveThreshold} pts
              </strong>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">CONFIRMACIÓN</span>
              <strong className="text-sm sm:text-base font-black font-mono text-sky-400">
                {currentDecision.readingsPassed}/4
              </strong>
            </div>
          </div>

          {/* Confirmation Progress Bar */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-semibold">
              <span>Lecturas Consecutivas:</span>
              <span className="text-sky-400 font-bold">{currentDecision.readingsPassed * 25}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800 flex">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`flex-1 border-r border-slate-950 transition-all duration-300 ${
                    step <= currentDecision.readingsPassed ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Execution Controls & Sizing (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 rounded-lg p-4 border border-slate-800 flex flex-col justify-between gap-4">
          {/* Quick Settings & Stake Sizing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            {/* Stake Display */}
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <label className="text-[11px] text-slate-400 block font-semibold mb-1 flex items-center justify-between">
                <span>Inversión (Stake):</span>
                <span className="text-[10px] text-amber-400 font-bold">Paso MG: {mgStep}</span>
              </label>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <input
                  type="number"
                  value={useCustomStake ? customStake : currentStake}
                  onChange={(e) => {
                    setUseCustomStake(true);
                    setCustomStake(Math.max(1, Number(e.target.value)));
                  }}
                  className="bg-transparent text-slate-100 font-mono font-bold text-base focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Contract Duration Display */}
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <label className="text-[11px] text-slate-400 block font-semibold mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Duración Seleccionada:</span>
              </label>
              <span className="text-emerald-400 font-bold font-mono text-sm block">
                {contractDurationSeconds}s ({contractDurationSeconds / 60}m)
              </span>
            </div>

            {/* Active Operations Counter */}
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block font-semibold">Operaciones Activas</span>
              <span className={`text-base font-black font-mono ${
                activeContractsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-300'
              }`}>
                {activeContractsCount} {activeContractsCount === 1 ? 'Contrato' : 'Contratos'}
              </span>
            </div>
          </div>

          {/* Primary Signal Trigger Button */}
          <div>
            <button
              onClick={() => {
                if (currentDecision.decision !== 'NO_TRADE') {
                  onExecuteTrade(currentDecision.decision as 'CALL' | 'PUT', effectiveStake);
                }
              }}
              disabled={currentDecision.decision === 'NO_TRADE' || activeContractsCount > 0}
              className={`w-full py-3 px-4 rounded-xl font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg ${
                isQualified && isCall
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 ring-2 ring-emerald-400 animate-bounce'
                  : isQualified && isPut
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-950/50 ring-2 ring-rose-400 animate-bounce'
                  : currentDecision.decision !== 'NO_TRADE'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>
                {currentDecision.decision === 'CALL'
                  ? `EJECUTAR SEÑAL CALL ALCISTA ($${effectiveStake.toFixed(2)})`
                  : currentDecision.decision === 'PUT'
                  ? `EJECUTAR SEÑAL PUT BAJISTA ($${effectiveStake.toFixed(2)})`
                  : 'EN ESPERA DE SEÑAL CALIFICADA'}
              </span>
            </button>
          </div>

          {/* Manual Trade Direct Triggers */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onExecuteTrade('CALL', effectiveStake)}
              disabled={activeContractsCount > 0}
              className="py-2.5 px-3 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>COMPRAR CALL ⬆ (${effectiveStake.toFixed(2)})</span>
            </button>

            <button
              onClick={() => onExecuteTrade('PUT', effectiveStake)}
              disabled={activeContractsCount > 0}
              className="py-2.5 px-3 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
            >
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span>COMPRAR PUT ⬇ (${effectiveStake.toFixed(2)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
