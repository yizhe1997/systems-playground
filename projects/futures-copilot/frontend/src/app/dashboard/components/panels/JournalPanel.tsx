'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Activity, X } from 'lucide-react';
import { JournalDataState } from '../../types';

interface JournalPanelProps {
  tradeId: string | null;
  journalData: JournalDataState;
  onJournalDataChange: (next: JournalDataState) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function JournalPanel({ tradeId, journalData, onJournalDataChange, onClose, onSubmit }: JournalPanelProps) {
  return (
    <AnimatePresence>
      {tradeId && (
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
                <div className="flex items-center gap-3">
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">CLOSE & JOURNAL</h2>
                  <span className="font-mono text-[10px] opacity-60">[{tradeId}]</span>
                </div>
                <button onClick={onClose} className="hover:opacity-50 transition-opacity flex items-center justify-center w-5 h-5">
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
                    onChange={event => onJournalDataChange({ ...journalData, pnl: event.target.value })}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-3xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">OUTCOME</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => onJournalDataChange({ ...journalData, outcome: 'WIN' })}
                      className={`py-2 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest font-bold transition-colors ${journalData.outcome === 'WIN' ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600'}`}
                    >
                      WIN
                    </button>
                    <button
                      onClick={() => onJournalDataChange({ ...journalData, outcome: 'LOSS' })}
                      className={`py-2 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest font-bold transition-colors ${journalData.outcome === 'LOSS' ? 'bg-rose-600 text-white border-rose-600' : 'hover:bg-rose-600 hover:text-white hover:border-rose-600'}`}
                    >
                      LOSS
                    </button>
                    <button
                      onClick={() => onJournalDataChange({ ...journalData, outcome: 'BREAKEVEN' })}
                      className={`py-2 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest font-bold transition-colors ${journalData.outcome === 'BREAKEVEN' ? 'bg-neutral-600 text-white border-neutral-600' : 'hover:bg-neutral-600 hover:text-white hover:border-neutral-600'}`}
                    >
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
                    onChange={event => onJournalDataChange({ ...journalData, reflection: event.target.value })}
                    className="w-full bg-transparent border border-black dark:border-white p-3 font-mono text-xs uppercase leading-relaxed focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 resize-y"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                <button
                  onClick={onSubmit}
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
  );
}
