/**
 * TradingChart Component
 * High-performance real-time Candlestick & Tick Chart rendered with HTML5 Canvas / Lightweight Charts.
 * Overlays EMA 9, EMA 21, Bollinger Bands, and trade entry execution markers.
 */

import React, { useEffect, useRef } from 'react';
import { CandleData, SymbolCode, TechnicalIndicators, TradeContract } from '../types/trading';
import { Maximize2, TrendingUp, BarChart2 } from 'lucide-react';

interface TradingChartProps {
  symbol: SymbolCode;
  candles: CandleData[];
  indicators: TechnicalIndicators;
  activeContracts: TradeContract[];
  lastPrice: number;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  candles,
  indicators,
  activeContracts,
  lastPrice
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI crisp canvas rendering
    const rect = canvas.parentElement?.getBoundingClientRect();
    const width = rect?.width || 800;
    const height = rect?.height || 380;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    if (candles.length < 5) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for tick data and candle stream...', width / 2, height / 2);
      return;
    }

    // Display slice of latest 40 candles
    const visibleCount = Math.min(candles.length, 45);
    const visibleCandles = candles.slice(-visibleCount);

    // Compute min/max price for auto-scaling
    let minP = Math.min(...visibleCandles.map(c => c.low));
    let maxP = Math.max(...visibleCandles.map(c => c.high));

    // Pad range by 5%
    const pPadding = (maxP - minP) * 0.08 || 1;
    minP -= pPadding;
    maxP += pPadding;

    const chartHeight = height - 40; // reserve bottom for time axis
    const chartWidth = width - 70;  // reserve right for price axis

    const getX = (index: number) => {
      const step = chartWidth / (visibleCount - 0.5);
      return index * step + step / 2;
    };

    const getY = (price: number) => {
      return chartHeight - ((price - minP) / (maxP - minP)) * chartHeight + 10;
    };

    // Draw grid lines
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (chartHeight / 5) * i + 10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price label on right axis
      const pVal = maxP - ((maxP - minP) / 5) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(pVal.toFixed(2), chartWidth + 8, y + 3);
    }

    // Draw Bollinger Bands if valid
    if (indicators.bbUpper > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)'; // sky-400 opacity
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // BB Upper Line
      const yBBUpper = getY(indicators.bbUpper);
      ctx.beginPath();
      ctx.moveTo(0, yBBUpper);
      ctx.lineTo(chartWidth, yBBUpper);
      ctx.stroke();

      // BB Lower Line
      const yBBLower = getY(indicators.bbLower);
      ctx.beginPath();
      ctx.moveTo(0, yBBLower);
      ctx.lineTo(chartWidth, yBBLower);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Draw EMA 9 & EMA 21 Trend Lines
    if (indicators.ema9 > 0 && indicators.ema21 > 0) {
      const yEMA9 = getY(indicators.ema9);
      ctx.strokeStyle = '#10b981'; // emerald-500
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, yEMA9);
      ctx.lineTo(chartWidth, yEMA9);
      ctx.stroke();

      const yEMA21 = getY(indicators.ema21);
      ctx.strokeStyle = '#f59e0b'; // amber-500
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, yEMA21);
      ctx.lineTo(chartWidth, yEMA21);
      ctx.stroke();
    }

    // Draw Candlesticks
    const candleWidth = Math.max(3, (chartWidth / visibleCount) * 0.65);

    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const yOpen = getY(c.open);
      const yClose = getY(c.close);
      const yHigh = getY(c.high);
      const yLow = getY(c.low);

      const isBull = c.close >= c.open;
      const color = isBull ? '#10b981' : '#f43f5e'; // emerald-500 / rose-500

      // High to Low Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Candle Body
      ctx.fillStyle = color;
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Time axis labels (every 8 candles)
      if (i % 8 === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.time, x, height - 10);
      }
    });

    // Draw Active Contract Entry Lines & Markers
    activeContracts.forEach((contract) => {
      if (contract.entryPrice > 0) {
        const yEntry = getY(contract.entryPrice);
        const isCall = contract.direction === 'CALL';

        ctx.strokeStyle = isCall ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(0, yEntry);
        ctx.lineTo(chartWidth, yEntry);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge
        ctx.fillStyle = isCall ? '#10b981' : '#f43f5e';
        ctx.fillRect(10, yEntry - 10, 85, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${contract.direction} @ ${contract.entryPrice}`, 52, yEntry + 3);
      }
    });

    // Draw Current Live Price Line
    if (lastPrice > 0) {
      const yLast = getY(lastPrice);
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, yLast);
      ctx.lineTo(chartWidth, yLast);
      ctx.stroke();

      // Right Axis Price Tag
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(chartWidth + 2, yLast - 10, 65, 20);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lastPrice.toFixed(2), chartWidth + 34, yLast + 4);
    }

  }, [candles, indicators, activeContracts, lastPrice]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col h-[400px]">
      {/* Chart Header Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-slate-100 text-sm sm:text-base">{symbol} M1 Candlesticks</span>
          <span className="text-xs text-slate-400 font-mono">Live Stream</span>
        </div>

        {/* Indicators Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300">EMA9 ({indicators.ema9})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-300">EMA21 ({indicators.ema21})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span className="text-slate-300">RSI ({indicators.rsi})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
            <span className="text-slate-300">ADX ({indicators.adx})</span>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative w-full h-full min-h-[300px]">
        <canvas ref={canvasRef} className="w-full h-full rounded-lg" />
      </div>
    </div>
  );
};
