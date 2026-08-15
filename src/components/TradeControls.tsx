/**
 * TradeControls Component
 * Settings drawer / modal for Deriv API token configuration, risk management parameters,
 * Martingale multipliers, stop loss/take profit caps, and AutoTuner preferences.
 */

import React, { useState } from 'react';
import { OperatingMode, RiskSettings, AutoTunerState } from '../types/trading';
import { Key, Shield, DollarSign, Sliders, Cpu, Save, X, RotateCcw } from 'lucide-react';

interface TradeControlsProps {
  isOpen: boolean;
  onClose: () => void;
  apiToken: string;
  onSaveApiToken: (token: string) => void;
  appId?: string;
  onSaveAppId?: (appId: string) => void;
  mode: OperatingMode;
  onModeChange: (m: OperatingMode) => void;
  riskSettings: RiskSettings;
  onUpdateRiskSettings: (settings: Partial<RiskSettings>) => void;
  autoTunerState: AutoTunerState;
  onToggleAutoTuner: (enabled: boolean) => void;
}

export const TradeControls: React.FC<TradeControlsProps> = ({
  isOpen,
  onClose,
  apiToken,
  onSaveApiToken,
  appId = '1089',
  onSaveAppId,
  mode,
  onModeChange,
  riskSettings,
  onUpdateRiskSettings,
  autoTunerState,
  onToggleAutoTuner
}) => {
  const [tokenInput, setTokenInput] = useState(apiToken);
  const [appIdInput, setAppIdInput] = useState(appId);
  const [formSettings, setFormSettings] = useState<RiskSettings>({ ...riskSettings });

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiToken(tokenInput);
    if (onSaveAppId) onSaveAppId(appIdInput);
    onUpdateRiskSettings(formSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl text-slate-100 flex flex-col gap-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Trading & Risk Control Panel</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECTION 1: Deriv API Token & App ID */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Deriv API PAT Token (Personal Access Token)</span>
            </label>
            <a
              href="https://developers.deriv.com/api-playground/"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-emerald-400 hover:underline font-semibold"
            >
              Deriv API Playground ↗
            </a>
          </div>

          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste your Deriv API Token here (e.g. wX92m...)"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Deriv App ID</label>
              <input
                type="text"
                value={appIdInput}
                onChange={(e) => setAppIdInput(e.target.value)}
                placeholder="1089"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
              />
            </div>

            <div className="flex flex-col justify-end text-[11px] text-slate-400">
              <span>App ID por defecto: <strong className="text-slate-200 font-mono">1089</strong></span>
              <span>Puedes registrar tu App ID en <code className="text-emerald-400">developers.deriv.com</code></span>
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">💡 Instrucciones para Tokens de Deriv:</p>
            <p>1. Para cuenta <strong>Demo</strong>, asegúrate de haber iniciado sesión en tu cuenta Demo en Deriv antes de crear el Token.</p>
            <p>2. Para cuenta <strong>Real</strong>, cambia a tu cuenta Real en Deriv antes de crear el Token.</p>
            <p>3. Asigna permisos obligatorios: <strong className="text-emerald-400">Read</strong> y <strong className="text-emerald-400">Trade</strong>.</p>
          </div>
        </div>

        {/* SECTION 2: Risk Parameters & Martingale */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Risk Engine & Martingale Settings (Strictly Isolated)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {/* Base Stake */}
            <div>
              <label className="text-slate-400 block mb-1">Base Stake ($)</label>
              <input
                type="number"
                value={formSettings.initialStake}
                onChange={(e) => setFormSettings({ ...formSettings, initialStake: parseFloat(e.target.value) || 1 })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
              />
            </div>

            {/* Martingale Multiplier */}
            <div>
              <label className="text-slate-400 block mb-1">MG Multiplier</label>
              <input
                type="number"
                step="0.1"
                value={formSettings.mgMultiplier}
                onChange={(e) => setFormSettings({ ...formSettings, mgMultiplier: parseFloat(e.target.value) || 2.0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
              />
            </div>

            {/* Max MG Steps */}
            <div>
              <label className="text-slate-400 block mb-1">Max MG Steps</label>
              <input
                type="number"
                value={formSettings.maxMgSteps}
                onChange={(e) => setFormSettings({ ...formSettings, maxMgSteps: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
              />
            </div>

            {/* Stop Loss Amount */}
            <div>
              <label className="text-slate-400 block mb-1">Stop Loss ($)</label>
              <input
                type="number"
                value={formSettings.stopLossAmount}
                onChange={(e) => setFormSettings({ ...formSettings, stopLossAmount: parseFloat(e.target.value) || 50 })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-rose-400"
              />
            </div>

            {/* Take Profit Amount */}
            <div>
              <label className="text-slate-400 block mb-1">Take Profit ($)</label>
              <input
                type="number"
                value={formSettings.takeProfitAmount}
                onChange={(e) => setFormSettings({ ...formSettings, takeProfitAmount: parseFloat(e.target.value) || 100 })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-emerald-400"
              />
            </div>

            {/* Cooldown Duration */}
            <div>
              <label className="text-slate-400 block mb-1">Cooldown (sec)</label>
              <input
                type="number"
                value={formSettings.cooldownDurationSeconds}
                onChange={(e) => setFormSettings({ ...formSettings, cooldownDurationSeconds: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
              />
            </div>

            {/* Max Auto Trades per Session */}
            <div>
              <label className="text-slate-400 block mb-1">Límite Ops. Auto</label>
              <input
                type="number"
                value={formSettings.maxAutoTrades || 10}
                onChange={(e) => setFormSettings({ ...formSettings, maxAutoTrades: parseInt(e.target.value) || 10 })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-amber-300 font-bold"
              />
            </div>

            {/* Contract Duration Selector */}
            <div className="col-span-2 sm:col-span-3">
              <label className="text-slate-300 font-semibold block mb-1">Contract Duration</label>
              <div className="flex items-center gap-2">
                {[
                  { label: '15s ⚡', value: 15 },
                  { label: '30s ⚡', value: 30 },
                  { label: '1m (60s)', value: 60 },
                  { label: '2m (120s) ★', value: 120 },
                  { label: '3m (180s)', value: 180 },
                  { label: '5m (300s)', value: 300 }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormSettings({ ...formSettings, contractDurationSeconds: opt.value })}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition border ${
                      formSettings.contractDurationSeconds === opt.value
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: AutoTuner & Adaptive Thresholds */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>AutoTuner & Adaptive Threshold Calibration</span>
            </div>

            <button
              onClick={() => onToggleAutoTuner(!autoTunerState.enabled)}
              className={`px-3 py-1 rounded text-xs font-bold transition ${
                autoTunerState.enabled ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {autoTunerState.enabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>AutoTuner Mode:</span>
              <strong className="text-purple-300">{autoTunerState.status}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Gathered Samples:</span>
              <span>{autoTunerState.sampleCount} / {autoTunerState.minSamples}</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              Action: {autoTunerState.suggestedAction}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 pt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
