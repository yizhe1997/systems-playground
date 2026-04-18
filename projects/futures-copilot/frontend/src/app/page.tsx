'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Activity } from 'lucide-react';

import useSWR from 'swr';
import TradingViewWidget from '@/components/TradingViewWidget';
import { fetcher, API_ENDPOINTS } from '@/lib/dashboard/api';

interface RecentTrade {
  id: string;
  instrument: string;
  bias: string;
  status: string;
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN' | string;
  updatedAt?: string;
  pnl?: number;
}

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

import { useSession } from 'next-auth/react';

export default function ShowroomPage() {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || 'ANON';
  
  const { data: trades } = useSWR(API_ENDPOINTS.trades, fetcher, { fallbackData: [] });
  const recentTrades: RecentTrade[] = ((trades || []) as RecentTrade[]).filter(t => t.status === 'closed').slice(0, 3);

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
        <div className="flex flex-col gap-24 min-h-screen">
          
          {/* Active Trade */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-mono text-sm uppercase tracking-widest font-bold">LIVE RADAR</h2>
            </div>

            <div className="flex flex-col gap-0">
              <div className="border border-black dark:border-white border-b-0 bg-white dark:bg-black flex flex-col">
                
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

                <div className="flex flex-col flex-grow">
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

                  <div className="w-full flex flex-col items-center justify-center bg-[#f8f8f8] dark:bg-[#111] min-h-[500px] flex-grow overflow-hidden relative border-t md:border-t-0 border-black dark:border-white">
                    <TradingViewWidget symbol="COMEX:GC1!" />
                    <div className="absolute inset-0 bg-black/5 dark:bg-white/5 mix-blend-overlay pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)]">
                <div className="bg-white dark:bg-black h-full p-6 text-center [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)]">
                  {userRole === 'ANON' ? (
                    <>
                      <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">WANT TRADE ALERTS BEFORE MARKET OPENS?</p>
                      <Link href="/pricing" className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity inline-flex items-center gap-2">
                        SUBSCRIBE FOR NOTIFICATIONS <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">YOU ARE SUBSCRIBED TO THIS SIGNAL</p>
                      <Link href="/alerts" className="px-6 py-3 border border-black dark:border-white font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors inline-flex items-center gap-2">
                        MANAGE ALERT CHANNELS <Activity className="w-4 h-4" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-24">
            <h2 className="font-mono text-sm uppercase tracking-widest font-bold mb-6">RECENT OUTCOMES</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentTrades.map(trade => {
                const pnl = trade.pnl ?? 0;

                return (
                  <div key={trade.id} className="group block border border-black dark:border-white p-6 hover:bg-[#f8f8f8] dark:hover:bg-[#111] transition-colors">
                    <div className="pb-3 border-b border-black/20 dark:border-white/20 group-hover:border-black dark:group-hover:border-white transition-colors">
                      <div className="p-2 flex justify-between bg-black text-white dark:bg-white dark:text-black">
                        <div className="text-xl font-bold tracking-tighter uppercase leading-none flex items-center gap-3">
                          {trade.bias} {trade.instrument}
                        </div>
                        <div className={`font-mono text-[10px] leading-none ${
                          trade.outcome === 'WIN' ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {trade.outcome || 'UNKNOWN'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 font-mono text-xs opacity-60 flex flex-col h-[3em] justify-end">
                      <div className="flex justify-between items-end">
                        <div>
                          <div>{trade.updatedAt ? new Date(trade.updatedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}</div>
                          <div className="overflow-hidden h-[1.2em] relative mt-2 w-32">
                            <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)]">
                              <span className="font-bold text-black dark:text-white">→ Closed log</span>
                            </div>
                          </div>
                        </div>
                        <div className={`text-2xl font-bold ${pnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {pnl > 0 ? '+' : ''}{pnl}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentTrades.length === 0 && (
                <div className="col-span-1 md:col-span-3 p-12 border border-black dark:border-white text-center opacity-50 font-mono text-sm uppercase">
                  No recently closed trades.
                </div>
              )}
            </div>

            <div className="flex justify-center mt-12">
              <Link href="/dashboard" className="px-8 py-4 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                VIEW FULL JOURNAL
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}