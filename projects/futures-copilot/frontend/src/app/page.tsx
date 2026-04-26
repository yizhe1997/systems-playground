'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Activity, SearchX, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import useSWR from 'swr';
import TradingViewWidget from '../components/TradingViewWidget';
import { fetcher, API_ENDPOINTS } from '@/lib/dashboard/api';
import { getTradingViewSymbolCandidates, resolveTradingViewSymbol } from '@/lib/instruments';
import { InstrumentDefinition, PaginatedTradesResponse, Trade } from './dashboard/types';

interface RecentTrade {
  id: string;
  instrument: string;
  bias: string;
  status: string;
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN' | string;
  updatedAt?: string;
  pnl?: number;
}

interface ActiveTrade {
  id: string;
  status: string;
  instrument: string;
  bias: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  notes: string;
}

interface ComputedStats {
  winRate: number;
  avgRR: number;
  totalTrades: number;
  profitFactor: number;
}

interface StatsResponse {
  stats: ComputedStats;
  instruments: string[];
}

import { useSession } from 'next-auth/react';

export default function ShowroomPage() {
  const [liveSymbolIndex, setLiveSymbolIndex] = useState(0);
  const [isLiveWidgetScriptReady, setIsLiveWidgetScriptReady] = useState(true);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('ALL');
  const [isStatsDropdownOpen, setIsStatsDropdownOpen] = useState(false);
  const statsDropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || 'ANON';

  const tradesQuery = `${API_ENDPOINTS.trades}?page=1&pageSize=50`;
  const { data: rawTradesPage } = useSWR(tradesQuery, fetcher, {
    fallbackData: {
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    } satisfies PaginatedTradesResponse,
  });
  const { data: rawInstruments } = useSWR(API_ENDPOINTS.instruments, fetcher, { fallbackData: [] });

  // Fetch stats from API
  const statsQuery = `/api/stats/trades?instrument=${encodeURIComponent(selectedInstrument)}`;
  const { data: statsResponse } = useSWR(statsQuery, fetcher, {
    fallbackData: {
      stats: { winRate: 0, avgRR: 0, totalTrades: 0, profitFactor: 0 },
      instruments: [],
    } satisfies StatsResponse,
  });

  const trades = Array.isArray(rawTradesPage)
    ? ((rawTradesPage || []) as Trade[])
    : (((rawTradesPage as PaginatedTradesResponse | undefined)?.items || []) as Trade[]);
  const instruments = (rawInstruments || []) as InstrumentDefinition[];
  const stats = (statsResponse as StatsResponse | undefined)?.stats || { winRate: 0, avgRR: 0, totalTrades: 0, profitFactor: 0 };
  const availableInstruments = instruments.map(i => i.code);

  const workingTrade = trades.find(trade => trade.status === 'working');
  const activeTrade: ActiveTrade | null = (() => {
    if (!workingTrade) {
      return null;
    }

    return {
      id: workingTrade.id,
      status: workingTrade.status,
      instrument: workingTrade.instrument,
      bias: workingTrade.bias,
      entry: Number.isFinite(workingTrade.entry) ? workingTrade.entry.toFixed(2) : '-',
      stopLoss: Number.isFinite(workingTrade.stopLoss) ? workingTrade.stopLoss.toFixed(2) : '-',
      takeProfit: Number.isFinite(workingTrade.takeProfit) ? workingTrade.takeProfit.toFixed(2) : '-',
      notes: workingTrade.notes || 'No setup notes captured for this trade yet.',
    };
  })();

  const recentTrades: RecentTrade[] = trades
    .filter(trade => trade.status === 'closed' || trade.status === 'filled')
    .slice(0, 3)
    .map(trade => ({
      id: trade.id,
      instrument: trade.instrument,
      bias: trade.bias,
      status: trade.status,
      updatedAt: trade.createdAt,
      pnl: trade.riskAmount,
      outcome: (trade.riskAmount || 0) > 0 ? 'WIN' : (trade.riskAmount || 0) < 0 ? 'LOSS' : 'BREAKEVEN',
    }));

  const liveSymbolCandidates = getTradingViewSymbolCandidates(activeTrade?.instrument || '', instruments);
  const resolvedLiveSymbol = liveSymbolCandidates[Math.min(liveSymbolIndex, liveSymbolCandidates.length - 1)] || resolveTradingViewSymbol(activeTrade?.instrument || '', instruments);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statsDropdownRef.current && !statsDropdownRef.current.contains(event.target as Node)) {
        setIsStatsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full relative">
      <main className="max-w-[1200px] mx-auto relative px-4 md:px-8 pt-12 lg:pt-24 pb-8 lg:pb-10">
        

        {/* Hero Section */}
        <div className="text-center mb-24">
          <h1 className="text-4xl md:text-7xl font-bold tracking-tighter uppercase mb-6">
            Futures Copilot
          </h1>
          <p className="font-mono text-xs md:text-sm uppercase tracking-widest opacity-60 max-w-2xl mx-auto leading-relaxed">
            An AI-assisted trading journal for Institutional Supply & Demand levels. 
            Radical transparency. No black-box algorithms. Just disciplined, level-based execution audited by artificial intelligence.
          </p>
          <div className="mt-8">
            <Link href="/how-it-works" className="px-6 py-3 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors inline-flex items-center gap-2">
              SEE HOW IT WORKS <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mb-24">
          <div ref={statsDropdownRef} className="relative w-[220px] max-w-full mb-6">
            <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Instruments</label>
            <button
              onClick={() => setIsStatsDropdownOpen(prev => !prev)}
              className="w-full bg-transparent border border-black dark:border-white px-3 py-2 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
            >
              <span>{selectedInstrument}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isStatsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isStatsDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col"
                >
                  <button
                    onClick={() => {
                      setSelectedInstrument('ALL');
                      setIsStatsDropdownOpen(false);
                    }}
                    className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors border-b border-black dark:border-white ${
                      selectedInstrument === 'ALL'
                        ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                        : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black opacity-80 hover:opacity-100'
                    }`}
                  >
                    ALL
                  </button>
                  {availableInstruments.map((instrument, index) => (
                    <button
                      key={instrument}
                      onClick={() => {
                        setSelectedInstrument(instrument);
                        setIsStatsDropdownOpen(false);
                      }}
                      className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${
                        index < availableInstruments.length - 1 ? 'border-b border-black dark:border-white' : ''
                      } ${
                        selectedInstrument === instrument
                          ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                          : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black opacity-80 hover:opacity-100'
                      }`}
                    >
                      {instrument}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black dark:bg-white border border-black dark:border-white">
            <div className="bg-white dark:bg-black p-6 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">WIN RATE</div>
              <div className="text-3xl font-mono">{stats.winRate}%</div>
            </div>
            <div className="bg-white dark:bg-black p-6 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">AVG R:R</div>
              <div className="text-3xl font-mono">1 : {stats.avgRR}</div>
            </div>
            <div className="bg-white dark:bg-black p-6 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">PROFIT FACTOR</div>
              <div className="text-3xl font-mono">{stats.profitFactor}</div>
            </div>
            <div className="bg-white dark:bg-black p-6 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">LOGGED TRADES</div>
              <div className="text-3xl font-mono">{stats.totalTrades}</div>
            </div>
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

            <div className="flex flex-col gap-0">
              <div className="border border-black dark:border-white border-b-0 bg-white dark:bg-black flex flex-col">
                
                {/* Header */}
                <div className={`p-4 flex justify-between items-center text-white ${activeTrade ? (activeTrade.bias === 'Long' ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-rose-600 dark:bg-rose-700') : 'bg-black dark:bg-white dark:text-black'}`}>
                  <div className="font-mono text-sm uppercase tracking-widest font-bold flex items-center gap-3">
                    <Activity className="w-4 h-4" />
                    <span>{activeTrade ? `${activeTrade.bias} ${activeTrade.instrument}` : 'NO WORKING TRADE'}</span>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest">
                    [{activeTrade ? activeTrade.status : 'idle'}]
                  </div>
                </div>

                <div className="flex flex-col flex-grow">
                  {activeTrade ? (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-black dark:border-white">
                        {/* Context */}
                        <div className="p-8 border-b lg:border-b-0 lg:border-r border-black dark:border-white">
                          <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">AI COPILOT CONTEXT</div>
                          <p className="font-mono text-sm leading-relaxed uppercase">
                            &quot;{activeTrade.notes}&quot;
                          </p>
                        </div>

                        {/* Levels */}
                        <div className="p-8 grid grid-cols-3 gap-6">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">ENTRY</div>
                            <div className="font-mono text-3xl">{activeTrade.entry}</div>
                          </div>
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">STOP LOSS</div>
                            <div className="font-mono text-xl text-rose-600 dark:text-rose-400">{activeTrade.stopLoss}</div>
                          </div>
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">TARGET</div>
                            <div className="font-mono text-xl text-emerald-600 dark:text-emerald-400">{activeTrade.takeProfit}</div>
                          </div>
                        </div>
                      </div>

                      <div className="w-full flex flex-col items-center justify-center bg-[#f8f8f8] dark:bg-[#111] min-h-[500px] flex-grow overflow-hidden relative border-t md:border-t-0 border-black dark:border-white">
                        <div className="w-full px-4 py-3 border-b border-black dark:border-white font-mono text-[10px] uppercase tracking-widest flex flex-wrap items-center justify-between gap-3">
                          <span className="opacity-60">LIVE SOURCE [{resolvedLiveSymbol}]</span>
                          {liveSymbolCandidates.length > 1 && (
                            <button
                              onClick={() => setLiveSymbolIndex(prev => (prev + 1) % liveSymbolCandidates.length)}
                              className="px-2 py-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                            >
                              TRY ALT SOURCE
                            </button>
                          )}
                        </div>

                        {!isLiveWidgetScriptReady && (
                          <div className="w-full px-4 py-3 border-b border-black dark:border-white bg-amber-100/60 dark:bg-amber-900/20 font-mono text-[10px] uppercase tracking-widest text-amber-800 dark:text-amber-200">
                            Chart provider unavailable. Live alerts continue; switch source or retry later.
                          </div>
                        )}

                        <TradingViewWidget
                          symbol={resolvedLiveSymbol}
                          onWidgetReady={() => setIsLiveWidgetScriptReady(true)}
                          onScriptError={() => setIsLiveWidgetScriptReady(false)}
                        />
                        <div className="absolute inset-0 bg-black/5 dark:bg-white/5 mix-blend-overlay pointer-events-none" />
                      </div>
                    </>
                  ) : (
                    <div className="border-t border-black dark:border-white p-8 md:p-12 text-center bg-[#f8f8f8] dark:bg-[#111]">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                          <SearchX className="w-5 h-5" />
                        </div>
                        <h3 className="font-mono text-sm md:text-base uppercase tracking-widest font-bold">No Working Trades</h3>
                        <p className="font-mono text-[10px] md:text-xs uppercase tracking-widest opacity-70 max-w-xl leading-relaxed">
                          There are no active working trades right now. Open a draft and move it to working to see live radar.
                        </p>
                      </div>
                    </div>
                  )}
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

          <div>
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
                          trade.outcome === 'WIN' ? 'text-emerald-500' : trade.outcome === 'LOSS' ? 'text-rose-500' : 'text-neutral-500'
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
                <div className="col-span-1 md:col-span-3 border border-black dark:border-white p-8 md:p-12 text-center bg-[#f8f8f8] dark:bg-[#111]">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center">
                      <SearchX className="w-5 h-5" />
                    </div>
                    <h3 className="font-mono text-sm md:text-base uppercase tracking-widest font-bold">No Recent Outcomes</h3>
                    <p className="font-mono text-[10px] md:text-xs uppercase tracking-widest opacity-70 max-w-xl leading-relaxed">
                      No filled and closed outcomes yet. Completed trades will appear here.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-12">
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