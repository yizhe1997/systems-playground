'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ChevronDown, X } from 'lucide-react';
import { Account, DraftFormState, Rubric } from '../../types';

interface DraftTradePanelProps {
  isOpen: boolean;
  editTradeId: string | null;
  activeAccountId: string;
  accounts: Account[];
  rubrics: Rubric[];
  draftForm: DraftFormState;
  onClose: () => void;
  onDraftFormChange: (next: DraftFormState) => void;
  onSubmit: () => void;
}

export function DraftTradePanel({
  isOpen,
  editTradeId,
  activeAccountId,
  accounts,
  rubrics,
  draftForm,
  onClose,
  onDraftFormChange,
  onSubmit,
}: DraftTradePanelProps) {
  const [isDraftAccountDropdownOpen, setIsDraftAccountDropdownOpen] = useState(false);
  const [isDraftRubricDropdownOpen, setIsDraftRubricDropdownOpen] = useState(false);

  const draftAccountDropdownRef = useRef<HTMLDivElement>(null);
  const draftRubricDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (draftAccountDropdownRef.current && !draftAccountDropdownRef.current.contains(event.target as Node)) {
        setIsDraftAccountDropdownOpen(false);
      }
      if (draftRubricDropdownRef.current && !draftRubricDropdownRef.current.contains(event.target as Node)) {
        setIsDraftRubricDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-[99]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-[100]"
          >
            <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
              <div className="pl-[70px] pr-6 py-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                <h2 className="font-mono text-sm uppercase tracking-widest font-bold">
                  {editTradeId ? `EDIT SETUP [${editTradeId}]` : 'DRAFT NEW SETUP'}
                </h2>
                <button onClick={onClose} className="hover:opacity-50 transition-opacity flex items-center justify-center w-5 h-5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 flex-grow overflow-y-auto space-y-8">
                <div ref={draftAccountDropdownRef} className="relative">
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">SELECT ACCOUNT</label>
                  <button
                    onClick={() => setIsDraftAccountDropdownOpen(prev => !prev)}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                  >
                    <span>{accounts.find(account => account.id === (draftForm.accountId || activeAccountId))?.type || 'SELECT ACCOUNT'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDraftAccountDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isDraftAccountDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col max-h-[200px] overflow-y-auto"
                      >
                        {accounts.map(account => (
                          <button
                            key={account.id}
                            onClick={() => {
                              onDraftFormChange({ ...draftForm, accountId: account.id });
                              setIsDraftAccountDropdownOpen(false);
                            }}
                            className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b last:border-b-0 border-black dark:border-white opacity-80 hover:opacity-100"
                          >
                            {account.type}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div ref={draftRubricDropdownRef} className="relative">
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">GRADING RUBRIC</label>
                  <button
                    onClick={() => setIsDraftRubricDropdownOpen(prev => !prev)}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                  >
                    <span>{rubrics.find(rubric => rubric.id === draftForm.rubricId)?.name || 'SELECT RUBRIC'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDraftRubricDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isDraftRubricDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col max-h-[200px] overflow-y-auto"
                      >
                        {rubrics.map(rubric => (
                          <button
                            key={rubric.id}
                            onClick={() => {
                              onDraftFormChange({ ...draftForm, rubricId: rubric.id });
                              setIsDraftRubricDropdownOpen(false);
                            }}
                            className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b last:border-b-0 border-black dark:border-white opacity-80 hover:opacity-100"
                          >
                            {rubric.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">INSTRUMENT</label>
                      <input
                        type="text"
                        placeholder="e.g. GC, NQ, ES"
                        value={draftForm.instrument}
                        onChange={event => onDraftFormChange({ ...draftForm, instrument: event.target.value })}
                        className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 uppercase"
                      />
                    </div>
                  </div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">BIAS</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => onDraftFormChange({ ...draftForm, bias: 'Long' })}
                      className={`py-3 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold transition-colors ${draftForm.bias === 'Long' ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600'}`}
                    >
                      LONG
                    </button>
                    <button
                      onClick={() => onDraftFormChange({ ...draftForm, bias: 'Short' })}
                      className={`py-3 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold transition-colors ${draftForm.bias === 'Short' ? 'bg-rose-600 text-white border-rose-600' : 'hover:bg-rose-600 hover:text-white hover:border-rose-600'}`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">ENTRY ZONE</label>
                    <input
                      type="text"
                      placeholder="e.g. 2350.5"
                      value={draftForm.entry}
                      onChange={event => onDraftFormChange({ ...draftForm, entry: event.target.value })}
                      className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2 text-rose-600 dark:text-rose-400">STOP LOSS</label>
                    <input
                      type="text"
                      placeholder="Price"
                      value={draftForm.stopLoss}
                      onChange={event => onDraftFormChange({ ...draftForm, stopLoss: event.target.value })}
                      className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2 text-emerald-600 dark:text-emerald-400">TAKE PROFIT</label>
                    <input
                      type="text"
                      placeholder="Price"
                      value={draftForm.takeProfit}
                      onChange={event => onDraftFormChange({ ...draftForm, takeProfit: event.target.value })}
                      className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">CONTRACTS</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={draftForm.contracts}
                    onChange={event => onDraftFormChange({ ...draftForm, contracts: parseInt(event.target.value, 10) || 1 })}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">CONTEXT / NOTES</label>
                  <textarea
                    placeholder="S&D Zone details, news events, time of day..."
                    rows={4}
                    value={draftForm.notes}
                    onChange={event => onDraftFormChange({ ...draftForm, notes: event.target.value })}
                    className="w-full bg-transparent border border-black dark:border-white p-3 font-mono text-xs uppercase leading-relaxed focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 resize-y"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111] grid grid-cols-2 gap-4">
                <button
                  onClick={onSubmit}
                  className="w-full py-4 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-mono text-xs uppercase tracking-widest font-bold flex justify-center items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  AI RISK CHECK
                </button>
                <button
                  onClick={onSubmit}
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
  );
}
