/**
 * Type definitions for Deriv Adaptive Trading Engine
 */

export type SymbolCode = 
  | 'R_10' | 'R_25' | 'R_50' | 'R_75' | 'R_100'
  | '1HZ10V' | '1HZ25V' | '1HZ50V' | '1HZ75V' | '1HZ100V'
  | 'BOOM500' | 'BOOM1000' | 'CRASH500' | 'CRASH1000'
  | 'JD10' | 'JD25' | 'JD50' | 'JD75' | 'JD100';

export interface SymbolInfo {
  code: SymbolCode;
  name: string;
  category: 'Volatility' | '1s Volatility' | 'Boom/Crash' | 'Jump';
  pipSize: number;
}

export type MarketState = 
  | 'TREND_UP'
  | 'TREND_DOWN'
  | 'PULLBACK'
  | 'BREAKOUT'
  | 'CONTINUATION'
  | 'RANGE'
  | 'MIXED'
  | 'UNKNOWN';

export type OperatingMode = 'ANALYSIS' | 'DEMO' | 'LIVE';

export type DecisionDirection = 'CALL' | 'PUT' | 'NO_TRADE';

export type GlobalSystemState = 
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SYNCING'
  | 'ANALYZING'
  | 'SIGNAL_CANDIDATE'
  | 'WAITING_CONFIRMATION'
  | 'READY_TO_TRADE'
  | 'EXECUTING'
  | 'CONTRACT_ACTIVE'
  | 'SETTLED'
  | 'COOLDOWN'
  | 'BLOCKED'
  | 'ERROR';

export interface TickData {
  symbol: SymbolCode;
  quote: number;
  epoch: number;
  time: string;
}

export interface CandleData {
  symbol: SymbolCode;
  open: number;
  high: number;
  low: number;
  close: number;
  epoch: number; // Start epoch in seconds
  time: string;
  isClosed: boolean;
  volume?: number;
}

export interface TechnicalIndicators {
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  rsi: number;
  adx: number;
  plusDI: number;
  minusDI: number;
  atr: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  macdLine: number;
  macdSignal: number;
  macdHist: number;
}

export interface MarketQuality {
  score: number; // 0-100
  adxStrength: number;
  volatilityStability: number;
  payoutPercent: number;
  latencyMs: number;
  dataQualityPass: boolean;
  reasons: string[];
}

export interface PenaltyItem {
  name: string;
  description: string;
  points: number; // Positive number representing points subtracted
}

export interface ComponentScores {
  trendStrength: number; // 25%
  entryTiming: number;   // 30%
  trendQuality: number;  // 15%
  momentum: number;      // 10%
  marketQuality: number; // 10%
  visionStructure: number;// 10%
}

export interface SignalScores {
  callScore: number;
  putScore: number;
  rawScore: number;
  direction: DecisionDirection;
  edge: number;
  components: ComponentScores;
}

export interface ThresholdConfig {
  baseThresholds: Record<MarketState, number>;
  minThreshold: number;
  maxThreshold: number;
  maxAdjustmentPerCycle: number;
}

export interface ReadingStep {
  readingNumber: number; // 1, 2, 3, 4
  candleEpoch: number;
  candidateScore: number;
  effectiveThreshold: number;
  marketState: MarketState;
  direction: DecisionDirection;
  passed: boolean;
  timestamp: number;
}

export interface DecisionRecord {
  decisionId: string;
  timestamp: number;
  timeString: string;
  symbol: SymbolCode;
  timeframe: string;
  marketState: MarketState;
  callScore: number;
  putScore: number;
  rawScore: number;
  penalties: PenaltyItem[];
  penaltyTotal: number;
  finalScore: number;
  baseThreshold: number;
  thresholdAdjustment: number;
  effectiveThreshold: number;
  mgStep: number;
  cooldownActive: boolean;
  sessionLimitReached: boolean;
  decision: DecisionDirection;
  canTrade: boolean;
  primaryReason: string;
  secondaryReasons: string[];
  readingsPassed: number; // 0 to 4
}

export interface RiskState {
  mgStep: number;
  lossStreak: number;
  cooldownActive: boolean;
  cooldownEndsAt: number;
  sessionLimitReached: boolean;
  riskLocked: boolean;
  currentDrawdown: number;
  sessionPnL: number;
  totalTrades: number;
  executedAutoTrades: number;
  wins: number;
  losses: number;
}

export interface RiskSettings {
  initialStake: number;
  mgMultiplier: number;
  maxMgSteps: number;
  stopLossAmount: number;
  takeProfitAmount: number;
  maxDrawdownPct: number;
  cooldownDurationSeconds: number;
  contractDurationSeconds: number;
  minPayoutPercent: number;
  autoTunerEnabled: boolean;
  maxAutoTrades: number;
  scalpingMode: boolean;
  scalpingReadingsRequired: number;
}

export interface TradeContract {
  id: string;
  decisionId: string;
  symbol: SymbolCode;
  direction: 'CALL' | 'PUT';
  stake: number;
  mgStep: number;
  entryPrice: number;
  exitPrice?: number;
  entryEpoch: number;
  durationSeconds: number;
  expiryEpoch: number;
  payoutPercent: number;
  potentialPayout: number;
  status: 'ACTIVE' | 'WON' | 'LOST' | 'ERROR';
  profitPnL?: number;
  mode: OperatingMode;
  telemetry: DecisionRecord;
}

export interface FunnelStats {
  ticksReceived: number;
  validDataTicks: number;
  candlesReconstructed: number;
  validMarketState: number;
  validMarketQuality: number;
  validDirectionEdge: number;
  rawScoreCalculated: number;
  rawScoreAboveBase: number;
  penaltiesApplied: number;
  finalScoreCalculated: number;
  finalScoreAboveEffective: number;
  sequentialReadingsPassed: number;
  payoutGatePassed: number;
  riskGateApproved: number;
  executedTrades: number;
}

export interface ContradictionError {
  id: string;
  timestamp: number;
  timeString: string;
  code: string;
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  details: Record<string, any>;
}

export interface AutoTunerState {
  enabled: boolean;
  sampleCount: number;
  minSamples: number; // e.g. 100
  rollingWindow: number; // 200
  currentAdjustment: number; // -5 to +5
  status: 'OBSERVE_ONLY' | 'ACTIVE_TUNING';
  rawAverage: number;
  finalAverage: number;
  compressionAlert: boolean;
  suggestedAction: string;
}
