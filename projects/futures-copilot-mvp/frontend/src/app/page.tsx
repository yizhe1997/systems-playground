'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ArrowUpRight, TrendingUp, Activity, AlertTriangle, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Public Data
const MOCK_STATS = {
  winRate: 68.5,
  avgRR: 2.1,
  totalTrades: 42,
  profitFactor: 1.8
};

const MOCK_ACTIVE = {
  id: 't-043',
  status: 'working',
  instrument: 'GC',
  bias: 'Long',
  entry: '2350.5',
  stopLoss: '2345.0',
  takeProfit: '2365.0',
  riskReward: '2.7',
  notes: 'Testing major daily demand block with strong 15m bullish divergence.',
  imageUrl: 'https://s3.tradingview.com/snapshots/a/aB1Cd2Ef.png' // Mock TV snapshot
};

const MOCK_HISTORY = [
  {
    id: 't-042',
    instrument: 'NQ',
    bias: 'Short',
    outcome: 'WIN',
    pnl: '+850',
    date: 'Apr 12, 2026'
  },
  {
    id: 't-041',
    instrument: 'ES',
    bias: 'Long',
    outcome: 'LOSS',
    pnl: '-300',
    date: 'Apr 11, 2026'
  },
  {
    id: 't-040',
    instrument: 'GC',
    bias: 'Short',
    outcome: 'WIN',
    pnl: '+1200',
    date: 'Apr 10, 2026'
  }
];

export default function ShowroomPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div className="w-full relative">
      <main className="max-w-[1200px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">
        

        {/* Hero Section */}
        <div className="text-center mb-24">
          <h1 className="text-4xl md:text-7xl font-bold tracking-tighter uppercase mb-6">
            Futures Copilot
          </h1>
          <p className="font-mono text-xs md:text-sm uppercase tracking-widest opacity-60 max-w-2xl mx-auto leading-relaxed">
            An AI-assisted trading journal for Institutional Supply & Demand levels. 
            Radical transparency. No black-box algorithms. Just disciplined, level-based execution audited by artificial intelligence.
          </p>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black dark:bg-white border border-black dark:border-white mb-24">
          <div className="bg-white dark:bg-black p-6 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">WIN RATE</div>
            <div className="text-3xl font-mono">{MOCK_STATS.winRate}%</div>
          </div>
          <div className="bg-white dark:bg-black p-6 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">AVG R:R</div>
            <div className="text-3xl font-mono">1 : {MOCK_STATS.avgRR}</div>
          </div>
          <div className="bg-white dark:bg-black p-6 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">PROFIT FACTOR</div>
            <div className="text-3xl font-mono">{MOCK_STATS.profitFactor}</div>
          </div>
          <div className="bg-white dark:bg-black p-6 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">LOGGED TRADES</div>
            <div className="text-3xl font-mono">{MOCK_STATS.totalTrades}</div>
          </div>
        </div>

        {/* One Column Layout */}
        <div className="flex flex-col gap-24">
          
          {/* Active Trade */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-mono text-sm uppercase tracking-widest font-bold">LIVE RADAR</h2>
            </div>

            <div className="bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)]">
              <div className="bg-white dark:bg-black h-full [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)] flex flex-col">
                
                {/* Header */}
                <div className={`p-4 flex justify-between items-center text-white ${MOCK_ACTIVE.bias === 'Long' ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-rose-600 dark:bg-rose-700'}`}>
                  <div className="font-mono text-sm uppercase tracking-widest font-bold flex items-center gap-3">
                    <Activity className="w-4 h-4" />
                    <span>{MOCK_ACTIVE.bias} {MOCK_ACTIVE.instrument}</span>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest">
                    [{MOCK_ACTIVE.status}]
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-black dark:border-white">
                    {/* Context */}
                    <div className="p-8 border-b lg:border-b-0 lg:border-r border-black dark:border-white">
                      <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">AI COPILOT CONTEXT</div>
                      <p className="font-mono text-sm leading-relaxed uppercase">
                        &quot;{MOCK_ACTIVE.notes}&quot;
                      </p>
                    </div>

                    {/* Levels */}
                    <div className="p-8 grid grid-cols-3 gap-6">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">ENTRY</div>
                        <div className="font-mono text-3xl">{MOCK_ACTIVE.entry}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">STOP LOSS</div>
                        <div className="font-mono text-xl text-rose-600 dark:text-rose-400">{MOCK_ACTIVE.stopLoss}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">TARGET</div>
                        <div className="font-mono text-xl text-emerald-600 dark:text-emerald-400">{MOCK_ACTIVE.takeProfit}</div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full flex flex-col items-center justify-center p-8 bg-[#f8f8f8] dark:bg-[#111] min-h-[500px] flex-grow">
                    <span className="font-mono text-[10px] uppercase tracking-widest mb-2">[TRADINGVIEW SNAPSHOT INJECTED HERE]</span>
                    <span className="font-mono text-xs opacity-50 text-center break-all">{MOCK_ACTIVE.imageUrl}</span>
                  </div>
                </div>
                </div>

                {/* CTA */}
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111] text-center">
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">WANT INSTANT ALERTS WHEN THIS FILLS?</p>
                  <button 
                    onClick={() => setIsPricingOpen(true)}
                    className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity inline-flex items-center gap-2"
                  >
                    SUBSCRIBE FOR NOTIFICATIONS <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* History Row */}
          <div className="mt-24">
            <h2 className="font-mono text-sm uppercase tracking-widest font-bold mb-6">RECENT OUTCOMES</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {MOCK_HISTORY.map(trade => (
                <a key={trade.id} href="#" className="group block border border-black dark:border-white p-6 hover:bg-[#f8f8f8] dark:hover:bg-[#111] transition-colors">
                  <div className="pb-3 border-b border-black/20 dark:border-white/20 group-hover:border-black dark:group-hover:border-white transition-colors">
                    <div className="p-2 flex justify-between bg-black text-white dark:bg-white dark:text-black">
                      <div className="text-xl font-bold tracking-tighter uppercase leading-none flex items-center gap-3">
                        {trade.bias} {trade.instrument}
                      </div>
                      <div className={`font-mono text-[10px] leading-none ${
                        trade.outcome === 'WIN' ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {trade.outcome}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 font-mono text-xs opacity-60 flex flex-col h-[3em] justify-end">
                    <div className="flex justify-between items-end">
                      <div>
                        <div>{trade.date}</div>
                        <div className="overflow-hidden h-[1.2em] relative mt-2 w-32">
                          <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)]">
                            <span className="font-bold text-black dark:text-white">→ View log</span>
                          </div>
                        </div>
                      </div>
                      <div className={`text-2xl font-bold ${trade.pnl.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {trade.pnl}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="flex justify-center mt-12">
              <button className="px-8 py-4 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                VIEW FULL JOURNAL
              </button>
            </div>
        </div>
      </main>

      {/* Slide-out Pricing Modal */}
      <AnimatePresence>
        {isPricingOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-40"
              onClick={() => setIsPricingOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-50"
            >
              <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
                <div className="p-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">SUBSCRIBE TO ALERTS</h2>
                  <button onClick={() => setIsPricingOpen(false)} className="hover:opacity-50 transition-opacity">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto">
                  <h3 className="font-mono text-4xl font-bold tracking-tighter uppercase mb-2">$49 / MO</h3>
                  <p className="font-mono text-xs uppercase opacity-60 mb-8 leading-relaxed">
                    Gain instant real-time notifications for every trade lifecycle event.
                  </p>

                  <div className="space-y-4 mb-12">
                    {[
                      'Instant Discord / Telegram Pings',
                      'Access to private Trade Log Database',
                      'See real-time entries, SL, & TP adjustments',
                      'Post-Trade AI Retrospectives'
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="font-mono text-xs uppercase leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border border-black dark:border-white p-6 bg-[#f8f8f8] dark:bg-[#111]">
                    <p className="font-mono text-[10px] uppercase opacity-60 mb-4 text-center">SECURE PAYMENT VIA STRIPE</p>
                    <button className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity">
                      START SUBSCRIPTION
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}