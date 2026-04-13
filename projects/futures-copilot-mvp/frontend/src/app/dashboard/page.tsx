'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Plus, Settings2, X, CircleDot, Activity, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data
const MOCK_ACCOUNTS = [
  {
    id: 'a-001',
    type: 'TOPSTEP EVAL 50K (ACTIVE)',
    balance: 51200,
    dailyLossLimit: 1000,
    currentDailyPnL: 200,
    defaultRisk: '1%',
  },
  {
    id: 'a-002',
    type: 'TOPSTEP FUNDED 150K (BLOWN)',
    balance: 148500,
    dailyLossLimit: 3000,
    currentDailyPnL: -3100,
    defaultRisk: '1%',
  }
];

const MOCK_TRADES = [
  {
    id: 't-001',
    status: 'draft',
    instrument: 'GC',
    bias: 'Long',
    entry: '2350.5',
    stopLoss: '2345.0',
    takeProfit: '2365.0',
    contracts: 2,
    riskAmount: 1100,
    aiStatus: 'warning',
    notes: 'Wait for 15m order block test. CPI in 30 mins.',
  },
  {
    id: 't-002',
    status: 'working',
    instrument: 'GC',
    bias: 'Short',
    entry: '2380.0',
    stopLoss: '2384.0',
    takeProfit: '2370.0',
    contracts: 3,
    riskAmount: 1200,
    aiStatus: 'approved',
    notes: 'Supply zone formed overnight.',
  },
  {
    id: 't-003',
    status: 'filled',
    instrument: 'GC',
    bias: 'Long',
    entry: '2340.0',
    stopLoss: '2335.0',
    takeProfit: '2355.0',
    contracts: 1,
    riskAmount: 500,
    aiStatus: 'approved',
    notes: 'London liquidity sweep.',
  }
];

export default function CopilotPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'working' | 'filled'>('all');
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [editTradeId, setEditTradeId] = useState<string | null>(null);
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [journalTradeId, setJournalTradeId] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountId] = useState('a-001');
  const [userRole, setUserRole] = useState<'ADMIN' | 'SUBSCRIBER' | 'ANON'>('ADMIN');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const activeAccount = MOCK_ACCOUNTS.find(a => a.id === activeAccountId) || MOCK_ACCOUNTS[0];

  const filteredTrades = activeTab === 'all' 
    ? MOCK_TRADES 
    : MOCK_TRADES.filter(t => t.status === activeTab);

  // If ANON, only show top 3
  const visibleTrades = userRole === 'ANON' ? filteredTrades.slice(0, 3) : filteredTrades;

  if (!mounted) return null;

  return (
    <div className="w-full">
      <main className="max-w-[1600px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">
        

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-24">
          <div className="lg:col-span-8">
            <h1 className="text-5xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.9]">
              Futures Copilot
              <span className="block text-xl md:text-3xl font-mono tracking-widest mt-6 font-normal">
                {`// INTELLIGENCE LAYER`}
              </span>
            </h1>
          </div>
          
          {/* Account Box */}
          <div className="lg:col-span-4 self-end">
            <div className="border border-black dark:border-white p-6 bg-white dark:bg-black">
              <div className="flex justify-between items-start border-b border-black dark:border-white pb-4 mb-4 relative">
                <button 
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="font-mono text-xs uppercase tracking-widest bg-transparent flex items-center gap-2 text-black dark:text-white"
                >
                  {activeAccount.type} ▼
                </button>
                <AnimatePresence>
                  {isAccountDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col"
                    >
                      {MOCK_ACCOUNTS.map(a => (
                        <button
                          key={a.id}
                          onClick={() => { setActiveAccountId(a.id); setIsAccountDropdownOpen(false); }}
                          className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b last:border-b-0 border-black dark:border-white opacity-80 hover:opacity-100"
                        >
                          {a.type}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <button 
                  onClick={() => setIsAccountOpen(true)}
                  className="font-mono text-[10px] uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black px-2 py-0.5 hover:opacity-80 transition-opacity"
                >
                  RESET / NEW
                </button>
              </div>
              <div className="grid grid-cols-2 gap-y-6">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">BALANCE</div>
                  <div className={`font-mono text-2xl ${activeAccount.balance < 50000 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                    ${activeAccount.balance.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">DAILY P&L</div>
                  <div className={`font-mono text-2xl ${activeAccount.currentDailyPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    ${activeAccount.currentDailyPnL}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">LOSS LIMIT</div>
                  <div className="font-mono text-xl">${activeAccount.dailyLossLimit}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">DEF. RISK</div>
                  <div className="font-mono text-xl">{activeAccount.defaultRisk}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-black dark:border-white pb-4 mb-12 gap-6">
          <div className="flex gap-6 font-mono text-sm uppercase tracking-widest">
            {['all', 'draft', 'working', 'filled'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'all' | 'draft' | 'working' | 'filled')}
                className={`relative pb-1 ${activeTab === tab ? 'font-bold' : 'opacity-50 hover:opacity-100 transition-opacity'}`}
              >
                [{tab}]
              </button>
            ))}
          </div>

          <div className="flex gap-4 font-mono text-xs tracking-widest uppercase">
            <select 
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as 'ADMIN' | 'SUBSCRIBER' | 'ANON')}
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 outline-none cursor-pointer"
            >
              <option value="ADMIN">ROLE: ADMIN</option>
              <option value="SUBSCRIBER">ROLE: SUBSCRIBER</option>
              <option value="ANON">ROLE: ANON</option>
            </select>
            
            {userRole === 'ADMIN' && (
              <>
                <button 
                  onClick={() => setIsRubricOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  RUBRIC CONFIG
                </button>
                <button 
                  onClick={() => { setEditTradeId(null); setIsDraftOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-80 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  DRAFT NEW SETUP
                </button>
              </>
            )}
          </div>
        </div>

        {/* Trade Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {visibleTrades.map(trade => (
              <motion.div
                key={trade.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)] flex flex-col"
              >
                <div className="bg-white dark:bg-black flex-grow flex flex-col [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)]">
                  {/* Header Strip */}
                  <div className={`border-b border-black dark:border-white p-3 flex justify-between items-center text-white ${trade.bias === 'Long' ? 'bg-emerald-600 dark:bg-emerald-700' : trade.bias === 'Short' ? 'bg-rose-600 dark:bg-rose-700' : 'bg-black dark:bg-white dark:text-black'}`}>
                    <div className="font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                      <span className="opacity-70">{trade.id}</span>
                      <span>{trade.bias} {trade.instrument}</span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 opacity-90">
                      {trade.status === 'working' && <Activity className="w-3 h-3" />}
                      [{trade.status}]
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 flex-grow">
                    <div className="grid grid-cols-2 gap-y-6 mb-8">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">ENTRY</div>
                        <div className="font-mono text-2xl">{trade.entry}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">RISK</div>
                        <div className="font-mono text-2xl">${trade.riskAmount}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">STOP LOSS</div>
                        <div className="font-mono text-lg text-rose-600 dark:text-rose-400">{trade.stopLoss}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">TARGET</div>
                        <div className="font-mono text-lg text-emerald-600 dark:text-emerald-400">{trade.takeProfit}</div>
                      </div>
                    </div>

                    <div className="border-t border-black dark:border-white pt-4">
                      <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">NOTES</div>
                      <p className="font-mono text-xs leading-relaxed uppercase">
                        &quot;{trade.notes}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Action Footer */}
                  {userRole === 'ADMIN' && (
                    <div className="flex border-t border-black dark:border-white font-mono text-[10px] uppercase tracking-widest">
                      {trade.status === 'draft' && (
                        <>
                          <button 
                            onClick={() => { setEditTradeId(trade.id); setIsDraftOpen(true); }}
                            className="flex-1 py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Settings2 className="w-3 h-3" /> EDIT
                          </button>
                          <button className="flex-[1.5] py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-1.5">
                            <Activity className="w-3 h-3" /> AI CHECK
                          </button>
                          <button className="flex-[1.5] py-4 bg-[#ececec] dark:bg-[#1a1a1a] hover:opacity-80 transition-opacity flex items-center justify-center gap-1.5 font-bold">
                            <Play className="w-3 h-3" /> SET ORDER
                          </button>
                        </>
                      )}
                      {trade.status === 'working' && (
                        <>
                          <button className="flex-1 py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-2">
                            <Settings2 className="w-4 h-4" /> EDIT LEVELS
                          </button>
                          <button className="flex-1 py-4 bg-[#ececec] dark:bg-[#1a1a1a] hover:opacity-80 transition-opacity flex items-center justify-center gap-2 font-bold">
                            <CircleDot className="w-4 h-4" /> MARK FILLED
                          </button>
                        </>
                      )}
                      {trade.status === 'filled' && (
                        <>
                          <button className="flex-1 py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-2">
                            <Settings2 className="w-4 h-4" /> EDIT TARGETS
                          </button>
                          <button 
                            onClick={() => setJournalTradeId(trade.id)}
                            className="flex-1 py-4 bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity flex items-center justify-center gap-2 font-bold"
                          >
                            <X className="w-4 h-4" /> CLOSE & JOURNAL
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </main>

      {/* Slide-out Draft Panel */}
      <AnimatePresence>
        {isDraftOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-40"
              onClick={() => setIsDraftOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-50"
            >
              <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
                <div className="p-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">
                    {editTradeId ? `EDIT SETUP [${editTradeId}]` : 'DRAFT NEW SETUP'}
                  </h2>
                  <button onClick={() => { setIsDraftOpen(false); setEditTradeId(null); }} className="hover:opacity-50 transition-opacity">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto space-y-8">
                
                {/* Bias Toggle & Instrument */}
                <div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">INSTRUMENT</label>
                      <input 
                        type="text" 
                        placeholder="e.g. GC, NQ, ES" 
                        className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30 uppercase" 
                      />
                    </div>
                  </div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">BIAS</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="py-3 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors">
                      LONG
                    </button>
                    <button className="py-3 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors">
                      SHORT
                    </button>
                  </div>
                </div>

                {/* Levels Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">ENTRY ZONE</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 2350.5" 
                      className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30" 
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2 text-rose-600 dark:text-rose-400">STOP LOSS</label>
                    <input 
                      type="text" 
                      placeholder="Price" 
                      className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none focus:border-rose-500 rounded-none placeholder:opacity-30" 
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2 text-emerald-600 dark:text-emerald-400">TAKE PROFIT</label>
                    <input 
                      type="text" 
                      placeholder="Price" 
                      className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none focus:border-emerald-500 rounded-none placeholder:opacity-30" 
                    />
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">CONTRACTS</label>
                  <input 
                    type="number" 
                    placeholder="1" 
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30" 
                  />
                </div>

                {/* Context Notes */}
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">CONTEXT / NOTES</label>
                  <textarea 
                    placeholder="S&D Zone details, news events, time of day..." 
                    rows={4}
                    className="w-full bg-transparent border border-black dark:border-white p-3 font-mono text-xs uppercase leading-relaxed focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30 resize-none" 
                  />
                </div>

              </div>

              <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                <button className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity flex justify-center items-center gap-2">
                  <Activity className="w-4 h-4" />
                  RUN AI RISK CHECK
                </button>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Slide-out Rubric Config Panel */}
      <AnimatePresence>
        {isRubricOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-40"
              onClick={() => setIsRubricOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-50"
            >
              <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
                <div className="p-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">RUBRIC CONFIGURATION</h2>
                  <button onClick={() => setIsRubricOpen(false)} className="hover:opacity-50 transition-opacity">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto space-y-8">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-4 text-amber-500">TRADING RULES & CONFLUENCES</label>
                  <p className="font-mono text-[10px] uppercase opacity-50 mb-4 leading-relaxed">
                    Define the rules the AI should use to grade your setups. Explain what makes a valid setup in your strategy.
                  </p>
                  <textarea 
                    placeholder="e.g. 1. Must test a 15m order block. 2. Minimum 1:2 RR. 3. Do not trade within 30m of CPI/NFP..." 
                    rows={8}
                    className="w-full bg-transparent border border-black dark:border-white p-4 font-mono text-xs uppercase leading-relaxed focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30 resize-none" 
                    defaultValue={"1. Only trade 15m Supply/Demand zones.\n2. Must have 1:2 R:R minimum.\n3. Do not risk more than 1.5% of daily loss limit.\n4. Avoid taking new setups during 10:00 AM news."}
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-4 text-blue-500">PINE SCRIPT LOGIC (OPTIONAL)</label>
                  <p className="font-mono text-[10px] uppercase opacity-50 mb-4 leading-relaxed">
                    Paste custom Pine Script logic or indicators (e.g., Institutional Supply/Demand) to give the AI context on how your technical levels are generated.
                  </p>
                  <textarea 
                    placeholder="// Paste indicator logic here..." 
                    rows={8}
                    className="w-full bg-[#f8f8f8] dark:bg-[#111] border border-black dark:border-white p-4 font-mono text-[10px] leading-relaxed focus:outline-none focus:border-blue-500 rounded-none placeholder:opacity-30 resize-none" 
                  />
                </div>
              </div>

              <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                <button className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity">
                  SAVE RUBRIC TO REDIS
                </button>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Slide-out Account Panel */}
      <AnimatePresence>
        {isAccountOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-40"
              onClick={() => setIsAccountOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-50"
            >
              <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
                <div className="p-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">RESET / NEW ACCOUNT</h2>
                  <button onClick={() => setIsAccountOpen(false)} className="hover:opacity-50 transition-opacity">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto space-y-8">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">ACCOUNT TYPE</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TOPSTEP EVAL 50K" 
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30" 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">STARTING BALANCE</label>
                  <input 
                    type="number" 
                    placeholder="50000" 
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30" 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2 text-rose-600 dark:text-rose-400">DAILY LOSS LIMIT</label>
                  <input 
                    type="number" 
                    placeholder="1000" 
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none focus:border-rose-500 rounded-none placeholder:opacity-30" 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2 text-emerald-600 dark:text-emerald-400">PROFIT TARGET (OPTIONAL)</label>
                  <input 
                    type="number" 
                    placeholder="3000" 
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none focus:border-emerald-500 rounded-none placeholder:opacity-30" 
                  />
                </div>
              </div>

              <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                <button className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity">
                  CREATE ACCOUNT
                </button>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Slide-out Journal Panel */}
      <AnimatePresence>
        {journalTradeId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-40"
              onClick={() => setJournalTradeId(null)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-50"
            >
              <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
                <div className="p-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                  <div className="flex items-center gap-3">
                    <h2 className="font-mono text-sm uppercase tracking-widest font-bold">CLOSE & JOURNAL</h2>
                    <span className="font-mono text-[10px] opacity-60">[{journalTradeId}]</span>
                  </div>
                  <button onClick={() => setJournalTradeId(null)} className="hover:opacity-50 transition-opacity">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto space-y-8">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">ACTUAL P&L ($)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 500 or -300" 
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-3xl focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30" 
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">OUTCOME</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button className="py-2 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors">
                      WIN
                    </button>
                    <button className="py-2 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors">
                      LOSS
                    </button>
                    <button className="py-2 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-neutral-600 hover:text-white hover:border-neutral-600 transition-colors">
                      BREAKEVEN
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">REFLECTION / LESSONS</label>
                  <textarea 
                    placeholder="Did you follow the rubric? Did you close early out of fear? What did the market do?" 
                    rows={6}
                    className="w-full bg-transparent border border-black dark:border-white p-3 font-mono text-xs uppercase leading-relaxed focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30 resize-none" 
                  />
                </div>
              </div>

              <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                <button className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity flex justify-center items-center gap-2">
                  <Activity className="w-4 h-4" />
                  LOG & RUN AI RETROSPECTIVE
                </button>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}