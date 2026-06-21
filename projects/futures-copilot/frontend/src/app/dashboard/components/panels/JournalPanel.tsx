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
  const sanitizeSignedDecimalInput = (value: string) => {
    const sanitized = value.replace(/[^0-9.-]/g, '');
    const withoutExtraMinus = sanitized.replace(/(?!^)-/g, '');
    return withoutExtraMinus.replace(/(\..*)\./g, '$1');
  };

  const handlePnlBlur = () => {
    if (!journalData.pnl) {
      return;
    }

    const parsedValue = parseFloat(journalData.pnl);
    if (!Number.isFinite(parsedValue)) {
      onJournalDataChange({ ...journalData, pnl: '' });
      return;
    }

    onJournalDataChange({ ...journalData, pnl: parsedValue.toFixed(2) });
  };

  return (
    <AnimatePresence>
      {tradeId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fc-panel-overlay z-[99]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fc-panel-shell max-w-md [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-[100]"
          >
            <div className="fc-panel-inner [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
              <div className="fc-panel-header">
                <div className="flex items-center gap-3">
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">CLOSE & JOURNAL</h2>
                  <span className="font-mono text-[10px] opacity-60">[{tradeId}]</span>
                </div>
                <button onClick={onClose} className="fc-btn-subtle fc-icon-btn">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="fc-panel-body">
                <div>
                  <label className="fc-label">ACTUAL P&L ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 500.00 or -300.00"
                    value={journalData.pnl}
                    onChange={event => onJournalDataChange({ ...journalData, pnl: sanitizeSignedDecimalInput(event.target.value) })}
                    onBlur={handlePnlBlur}
                    className="fc-input-line text-3xl"
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
                    className="fc-textarea"
                  />
                </div>
              </div>

              <div className="fc-panel-footer">
                <button
                  onClick={onSubmit}
                  className="fc-btn-primary w-full py-4 flex justify-center items-center gap-2"
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
