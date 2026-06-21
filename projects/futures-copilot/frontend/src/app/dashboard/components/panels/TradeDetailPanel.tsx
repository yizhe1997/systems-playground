'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bot, FileText, X } from 'lucide-react';
import { Trade } from '../../types';

interface TradeDetailPanelProps {
  trade: Trade | null;
  onClose: () => void;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hour}:${minute}`.toUpperCase();
}

export function TradeDetailPanel({ trade, onClose }: TradeDetailPanelProps) {
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
                  <h2 className="font-mono text-sm uppercase tracking-widest font-bold">TRADE DETAIL</h2>
                </div>
                <button onClick={onClose} className="fc-btn-subtle fc-icon-btn">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="fc-panel-body">
                <section className="space-y-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">Instrument</span>
                    <span className="font-mono text-sm uppercase tracking-[0.2em]">{trade.bias} {trade.instrument}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">Status</span>
                    <span className="font-mono text-sm uppercase tracking-[0.2em]">{trade.status}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">Created</span>
                    <span className="font-mono text-xs uppercase tracking-widest">{formatDateTime(trade.createdAt)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">Risk</span>
                    <span className="font-mono text-sm">${(trade.riskAmount ?? 0).toFixed(2)}</span>
                  </div>
                </section>

                <section className="fc-card">
                  <div className="px-5 py-4 border-b border-black dark:border-white flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black">
                    <FileText className="w-4 h-4" />
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] font-bold">Trade Note</h3>
                  </div>
                  <div className="p-5">
                    <div className="font-mono text-xs leading-7 whitespace-pre-wrap uppercase tracking-wide opacity-85">
                      {trade.notes?.trim() || 'NO TRADE NOTE RECORDED.'}
                    </div>
                  </div>
                </section>

                <section className="fc-card">
                  <div className="px-5 py-4 border-b border-black dark:border-white flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black">
                    <Bot className="w-4 h-4" />
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] font-bold">AI Setup Grading</h3>
                    <span className="ml-auto font-mono text-[10px] uppercase tracking-widest opacity-70">{trade.aiSetupGradeStatus || 'NOT REQUESTED'}</span>
                  </div>
                  <div className="p-5">
                    <div className="font-mono text-xs leading-7 whitespace-pre-wrap uppercase tracking-wide opacity-85">
                      {trade.aiSetupFindings?.trim() || 'NO AI FINDINGS WERE SAVED FOR THIS TRADE.'}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}