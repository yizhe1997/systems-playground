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
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">
                    INVALIDATE TRADE
                  </h2>
                </div>
                <button onClick={onClose} className="fc-btn-subtle fc-icon-btn">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="fc-panel-body">
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
                    className="fc-textarea"
                  />
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-55 mt-2">
                    Tip: one reason per line works well for later AI analysis.
                  </p>
                </div>
              </div>

              <div className="fc-panel-footer grid grid-cols-2 gap-4">
                <button
                  onClick={onClose}
                  className="fc-btn w-full py-4"
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
