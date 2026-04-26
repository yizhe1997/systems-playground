'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import TradingViewWidget from '@/components/TradingViewWidget';
import { getTradingViewSymbolCandidates, resolveTradingViewSymbol } from '@/lib/instruments';
import { InstrumentDefinition, Trade } from '../../types';

interface ReplayTradePanelProps {
  trade: Trade | null;
  instruments: InstrumentDefinition[];
  onClose: () => void;
}

export function ReplayTradePanel({ trade, instruments, onClose }: ReplayTradePanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [isWidgetReady, setIsWidgetReady] = useState(true);

  const symbolCandidates = getTradingViewSymbolCandidates(trade?.instrument || '', instruments);
  const replaySymbol = symbolCandidates[Math.min(symbolIndex, symbolCandidates.length - 1)] || resolveTradingViewSymbol(trade?.instrument || '', instruments);

  const replayPrice = useMemo(() => {
    if (!trade) return null;

    const entry = Number(trade.entry);
    const stop = Number(trade.stopLoss);
    const target = Number(trade.takeProfit);

    if (!Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(target)) {
      return null;
    }

    const outcome = (trade.riskAmount || 0) > 0 ? target : (trade.riskAmount || 0) < 0 ? stop : entry;
    return (entry + (outcome - entry) * (progress / 100)).toFixed(2);
  }, [trade, progress]);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setSymbolIndex(0);
    setIsWidgetReady(true);
  }, [trade?.id]);

  useEffect(() => {
    if (!isPlaying || !trade) {
      return;
    }

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }

        return Math.min(100, prev + 5);
      });
    }, 300);

    return () => clearInterval(timer);
  }, [isPlaying, trade]);

  return (
    <AnimatePresence>
      {trade && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 dark:bg-white/10 backdrop-blur-sm z-[109]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-black dark:bg-white p-[1px] z-[110]"
          >
            <div className="bg-white dark:bg-black h-full flex flex-col">
              <div className="px-6 py-5 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                <h2 className="font-mono text-sm uppercase tracking-widest font-bold">
                  TRADE REPLAY [{trade.id}]
                </h2>
                <button onClick={onClose} className="hover:opacity-50 transition-opacity">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 border-b border-black dark:border-white grid grid-cols-3 gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">ENTRY</div>
                  <div className="font-mono text-xl">{trade.entry.toFixed(2)}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">STOP LOSS</div>
                  <div className="font-mono text-lg text-rose-600 dark:text-rose-400">{trade.stopLoss.toFixed(2)}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">TARGET</div>
                  <div className="font-mono text-lg text-emerald-600 dark:text-emerald-400">{trade.takeProfit.toFixed(2)}</div>
                </div>
              </div>

              <div className="px-6 py-3 border-b border-black dark:border-white flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest">
                <span className="opacity-60">Replay Source [{replaySymbol}]</span>
                <div className="flex gap-2">
                  {symbolCandidates.length > 1 && (
                    <button
                      onClick={() => setSymbolIndex(prev => (prev + 1) % symbolCandidates.length)}
                      className="px-2 py-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                      ALT SOURCE
                    </button>
                  )}
                  <button
                    onClick={() => setIsPlaying(prev => !prev)}
                    className="px-2 py-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors inline-flex items-center gap-1"
                  >
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                  </button>
                  <button
                    onClick={() => {
                      setProgress(0);
                      setIsPlaying(false);
                    }}
                    className="px-2 py-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> RESET
                  </button>
                </div>
              </div>

              {!isWidgetReady && (
                <div className="px-6 py-3 border-b border-black dark:border-white bg-amber-100/60 dark:bg-amber-900/20 font-mono text-[10px] uppercase tracking-widest text-amber-800 dark:text-amber-200">
                  Chart provider unavailable. Try alternate source.
                </div>
              )}

              <div className="flex-grow bg-[#f8f8f8] dark:bg-[#111]">
                <TradingViewWidget
                  symbol={replaySymbol}
                  onWidgetReady={() => setIsWidgetReady(true)}
                  onScriptError={() => setIsWidgetReady(false)}
                />
              </div>

              <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                <div className="h-2 border border-black dark:border-white">
                  <div className="h-full bg-black dark:bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-widest opacity-70">
                  Replay progress: {progress}% {replayPrice ? `| Sim price ${replayPrice}` : ''}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
