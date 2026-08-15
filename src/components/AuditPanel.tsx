/**
 * AuditPanel Component
 * Displays real-time Contradiction Errors detected by AuditEngine,
 * Telemetry log exporter (JSON/CSV), and Excessive Score Compression warnings.
 */

import React, { useState } from 'react';
import { ContradictionError } from '../types/trading';
import { ShieldAlert, Download, CheckCircle2, FileText, Trash2 } from 'lucide-react';

interface AuditPanelProps {
  errors: ContradictionError[];
  onExportJSON: () => void;
  onExportCSV: () => void;
  onClearErrors: () => void;
  compressionAlert: boolean;
  rawAverage: number;
  finalAverage: number;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({
  errors,
  onExportJSON,
  onExportCSV,
  onClearErrors,
  compressionAlert,
  rawAverage,
  finalAverage
}) => {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col gap-3">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-slate-100 text-sm sm:text-base">Contradiction Detector & Audit Telemetry</h3>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExportJSON}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>
          {errors.length > 0 && (
            <button
              onClick={onClearErrors}
              className="p-1 text-slate-400 hover:text-rose-400"
              title="Clear Error Log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Excessive Score Compression Banner */}
      {compressionAlert && (
        <div className="p-3 bg-amber-950/80 border border-amber-800 rounded-lg text-amber-300 text-xs flex items-center justify-between">
          <div>
            <strong className="font-bold">⚠ EXCESSIVE_SCORE_COMPRESSION DETECTED!</strong>
            <p className="text-[11px] text-amber-400">
              RAW Avg ({rawAverage}) - FINAL Avg ({finalAverage}) = {(rawAverage - finalAverage).toFixed(1)} pts drop ({'>'} 15 pts limit).
            </p>
          </div>
          <span className="px-2 py-0.5 bg-amber-600 text-white text-[10px] font-bold rounded">CHECK PENALTIES</span>
        </div>
      )}

      {/* Errors List */}
      <div className="space-y-2 max-h-[180px] overflow-y-auto">
        {errors.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-lg text-emerald-400 text-xs border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Zero contradictions detected! Mathematical invariants intact (FINAL ≤ RAW).</span>
          </div>
        ) : (
          errors.map((err) => (
            <div
              key={err.id}
              className="p-2.5 bg-rose-950/40 border border-rose-900 rounded-lg text-xs font-mono text-rose-300 flex items-start justify-between gap-2"
            >
              <div>
                <span className="font-bold text-rose-400">{err.code}:</span> {err.message}
                <div className="text-[10px] text-slate-500 mt-0.5">{err.timeString} — {JSON.stringify(err.details)}</div>
              </div>
              <span className="px-1.5 py-0.5 bg-rose-800 text-white text-[9px] font-bold rounded uppercase">
                {err.severity}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
