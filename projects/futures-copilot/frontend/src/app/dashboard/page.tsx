'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Plus, Settings2, X, CircleDot, Activity, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { fetchTrades, fetchAccounts, draftTrade, updateTradeStatus, fetchRubrics, saveRubric, deleteRubric, journalTrade, saveAccount, deleteAccount, scrapeRulesFromUrls, improveRulesContext } from './api';

import { useSession } from 'next-auth/react';

export default function CopilotPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'working' | 'filled'>('all');
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [editTradeId, setEditTradeId] = useState<string | null>(null);
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isDraftAccountDropdownOpen, setIsDraftAccountDropdownOpen] = useState(false);
  const [isDraftRubricDropdownOpen, setIsDraftRubricDropdownOpen] = useState(false);
  const [isConfigRubricDropdownOpen, setIsConfigRubricDropdownOpen] = useState(false);
  const [journalTradeId, setJournalTradeId] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountId] = useState('a-001');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const draftAccountDropdownRef = useRef<HTMLDivElement>(null);
  const draftRubricDropdownRef = useRef<HTMLDivElement>(null);
  const configRubricDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
      if (draftAccountDropdownRef.current && !draftAccountDropdownRef.current.contains(event.target as Node)) {
        setIsDraftAccountDropdownOpen(false);
      }
      if (draftRubricDropdownRef.current && !draftRubricDropdownRef.current.contains(event.target as Node)) {
        setIsDraftRubricDropdownOpen(false);
      }
      if (configRubricDropdownRef.current && !configRubricDropdownRef.current.contains(event.target as Node)) {
        setIsConfigRubricDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'ANON';
  
  // Real data state
  const [trades, setTrades] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [rubrics, setRubrics] = useState<any[]>([]);

  // Forms
  const [draftForm, setDraftForm] = useState({
    accountId: '',
    instrument: 'GC',
    bias: 'Long',
    entry: '',
    stopLoss: '',
    takeProfit: '',
    contracts: 1,
    notes: '',
    rubricId: ''
  });

  const [rubricForm, setRubricForm] = useState({
    id: '',
    name: 'New Rubric',
    rules: '',
    pinescript: ''
  });

  const [accountForm, setAccountForm] = useState({
    id: '',
    type: 'TOPSTEP EVAL 50K',
    currentBalance: 50000,
    currentDailyStopLevel: 49000,
    currentMaxLossLevel: 48000,
    rulesContext: 'Trailing EOD Max Drawdown: $2000. Daily Loss Limit: $1000.'
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteRubricConfirm, setShowDeleteRubricConfirm] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [aiUrlsInput, setAiUrlsInput] = useState<string[]>(['']);
  const [isAiScraping, setIsAiScraping] = useState(false);
  const [isAiImproving, setIsAiImproving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    
    const loadData = async () => {
      try {
        const fetchedAccounts = await fetchAccounts();
        if (fetchedAccounts && fetchedAccounts.length > 0) {
          setAccounts(fetchedAccounts);
          if (!fetchedAccounts.find((a: any) => a.id === activeAccountId)) {
            setActiveAccountId(fetchedAccounts[0].id);
          }
          setDraftForm(f => f.accountId ? f : { ...f, accountId: fetchedAccounts[0].id });
        }
        const fetchedTrades = await fetchTrades();
        if (fetchedTrades) setTrades(fetchedTrades);

        const fetchedRubrics = await fetchRubrics();
        if (fetchedRubrics && fetchedRubrics.length > 0) {
          setRubrics(fetchedRubrics);
          setDraftForm(f => f.rubricId ? f : { ...f, rubricId: fetchedRubrics[0].id });
          setRubricForm(fetchedRubrics[0]);
        }
      } catch (e) {
        console.error('Failed to load data. Falling back to mocks.', e);
      }
    };

    loadData();
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleDraftSubmit = async () => {
    try {
      const payload = {
        ...draftForm,
        accountId: draftForm.accountId || activeAccountId,
        entry: parseFloat(draftForm.entry),
        stopLoss: parseFloat(draftForm.stopLoss),
        takeProfit: parseFloat(draftForm.takeProfit),
      };
      // In a real app we'd handle the response, AI text, etc.
      await draftTrade(payload);
      setIsDraftOpen(false);
      setDraftForm({ accountId: draftForm.accountId || activeAccountId, instrument: 'GC', bias: 'Long', entry: '', stopLoss: '', takeProfit: '', contracts: 1, notes: '', rubricId: rubrics[0]?.id || '' });
      // Force refresh
      const refreshed = await fetchTrades();
      if (refreshed) setTrades(refreshed);
    } catch(e) { console.error(e); }
  };

  const handleRubricSubmit = async () => {
    try {
      await saveRubric(rubricForm);
      setIsRubricOpen(false);
      const fetchedRubrics = await fetchRubrics();
      if (fetchedRubrics) setRubrics(fetchedRubrics);
    } catch(e) { console.error(e); }
  };

  const handleDeleteRubric = async () => {
    if (!rubricForm.id) return;
    try {
      await deleteRubric(rubricForm.id);
      setShowDeleteRubricConfirm(false);
      setIsRubricOpen(false);
      const fetchedRubrics = await fetchRubrics();
      if (fetchedRubrics) {
        setRubrics(fetchedRubrics);
        if (fetchedRubrics.length > 0) setRubricForm(fetchedRubrics[0]);
      }
    } catch(e) { console.error(e); }
  };

  const handleAccountSubmit = async () => {
    try {
      const payload = {
        ...accountForm,
        currentBalance: parseFloat(accountForm.currentBalance as any),
        currentDailyStopLevel: parseFloat(accountForm.currentDailyStopLevel as any),
        currentMaxLossLevel: parseFloat(accountForm.currentMaxLossLevel as any),
      };
      await saveAccount(payload);
      setIsAccountOpen(false);
      const fetchedAccounts = await fetchAccounts();
      if (fetchedAccounts) {
        setAccounts(fetchedAccounts);
        setActiveAccountId(payload.id || fetchedAccounts[0]?.id || '');
      }
      setAccountForm({ id: '', type: 'TOPSTEP EVAL 50K', currentBalance: 50000, currentDailyStopLevel: 49000, currentMaxLossLevel: 48000, rulesContext: 'Trailing EOD Max Drawdown: $2000. Daily Loss Limit: $1000.' });
    } catch(e) { console.error(e); }
  };

  const handleDeleteAccount = async () => {
    if (!accountForm.id) return;
    try {
      await deleteAccount(accountForm.id);
      setIsAccountOpen(false);
      setShowDeleteConfirm(false);
      const fetchedAccounts = await fetchAccounts();
      setAccounts(fetchedAccounts || []);
      if (fetchedAccounts && fetchedAccounts.length > 0) {
        setActiveAccountId(fetchedAccounts[0].id);
      } else {
        setActiveAccountId('');
      }
      const fetchedTrades = await fetchTrades();
      setTrades(fetchedTrades || []);
      setAccountForm({ id: '', type: 'TOPSTEP EVAL 50K', currentBalance: 50000, currentDailyStopLevel: 49000, currentMaxLossLevel: 48000, rulesContext: 'Trailing EOD Max Drawdown: $2000. Daily Loss Limit: $1000.' });
    } catch(e) { console.error(e); }
  };

  const handleAiScrapeUrls = async () => {
    const urls = aiUrlsInput.map(s => s.trim()).filter(Boolean);
    if (urls.length === 0) return;
    setIsAiScraping(true);
    try {
      const res = await scrapeRulesFromUrls(urls);
      if (res && res.context) {
        setAccountForm({ ...accountForm, rulesContext: res.context });
        setAiUrlsInput(['']);
        setShowUrlInput(false);
      }
    } catch(e) { console.error(e); }
    setIsAiScraping(false);
  };

  const handleAiImproveRules = async () => {
    if (!accountForm.rulesContext) return;
    setIsAiImproving(true);
    try {
      const res = await improveRulesContext(accountForm.rulesContext);
      if (res && res.context) {
        setAccountForm({ ...accountForm, rulesContext: res.context });
      }
    } catch(e) { console.error(e); }
    setIsAiImproving(false);
  };

  const handleJournalSubmit = async () => {
    if (!journalTradeId) return;
    try {
      await journalTrade({
        tradeId: journalTradeId,
        pnl: parseFloat(journalData.pnl),
        outcome: journalData.outcome,
        reflection: journalData.reflection
      });
      setJournalTradeId(null);
      setJournalData({ pnl: '', outcome: 'WIN', reflection: '' });
      const refreshed = await fetchTrades();
      if (refreshed) setTrades(refreshed);
    } catch(e) { console.error(e); }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateTradeStatus(id, newStatus);
      const refreshed = await fetchTrades();
      if (refreshed) setTrades(refreshed);
    } catch(e) { console.error(e); }
  };

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0] || null;

  const filteredTrades = trades.filter(t => t.accountId === activeAccount?.id && (activeTab === 'all' || t.status === activeTab));

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
              <div ref={accountDropdownRef} className="flex justify-between items-start border-b border-black dark:border-white pb-4 mb-4 relative">
                <button 
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="font-mono text-xs uppercase tracking-widest bg-transparent flex items-center gap-2 text-black dark:text-white"
                >
                  {activeAccount?.type || 'NO ACCOUNT'} ▼
                </button>
                <AnimatePresence>
                  {isAccountDropdownOpen && accounts.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col"
                    >
                      {accounts.map(a => (
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
                <div className="flex gap-2">
                  {userRole === 'ADMIN' && (
                    <button 
                      onClick={() => {
                        setAccountForm(activeAccount);
                        setIsAccountOpen(true);
                      }}
                      className="font-mono text-[10px] uppercase tracking-widest border border-black dark:border-white px-2 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                      UPDATE
                    </button>
                  )}
                  {userRole === 'ADMIN' && (
                    <button 
                      onClick={() => {
                        setAccountForm({ id: '', type: 'TOPSTEP EVAL 50K', currentBalance: 50000, currentDailyStopLevel: 49000, currentMaxLossLevel: 48000, rulesContext: 'Trailing EOD Max Drawdown: $2000. Daily Loss Limit: $1000.' });
                        setIsAccountOpen(true);
                      }}
                      className="font-mono text-[10px] uppercase tracking-widest border border-black dark:border-white px-2 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                      + NEW
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-6">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">BALANCE</div>
                  <div className={`font-mono text-2xl`}>
                    ${activeAccount?.currentBalance?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">DAILY STOP</div>
                  <div className={`font-mono text-xl`}>
                    ${activeAccount?.currentDailyStopLevel?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">MAX LOSS FLOOR</div>
                  <div className="font-mono text-xl">${activeAccount?.currentMaxLossLevel?.toLocaleString() || 0}</div>
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
                  className="flex items-center gap-2 px-4 py-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
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
                            onClick={() => openDraftPanel(trade)}
                            className="flex-1 py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Settings2 className="w-3 h-3" /> EDIT
                          </button>
                          <button className="flex-[1.5] py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-1.5">
                            <Activity className="w-3 h-3" /> AI CHECK
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(trade.id, 'working')}
                            className="flex-[1.5] py-4 bg-[#ececec] dark:bg-[#1a1a1a] hover:opacity-80 transition-opacity flex items-center justify-center gap-1.5 font-bold"
                          >
                            <Play className="w-3 h-3" /> SET ORDER
                          </button>
                        </>
                      )}
                      {trade.status === 'working' && (
                        <>
                          <button 
                            onClick={() => openDraftPanel(trade)}
                            className="flex-1 py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-2"
                          >
                            <Settings2 className="w-4 h-4" /> EDIT LEVELS
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(trade.id, 'filled')}
                            className="flex-1 py-4 bg-[#ececec] dark:bg-[#1a1a1a] hover:opacity-80 transition-opacity flex items-center justify-center gap-2 font-bold"
                          >
                            <CircleDot className="w-4 h-4" /> MARK FILLED
                          </button>
                        </>
                      )}
                      {trade.status === 'filled' && (
                        <>
                          <button 
                            onClick={() => openDraftPanel(trade)}
                            className="flex-1 py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-2"
                          >
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
              className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-[99]"
              onClick={() => setIsDraftOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-[100]"
            >
              <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
                <div className="pl-[70px] pr-6 py-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">
                    {editTradeId ? `EDIT SETUP [${editTradeId}]` : 'DRAFT NEW SETUP'}
                  </h2>
                  <button onClick={() => { setIsDraftOpen(false); setEditTradeId(null); }} className="hover:opacity-50 transition-opacity flex items-center justify-center w-5 h-5">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto space-y-8">

                {/* Account Selector */}
                <div ref={draftAccountDropdownRef} className="relative">
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">SELECT ACCOUNT</label>
                  <button
                    onClick={() => setIsDraftAccountDropdownOpen(!isDraftAccountDropdownOpen)}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                  >
                    <span>{accounts.find(a => a.id === (draftForm.accountId || activeAccountId))?.type || 'SELECT ACCOUNT'}</span>
                    <span>▼</span>
                  </button>
                  
                  <AnimatePresence>
                    {isDraftAccountDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col max-h-[200px] overflow-y-auto"
                      >
                        {accounts.map(a => (
                          <button
                            key={a.id}
                            onClick={() => { setDraftForm({...draftForm, accountId: a.id}); setIsDraftAccountDropdownOpen(false); }}
                            className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b last:border-b-0 border-black dark:border-white opacity-80 hover:opacity-100"
                          >
                            {a.type}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Rubric Selector */}
                <div ref={draftRubricDropdownRef} className="relative">
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">GRADING RUBRIC</label>
                  <button
                    onClick={() => setIsDraftRubricDropdownOpen(!isDraftRubricDropdownOpen)}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                  >
                    <span>{rubrics.find(r => r.id === draftForm.rubricId)?.name || 'SELECT RUBRIC'}</span>
                    <span>▼</span>
                  </button>
                  
                  <AnimatePresence>
                    {isDraftRubricDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col max-h-[200px] overflow-y-auto"
                      >
                        {rubrics.map(r => (
                          <button
                            key={r.id}
                            onClick={() => { setDraftForm({...draftForm, rubricId: r.id}); setIsDraftRubricDropdownOpen(false); }}
                            className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b last:border-b-0 border-black dark:border-white opacity-80 hover:opacity-100"
                          >
                            {r.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Bias Toggle & Instrument */}
                <div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">INSTRUMENT</label>
                      <input 
                        type="text" 
                        placeholder="e.g. GC, NQ, ES" 
                        value={draftForm.instrument}
                        onChange={(e) => setDraftForm({...draftForm, instrument: e.target.value})}
                        className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 uppercase" 
                      />
                    </div>
                  </div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">BIAS</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setDraftForm({...draftForm, bias: 'Long'})}
                      className={`py-3 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold transition-colors ${draftForm.bias === 'Long' ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600'}`}>
                      LONG
                    </button>
                    <button 
                      onClick={() => setDraftForm({...draftForm, bias: 'Short'})}
                      className={`py-3 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold transition-colors ${draftForm.bias === 'Short' ? 'bg-rose-600 text-white border-rose-600' : 'hover:bg-rose-600 hover:text-white hover:border-rose-600'}`}>
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
                      value={draftForm.entry}
                      onChange={(e) => setDraftForm({...draftForm, entry: e.target.value})}
                      className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50" 
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2 text-rose-600 dark:text-rose-400">STOP LOSS</label>
                    <input 
                      type="text" 
                      placeholder="Price" 
                      value={draftForm.stopLoss}
                      onChange={(e) => setDraftForm({...draftForm, stopLoss: e.target.value})}
                      className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50" 
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2 text-emerald-600 dark:text-emerald-400">TAKE PROFIT</label>
                    <input 
                      type="text" 
                      placeholder="Price" 
                      value={draftForm.takeProfit}
                      onChange={(e) => setDraftForm({...draftForm, takeProfit: e.target.value})}
                      className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50" 
                    />
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">CONTRACTS</label>
                  <input 
                    type="number" 
                    placeholder="1" 
                    value={draftForm.contracts}
                    onChange={(e) => setDraftForm({...draftForm, contracts: parseInt(e.target.value) || 1})}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50" 
                  />
                </div>

                {/* Context Notes */}
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">CONTEXT / NOTES</label>
                  <textarea 
                    placeholder="S&D Zone details, news events, time of day..." 
                    rows={4}
                    value={draftForm.notes}
                    onChange={(e) => setDraftForm({...draftForm, notes: e.target.value})}
                    className="w-full bg-transparent border border-black dark:border-white p-3 font-mono text-xs uppercase leading-relaxed focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 resize-y" 
                  />
                </div>

              </div>

              <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111] grid grid-cols-2 gap-4">
                <button 
                  onClick={handleDraftSubmit}
                  className="w-full py-4 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-mono text-xs uppercase tracking-widest font-bold flex justify-center items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  AI RISK CHECK
                </button>
                <button 
                  onClick={handleDraftSubmit}
                  className="w-full py-4 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-mono text-xs uppercase tracking-widest font-bold flex justify-center items-center gap-2"
                >
                  CREATE DRAFT
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
              className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-[99]"
              onClick={() => setIsRubricOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-[100]"
            >
              <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
                <div className="pl-[70px] pr-6 py-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold flex items-center gap-4">
                    RUBRIC CONFIG
                    <button 
                      onClick={() => setRubricForm({ id: '', name: 'New Rubric', rules: '', pinescript: '' })}
                      className="px-2 py-0.5 bg-white text-black dark:bg-black dark:text-white text-[10px] hover:opacity-80 transition-opacity"
                    >
                      + NEW
                    </button>
                  </h2>
                  <button onClick={() => setIsRubricOpen(false)} className="hover:opacity-50 transition-opacity flex items-center justify-center w-5 h-5">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto space-y-8">
                
                <div ref={configRubricDropdownRef} className="relative">
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">SELECT OR CREATE</label>
                  <button
                    onClick={() => setIsConfigRubricDropdownOpen(!isConfigRubricDropdownOpen)}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                  >
                    <span>{rubricForm.id === '' ? '-- CREATE NEW --' : rubrics.find(r => r.id === rubricForm.id)?.name || 'SELECT RUBRIC'}</span>
                    <span>▼</span>
                  </button>
                  
                  <AnimatePresence>
                    {isConfigRubricDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col max-h-[200px] overflow-y-auto"
                      >
                        <button
                          onClick={() => { setRubricForm({ id: '', name: 'New Rubric', rules: '', pinescript: '' }); setIsConfigRubricDropdownOpen(false); }}
                          className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b border-black dark:border-white font-bold"
                        >
                          -- CREATE NEW --
                        </button>
                        {rubrics.map(r => (
                          <button
                            key={r.id}
                            onClick={() => { setRubricForm(r); setIsConfigRubricDropdownOpen(false); }}
                            className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b last:border-b-0 border-black dark:border-white opacity-80 hover:opacity-100"
                          >
                            {r.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">RUBRIC NAME</label>
                  <input 
                    type="text" 
                    value={rubricForm.name}
                    onChange={(e) => setRubricForm({...rubricForm, name: e.target.value})}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 uppercase" 
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-4 text-black dark:text-white">TRADING RULES & CONFLUENCES</label>
                  <p className="font-mono text-[10px] uppercase opacity-50 mb-4 leading-relaxed">
                    Define the rules the AI should use to grade your setups. Explain what makes a valid setup in your strategy.
                  </p>
                  <textarea 
                    placeholder="e.g. 1. Must test a 15m order block. 2. Minimum 1:2 RR. 3. Do not trade within 30m of CPI/NFP..." 
                    rows={8}
                    value={rubricForm.rules}
                    onChange={(e) => setRubricForm({...rubricForm, rules: e.target.value})}
                    className="w-full bg-transparent border border-black dark:border-white p-4 font-mono text-xs uppercase leading-relaxed focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 resize-y" 
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-4 text-black dark:text-white">PINE SCRIPT LOGIC (OPTIONAL)</label>
                  <p className="font-mono text-[10px] uppercase opacity-50 mb-4 leading-relaxed">
                    Paste custom Pine Script logic or indicators (e.g., Institutional Supply/Demand) to give the AI context on how your technical levels are generated.
                  </p>
                  <textarea 
                    placeholder="// Paste indicator logic here..." 
                    rows={8}
                    value={rubricForm.pinescript}
                    onChange={(e) => setRubricForm({...rubricForm, pinescript: e.target.value})}
                    className="w-full bg-[#f8f8f8] dark:bg-[#111] border border-black dark:border-white p-4 font-mono text-[10px] leading-relaxed focus:outline-none focus:border-blue-500 rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 resize-y" 
                  />
                </div>
              </div>

              {showDeleteRubricConfirm ? (
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111] flex flex-col gap-4">
                  <p className="font-mono text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
                    WARNING: This will permanently delete {rubricForm.name}.
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDeleteRubric} 
                      className="flex-1 py-4 bg-rose-600 text-white font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity"
                    >
                      CONFIRM
                    </button>
                    <button 
                      onClick={() => setShowDeleteRubricConfirm(false)}
                      className="flex-1 py-4 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111] flex gap-4">
                  <button 
                    onClick={handleRubricSubmit}
                    className="flex-1 py-4 bg-black text-white border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                  >
                    SAVE RUBRIC
                  </button>
                  {rubricForm.id && rubrics.length > 1 && (
                    <button 
                      onClick={() => setShowDeleteRubricConfirm(true)}
                      className="flex-none px-6 border border-rose-600 text-rose-600 dark:text-rose-400 font-mono text-xs uppercase tracking-widest font-bold hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-colors"
                    >
                      DELETE
                    </button>
                  )}
                </div>
              )}
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
              className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-[99]"
              onClick={() => setIsAccountOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-[100]"
            >
              <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
                <div className="pl-[70px] pr-6 py-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">
                    {accountForm.id ? 'ACCOUNT DETAIL' : 'NEW ACCOUNT'}
                  </h2>
                  <button onClick={() => setIsAccountOpen(false)} className="hover:opacity-50 transition-opacity flex items-center justify-center w-5 h-5">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto space-y-8">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">ACCOUNT TYPE</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TOPSTEP EVAL 50K" 
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({...accountForm, type: e.target.value})}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50" 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">CURRENT BALANCE</label>
                  <input 
                    type="number" 
                    placeholder="50000" 
                    value={accountForm.currentBalance}
                    onChange={(e) => setAccountForm({...accountForm, currentBalance: parseFloat(e.target.value) || 0})}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50" 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">DAILY STOP LEVEL (FLOOR)</label>
                  <input 
                    type="number" 
                    placeholder="49000" 
                    value={accountForm.currentDailyStopLevel}
                    onChange={(e) => setAccountForm({...accountForm, currentDailyStopLevel: parseFloat(e.target.value) || 0})}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50" 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">MAX LOSS LEVEL (FLOOR)</label>
                  <input 
                    type="number" 
                    placeholder="48000" 
                    value={accountForm.currentMaxLossLevel}
                    onChange={(e) => setAccountForm({...accountForm, currentMaxLossLevel: parseFloat(e.target.value) || 0})}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50" 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">RULES CONTEXT</label>
                  <textarea 
                    placeholder="Trailing rules context..." 
                    value={accountForm.rulesContext}
                    onChange={(e) => setAccountForm({...accountForm, rulesContext: e.target.value})}
                    className="w-full bg-transparent border border-black dark:border-white p-3 font-mono text-xs focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 min-h-[100px] resize-y" 
                  />
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowUrlInput(!showUrlInput)} 
                        className="font-mono text-[10px] uppercase tracking-widest hover:opacity-50 transition-opacity"
                      >
                        [ AI: SCRAPE FROM URLS ]
                      </button>
                      <button 
                        onClick={handleAiImproveRules} 
                        disabled={isAiImproving || !accountForm.rulesContext} 
                        className="font-mono text-[10px] uppercase tracking-widest hover:opacity-50 transition-opacity disabled:opacity-30"
                      >
                        {isAiImproving ? 'THINKING...' : '[ AI: CLEANUP TEXT ]'}
                      </button>
                    </div>
                    {showUrlInput && (
                       <div className="flex flex-col gap-2 mt-2">
                          {aiUrlsInput.map((url, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input 
                                type="text" 
                                placeholder="Paste rule URL here..." 
                                value={url} 
                                onChange={(e) => {
                                  const newUrls = [...aiUrlsInput];
                                  newUrls[idx] = e.target.value;
                                  setAiUrlsInput(newUrls);
                                }} 
                                className="flex-grow bg-transparent border-b border-black dark:border-white py-1 font-mono text-xs focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50" 
                              />
                              {aiUrlsInput.length > 1 && (
                                <button 
                                  onClick={() => {
                                    const newUrls = [...aiUrlsInput];
                                    newUrls.splice(idx, 1);
                                    setAiUrlsInput(newUrls);
                                  }}
                                  className="text-rose-500 hover:opacity-50"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          {aiUrlsInput.length < 3 && (
                            <button 
                              onClick={() => setAiUrlsInput([...aiUrlsInput, ''])}
                              className="self-start font-mono text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 mt-1"
                            >
                              + ADD ANOTHER URL
                            </button>
                          )}
                          <p className="font-mono text-[8px] text-rose-500 uppercase mt-2">Warning: This will overwrite existing context.</p>
                          <button 
                            onClick={handleAiScrapeUrls} 
                            disabled={isAiScraping} 
                            className="w-full py-3 bg-black text-white dark:bg-white dark:text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:opacity-80 transition-opacity mt-2"
                          >
                             {isAiScraping ? 'SCRAPING...' : 'EXTRACT RULES'}
                          </button>
                       </div>
                    )}
                  </div>
                </div>
              </div>

              {showDeleteConfirm ? (
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111] flex flex-col gap-4">
                  <p className="font-mono text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
                    WARNING: This will permanently delete {accountForm.type} along with all trades and outcomes tied to it.
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDeleteAccount} 
                      className="flex-1 py-4 bg-rose-600 text-white font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity"
                    >
                      CONFIRM
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)} 
                      className="flex-1 py-4 border border-black dark:border-white text-black dark:text-white font-mono text-xs uppercase tracking-widest font-bold hover:opacity-50 transition-opacity"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                  <button 
                    onClick={handleAccountSubmit}
                    className={`w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity ${accountForm.id ? 'mb-4' : ''}`}
                  >
                    {accountForm.id ? 'UPDATE ACCOUNT' : 'CREATE ACCOUNT'}
                  </button>

                  {accountForm.id && (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-4 bg-transparent border border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400 font-mono text-xs uppercase tracking-widest font-bold hover:bg-rose-600 hover:text-white dark:hover:bg-rose-400 dark:hover:text-black transition-colors"
                    >
                      DELETE ACCOUNT
                    </button>
                  )}
                </div>
              )}
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
              className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-[99]"
              onClick={() => setJournalTradeId(null)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-[100]"
            >
              <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
                <div className="pl-[70px] pr-6 py-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                  <div className="flex items-center gap-3">
                    <h2 className="font-mono text-sm uppercase tracking-widest font-bold">CLOSE & JOURNAL</h2>
                    <span className="font-mono text-[10px] opacity-60">[{journalTradeId}]</span>
                  </div>
                  <button onClick={() => setJournalTradeId(null)} className="hover:opacity-50 transition-opacity flex items-center justify-center w-5 h-5">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto space-y-8">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">ACTUAL P&L ($)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 500 or -300" 
                    value={journalData.pnl}
                    onChange={(e) => setJournalData({...journalData, pnl: e.target.value})}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-3xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50" 
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">OUTCOME</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => setJournalData({...journalData, outcome: 'WIN'})}
                      className={`py-2 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest font-bold transition-colors ${journalData.outcome === 'WIN' ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600'}`}>
                      WIN
                    </button>
                    <button 
                      onClick={() => setJournalData({...journalData, outcome: 'LOSS'})}
                      className={`py-2 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest font-bold transition-colors ${journalData.outcome === 'LOSS' ? 'bg-rose-600 text-white border-rose-600' : 'hover:bg-rose-600 hover:text-white hover:border-rose-600'}`}>
                      LOSS
                    </button>
                    <button 
                      onClick={() => setJournalData({...journalData, outcome: 'BREAKEVEN'})}
                      className={`py-2 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest font-bold transition-colors ${journalData.outcome === 'BREAKEVEN' ? 'bg-neutral-600 text-white border-neutral-600' : 'hover:bg-neutral-600 hover:text-white hover:border-neutral-600'}`}>
                      BREAKEVEN
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">REFLECTION / LESSONS</label>
                  <textarea 
                    placeholder="Did you follow the rubric? Did you close early out of fear? What did the market do?" 
                    rows={6}
                    value={journalData.reflection}
                    onChange={(e) => setJournalData({...journalData, reflection: e.target.value})}
                    className="w-full bg-transparent border border-black dark:border-white p-3 font-mono text-xs uppercase leading-relaxed focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 resize-y" 
                  />
                </div>
              </div>

              <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                <button 
                  onClick={handleJournalSubmit}
                  className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity flex justify-center items-center gap-2"
                >
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