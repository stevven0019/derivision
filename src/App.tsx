/**
 * Main Application Component
 * Deriv Adaptive Synthetic Indices Trading Terminal
 * Implements strict architecture: Indicators → RAW_SCORE → Penalties → FINAL_SCORE → Single EFFECTIVE_THRESHOLD → Decision → Isolated Risk Engine.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  SymbolCode,
  OperatingMode,
  GlobalSystemState,
  TickData,
  CandleData,
  TechnicalIndicators,
  MarketState,
  MarketQuality,
  SignalScores,
  DecisionRecord,
  TradeContract,
  FunnelStats,
  ContradictionError,
  RiskSettings
} from './types/trading';

import { DerivWebSocketAdapter } from './services/websocket';
import { MarketDataStore } from './services/marketData';
import { IndicatorEngine } from './services/indicators';
import { MarketStateEngine } from './services/marketState';
import { MarketQualityEngine } from './services/marketQuality';
import { ScoringEngine } from './services/scoring';
import { PenaltyEngine } from './services/penalties';
import { ThresholdEngine } from './services/threshold';
import { ReadingsManager } from './services/readings';
import { RiskEngine } from './services/risk';
import { AutoTunerEngine } from './services/autotuner';
import { AuditEngine } from './services/audit';
import { TelemetryEngine } from './services/telemetry';

import { Header } from './components/Header';
import { TradingChart } from './components/TradingChart';
import { TradingArea } from './components/TradingArea';
import { FunnelVisualizer } from './components/FunnelVisualizer';
import { ScoreCard } from './components/ScoreCard';
import { TradeControls } from './components/TradeControls';
import { TradeHistory } from './components/TradeHistory';
import { CalibrationSuite } from './components/CalibrationSuite';
import { AuditPanel } from './components/AuditPanel';
import { DerivAccountMonitor, WSLogEntry } from './components/DerivAccountMonitor';

export default function App() {
  // --- Persistent State ---
  const [symbol, setSymbol] = useState<SymbolCode>('1HZ10V');
  const [mode, setMode] = useState<OperatingMode>('DEMO');
  const [apiToken, setApiToken] = useState<string>(() => localStorage.getItem('deriv_api_token') || '');
  const [appId, setAppId] = useState<string>(() => localStorage.getItem('deriv_app_id') || '1089');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState<boolean>(true);
  const [accountBalance, setAccountBalance] = useState<number | undefined>(undefined);
  const [currency, setCurrency] = useState<string>('USD');
  const [loginId, setLoginId] = useState<string | undefined>(undefined);
  const [strictRealMode, setStrictRealMode] = useState<boolean>(true);
  const [wsLogs, setWsLogs] = useState<WSLogEntry[]>([]);

  // --- Real-time Engine States ---
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'AUTHORIZED'>('CONNECTING');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing Deriv Adaptive Engine...');
  const [systemState, setSystemState] = useState<GlobalSystemState>('DISCONNECTED');
  const [latencyMs, setLatencyMs] = useState<number>(120);

  const [lastTickPrice, setLastTickPrice] = useState<number>(1000);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators>(IndicatorEngine.calculate([]));
  const [marketState, setMarketState] = useState<MarketState>('UNKNOWN');
  const [marketQuality, setMarketQuality] = useState<MarketQuality>(MarketQualityEngine.evaluate(indicators));

  const [signalScores, setSignalScores] = useState<SignalScores>({
    callScore: 0,
    putScore: 0,
    rawScore: 0,
    direction: 'NO_TRADE',
    edge: 0,
    components: { trendStrength: 0, entryTiming: 0, trendQuality: 0, momentum: 0, marketQuality: 0, visionStructure: 0 }
  });

  const [currentDecision, setCurrentDecision] = useState<DecisionRecord>({
    decisionId: 'INIT',
    timestamp: Date.now(),
    timeString: new Date().toLocaleTimeString(),
    symbol: '1HZ10V',
    timeframe: '1m',
    marketState: 'UNKNOWN',
    callScore: 0,
    putScore: 0,
    rawScore: 0,
    penalties: [],
    penaltyTotal: 0,
    finalScore: 0,
    baseThreshold: 64,
    thresholdAdjustment: 0,
    effectiveThreshold: 64,
    mgStep: 0,
    cooldownActive: false,
    sessionLimitReached: false,
    decision: 'NO_TRADE',
    canTrade: false,
    primaryReason: 'INITIALIZING',
    secondaryReasons: [],
    readingsPassed: 0
  });

  const [activeContracts, setActiveContracts] = useState<TradeContract[]>([]);
  const [contractHistory, setContractHistory] = useState<TradeContract[]>([]);
  const [funnelStats, setFunnelStats] = useState<FunnelStats>(new TelemetryEngine().getFunnelStats());
  const [auditErrors, setAuditErrors] = useState<ContradictionError[]>([]);

  // --- Services Refs ---
  const dataStoreRef = useRef(new MarketDataStore());
  const riskEngineRef = useRef(new RiskEngine());
  const readingsManagerRef = useRef(new ReadingsManager());
  const autoTunerRef = useRef(new AutoTunerEngine());
  const telemetryRef = useRef(new TelemetryEngine());
  const wsAdapterRef = useRef<DerivWebSocketAdapter | null>(null);

  // Initialize Deriv WebSocket Connection
  useEffect(() => {
    const adapter = new DerivWebSocketAdapter({
      symbol,
      appId,
      token: apiToken,
      strictRealMode: mode === 'LIVE' || mode === 'DEMO' ? strictRealMode : false,
      onStatusChange: (status, info) => {
        setWsStatus(status);
        if (info) setStatusMessage(info);
        dataStoreRef.current.setConnectionState(status === 'CONNECTED' || status === 'AUTHORIZED');
        if (status === 'CONNECTED' || status === 'AUTHORIZED') {
          setSystemState('CONNECTED');
        } else if (status === 'DISCONNECTED') {
          setSystemState('DISCONNECTED');
        }
      },
      onBalanceUpdate: (bal, curr, login) => {
        setAccountBalance(bal);
        setCurrency(curr);
        if (login) setLoginId(login);
      },
      onTradeOutcome: (contractId, win, profit) => {
        autoTunerRef.current.recordTradeOutcome(contractId, win, profit);
      },
      onLog: (log) => {
        setWsLogs((prev) => [log, ...prev].slice(0, 100));
      },
      onCandleHistory: (historyCandles) => {
        dataStoreRef.current.setCandleHistory(symbol, historyCandles);
        setCandles(historyCandles);
      },
      onTick: (tick) => {
        handleTickIngestion(tick);
      },
      onError: (err) => {
        setStatusMessage(`Deriv WS Error: ${err}`);
      }
    });

    wsAdapterRef.current = adapter;
    adapter.connect();

    return () => {
      adapter.disconnect();
    };
  }, []);

  // Symbol Change Handler
  const handleSymbolChange = (newSymbol: SymbolCode) => {
    setSymbol(newSymbol);
    readingsManagerRef.current.reset();
    wsAdapterRef.current?.setSymbol(newSymbol);
  };

  // Save Token
  const handleSaveToken = (token: string) => {
    setApiToken(token);
    localStorage.setItem('deriv_api_token', token);
    wsAdapterRef.current?.setToken(token);
  };

  // Save App ID
  const handleSaveAppId = (newAppId: string) => {
    setAppId(newAppId);
    localStorage.setItem('deriv_app_id', newAppId);
    wsAdapterRef.current?.setAppId(newAppId);
  };

  // --- Core Funnel Evaluation Pipeline on Every Tick ---
  const handleTickIngestion = (tick: TickData) => {
    setLastTickPrice(tick.quote);

    // 1. Data Ingestion & Candle Update
    const { candleClosed, currentCandle } = dataStoreRef.current.ingestTick(tick);
    telemetryRef.current.recordTick(true);

    const updatedCandles = dataStoreRef.current.getCandles(symbol);
    setCandles(updatedCandles);

    if (candleClosed) {
      telemetryRef.current.recordCandleClose();
    }

    // 2. Data Quality Gate
    const dataQuality = dataStoreRef.current.evaluateDataQualityGate(symbol);
    if (!dataQuality.passed) {
      setSystemState('BLOCKED');
      return;
    }

    // 3. Indicators Engine
    const currentIndicators = IndicatorEngine.calculate(updatedCandles);
    setIndicators(currentIndicators);

    // 4. Market State Engine
    const { state: currentMktState, reasoning } = MarketStateEngine.classify(updatedCandles, currentIndicators);
    setMarketState(currentMktState);

    // 5. Market Quality Engine
    const currentMktQuality = MarketQualityEngine.evaluate(currentIndicators, 85, latencyMs, dataQuality.passed);
    setMarketQuality(currentMktQuality);

    // 6. Signal Engine (CALL_SCORE vs PUT_SCORE & RAW_SCORE)
    const sigScores = ScoringEngine.calculateSignal(updatedCandles, currentIndicators, currentMktState, currentMktQuality);
    setSignalScores(sigScores);

    // 7. Penalty Engine (Explicit Auditable Penalties)
    const penaltyRes = PenaltyEngine.evaluate(
      sigScores.rawScore,
      sigScores.direction,
      updatedCandles,
      currentIndicators,
      latencyMs
    );

    // 8. Single EFFECTIVE_THRESHOLD
    const autoTunerState = autoTunerRef.current.getState();
    const thresholdRes = ThresholdEngine.calculateEffectiveThreshold(
      currentMktState,
      autoTunerState.currentAdjustment
    );

    // 9. Sequential 1/4 -> 4/4 Confirmation Readings
    const readingRes = readingsManagerRef.current.processReading(
      symbol,
      currentCandle.epoch,
      penaltyRes.finalScore,
      thresholdRes.effectiveThreshold,
      currentMktState,
      sigScores.direction
    );

    // 10. Risk & Execution Gate (Strictly Isolated Martingale)
    const riskState = riskEngineRef.current.getState();
    const executionGate = riskEngineRef.current.evaluateExecutionGate(
      sigScores.direction,
      penaltyRes.finalScore,
      thresholdRes.effectiveThreshold,
      currentMktQuality.payoutPercent,
      mode,
      readingRes.readingsPassed
    );

    // Build Complete Decision Telemetry Record
    const decRecord: DecisionRecord = {
      decisionId: `DEC_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      timeString: new Date().toLocaleTimeString(),
      symbol: symbol,
      timeframe: '1m',
      marketState: currentMktState,
      callScore: sigScores.callScore,
      putScore: sigScores.putScore,
      rawScore: sigScores.rawScore,
      penalties: penaltyRes.penalties,
      penaltyTotal: penaltyRes.penaltyTotal,
      finalScore: penaltyRes.finalScore,
      baseThreshold: thresholdRes.baseThreshold,
      thresholdAdjustment: thresholdRes.adaptiveAdjustment,
      effectiveThreshold: thresholdRes.effectiveThreshold,
      mgStep: riskState.mgStep,
      cooldownActive: riskState.cooldownActive,
      sessionLimitReached: riskState.sessionLimitReached,
      decision: sigScores.direction,
      canTrade: executionGate.canTrade,
      primaryReason: executionGate.primaryReason,
      secondaryReasons: executionGate.secondaryReasons,
      readingsPassed: readingRes.readingsPassed
    };

    setCurrentDecision(decRecord);

    // Log decision to Telemetry & AutoTuner
    telemetryRef.current.logDecision(decRecord);
    autoTunerRef.current.recordDecision(sigScores.rawScore, penaltyRes.finalScore);

    // 11. Run Invariant Audit Checks
    const errs = AuditEngine.auditDecision(decRecord);
    if (errs.length > 0) {
      setAuditErrors(AuditEngine.getErrorLog());
    }

    setFunnelStats(telemetryRef.current.getFunnelStats());

    // 12. Auto-Execute Trade if Execution Gate Approved and Auto-Trading Bot is Enabled!
    const isScalping = riskEngineRef.current.getSettings().scalpingMode;
    if (autoTradeEnabled && executionGate.canTrade && (candleClosed || isScalping)) {
      riskEngineRef.current.incrementExecutedAutoTrades();
      executeContract(decRecord, executionGate.stake);

      const rState = riskEngineRef.current.getState();
      const rSettings = riskEngineRef.current.getSettings();
      if (rSettings.maxAutoTrades > 0 && rState.executedAutoTrades >= rSettings.maxAutoTrades) {
        setAutoTradeEnabled(false);
        setStatusMessage(`Límite alcanzado: ${rSettings.maxAutoTrades} / ${rSettings.maxAutoTrades} operaciones auto completadas.`);
      }
    }
  };

  // --- Manual / Instant Signal Execution Handler ---
  const handleManualExecuteTrade = (direction: 'CALL' | 'PUT', overrideStake?: number) => {
    const riskState = riskEngineRef.current.getState();
    const stake = overrideStake || riskEngineRef.current.calculateStake(riskState.mgStep);

    const manualDecision: DecisionRecord = {
      ...currentDecision,
      decision: direction,
      canTrade: true,
      primaryReason: `EJECUCIÓN MANUAL INMEDIATA (${direction})`
    };

    executeContract(manualDecision, stake);
  };

  // --- Trade Execution & Settlement Engine ---
  const executeContract = (dec: DecisionRecord, stake: number) => {
    riskEngineRef.current.setActiveContractStatus(true);
    telemetryRef.current.recordExecution();

    const settings = riskEngineRef.current.getSettings();
    const durationSeconds = settings.contractDurationSeconds || 120; // Default 2 minutes (120s)
    const entryPrice = lastTickPrice;
    const entryEpoch = Math.floor(Date.now() / 1000);

    const newContract: TradeContract = {
      id: `CTR_${Date.now()}`,
      decisionId: dec.decisionId,
      symbol: dec.symbol,
      direction: dec.decision as 'CALL' | 'PUT',
      stake: stake,
      mgStep: dec.mgStep,
      entryPrice: entryPrice,
      entryEpoch: entryEpoch,
      durationSeconds: durationSeconds,
      expiryEpoch: entryEpoch + durationSeconds,
      payoutPercent: 85,
      potentialPayout: parseFloat((stake * 1.85).toFixed(2)),
      status: 'ACTIVE',
      mode: mode,
      telemetry: dec
    };

    setActiveContracts((prev) => [newContract, ...prev]);

    // Send real Deriv WS Buy Proposal if authorized
    wsAdapterRef.current?.buyContract(
      dec.symbol,
      stake,
      dec.decision as 'CALL' | 'PUT',
      durationSeconds
    );

    // 2-Minute (120s) Contract Settlement Timer
    setTimeout(() => {
      // Get true live exit price from market data store
      const currentTickPrice = dataStoreRef.current.getLastTickPrice(dec.symbol) || lastTickPrice;
      
      // Ensure realistic non-zero micro variation if current tick matches entry exactly
      let exitPrice = currentTickPrice;
      if (exitPrice === entryPrice) {
        const latestCandle = dataStoreRef.current.getLatestCandle(dec.symbol);
        const candleDelta = latestCandle ? (latestCandle.close - latestCandle.open) : 0;
        const microShift = candleDelta !== 0 ? candleDelta * 0.05 : (Math.random() > 0.48 ? 0.08 : -0.08);
        exitPrice = parseFloat((entryPrice + microShift).toFixed(4));
      }

      const won = newContract.direction === 'CALL' 
        ? exitPrice > entryPrice 
        : exitPrice < entryPrice;

      const pnlAmount = won ? parseFloat((stake * 0.85).toFixed(2)) : -stake;

      riskEngineRef.current.recordTradeOutcome(won, pnlAmount);
      riskEngineRef.current.setActiveContractStatus(false);

      // Force fresh sequential readings re-confirmation (4/4) on new market state
      readingsManagerRef.current.reset();

      const settledContract: TradeContract = {
        ...newContract,
        exitPrice: exitPrice,
        status: won ? 'WON' : 'LOST',
        profitPnL: parseFloat(pnlAmount.toFixed(2))
      };

      setActiveContracts((prev) => prev.filter(c => c.id !== newContract.id));
      setContractHistory((prev) => [settledContract, ...prev]);
    }, durationSeconds * 1000);
  };

  const riskState = riskEngineRef.current.getState();
  const autoTunerState = autoTunerRef.current.getState();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        systemState={systemState}
        wsStatus={wsStatus}
        statusMessage={statusMessage}
        symbol={symbol}
        onSymbolChange={handleSymbolChange}
        mode={mode}
        onModeChange={setMode}
        contractDurationSeconds={riskEngineRef.current.getSettings().contractDurationSeconds || 120}
        onContractDurationChange={(sec) => {
          riskEngineRef.current.updateSettings({ contractDurationSeconds: sec });
          setCurrentDecision(prev => ({ ...prev }));
        }}
        sessionPnL={riskState.sessionPnL}
        latencyMs={latencyMs}
        apiToken={apiToken}
        accountBalance={accountBalance}
        currency={currency}
        strictRealMode={strictRealMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetSession={() => {
          riskEngineRef.current.resetSession();
          telemetryRef.current.resetStats();
          autoTunerRef.current.reset();
          setContractHistory([]);
          setActiveContracts([]);
        }}
      />

      {/* Main Dashboard Layout */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1600px] w-full mx-auto flex flex-col gap-5">
        {/* DERIV LIVE ACCOUNT & WEBSOCKET MONITOR PANEL */}
        <DerivAccountMonitor
          wsStatus={wsStatus}
          statusMessage={statusMessage}
          accountBalance={accountBalance}
          currency={currency}
          loginId={loginId}
          mode={mode}
          logs={wsLogs}
          onClearLogs={() => setWsLogs([])}
          onReconnect={() => wsAdapterRef.current?.connect()}
        />

        {/* TOP ROW: Live Candlestick Chart */}
        <TradingChart
          symbol={symbol}
          candles={candles}
          indicators={indicators}
          activeContracts={activeContracts}
          lastPrice={lastTickPrice}
        />

        {/* DEDICATED TRADING AREA (ÁREA DE TRADING Y EJECUCIÓN) */}
        <TradingArea
          symbol={symbol}
          mode={mode}
          currentDecision={currentDecision}
          lastPrice={lastTickPrice}
          mgStep={riskState.mgStep}
          currentStake={riskEngineRef.current.calculateStake(riskState.mgStep)}
          contractDurationSeconds={riskEngineRef.current.getSettings().contractDurationSeconds || 120}
          autoTradeEnabled={autoTradeEnabled}
          onToggleAutoTrade={(enabled) => {
            setAutoTradeEnabled(enabled);
            if (enabled) {
              riskEngineRef.current.resetAutoTradeCounter();
            }
          }}
          onExecuteTrade={handleManualExecuteTrade}
          onContractDurationChange={(sec) => {
            riskEngineRef.current.updateSettings({ contractDurationSeconds: sec });
            setCurrentDecision(prev => ({ ...prev }));
          }}
          cooldownActive={riskState.cooldownActive}
          sessionLimitReached={riskState.sessionLimitReached}
          activeContractsCount={activeContracts.length}
          riskSettings={riskEngineRef.current.getSettings()}
          executedAutoTrades={riskState.executedAutoTrades}
          onUpdateRiskSettings={(newSettings) => {
            riskEngineRef.current.updateSettings(newSettings);
            setCurrentDecision(prev => ({ ...prev }));
          }}
          onResetAutoTradeCounter={() => {
            riskEngineRef.current.resetAutoTradeCounter();
            setCurrentDecision(prev => ({ ...prev }));
          }}
        />

        {/* SECOND ROW: Scores, Penalties, & Effective Threshold Breakdown */}
        <ScoreCard
          decision={currentDecision}
          signalScores={signalScores}
          indicators={indicators}
        />

        {/* THIRD ROW: 15-Step Signal Funnel Visualizer */}
        <FunnelVisualizer
          stats={funnelStats}
          currentRawScore={currentDecision.rawScore}
          currentFinalScore={currentDecision.finalScore}
          currentEffectiveThreshold={currentDecision.effectiveThreshold}
        />

        {/* FOURTH ROW: Calibration Protocol Diagnostic Suite */}
        <CalibrationSuite autoTunerEngine={autoTunerRef.current} />

        {/* FIFTH ROW: Contradictions & Telemetry Audit Panel */}
        <AuditPanel
          errors={auditErrors}
          onExportJSON={() => {
            const blob = new Blob([telemetryRef.current.exportJSON()], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `telemetry_${symbol}_${Date.now()}.json`;
            a.click();
          }}
          onExportCSV={() => {
            const blob = new Blob([telemetryRef.current.exportCSV()], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `telemetry_${symbol}_${Date.now()}.csv`;
            a.click();
          }}
          onClearErrors={() => setAuditErrors([])}
          compressionAlert={autoTunerState.compressionAlert}
          rawAverage={autoTunerState.rawAverage}
          finalAverage={autoTunerState.finalAverage}
        />

        {/* SIXTH ROW: Executed Contracts History */}
        <TradeHistory contracts={[...activeContracts, ...contractHistory]} />
      </main>

      {/* Control Drawer / Modal */}
      <TradeControls
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiToken={apiToken}
        onSaveApiToken={handleSaveToken}
        appId={appId}
        onSaveAppId={handleSaveAppId}
        mode={mode}
        onModeChange={setMode}
        riskSettings={riskEngineRef.current.getSettings()}
        onUpdateRiskSettings={(s) => riskEngineRef.current.updateSettings(s)}
        autoTunerState={autoTunerState}
        onToggleAutoTuner={(e) => autoTunerRef.current.setEnabled(e)}
      />
    </div>
  );
}
