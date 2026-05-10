'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Trade } from '../../types';

interface InvalidateTradePanelProps {
  trade: Trade | null;
  reasonText: string;
  onReasonTextChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function InvalidateTradePanel({
  trade,
  reasonText,
  onReasonTextChange,
  onClose,
  onSubmit,
}: InvalidateTradePanelProps) {
  return (
    <AnimatePresence>
      {trade && (
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
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">
                    INVALIDATE TRADE
                  </h2>
                </div>
                <button onClick={onClose} className="hover:opacity-50 transition-opacity flex items-center justify-center w-5 h-5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 flex-grow overflow-y-auto space-y-8">
                <div className="border border-rose-600/50 p-4 bg-rose-50 dark:bg-rose-950/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <p className="font-mono text-[10px] uppercase tracking-widest leading-relaxed text-rose-700 dark:text-rose-300">
                      This is a soft-delete state. The trade stays in audit history but moves to INVALIDATED.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Invalidation Reason(s)</label>
                  <textarea
                    rows={8}
                    value={reasonText}
                    onChange={event => onReasonTextChange(event.target.value)}
                    placeholder="Write all reasons here. You can include multiple reasons, one per line."
                    className="w-full bg-transparent border border-black dark:border-white p-3 font-mono text-xs uppercase leading-relaxed focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 resize-y"
                  />
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-55 mt-2">
                    Tip: one reason per line works well for later AI analysis.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111] grid grid-cols-2 gap-4">
                <button
                  onClick={onClose}
                  className="w-full py-4 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-mono text-xs uppercase tracking-widest font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  className="w-full py-4 border border-rose-600 bg-rose-600 text-white hover:opacity-85 transition-opacity font-mono text-xs uppercase tracking-widest font-bold"
                >
                  Confirm Invalidate
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
