'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Ban, CircleDot, MoreVertical, Play, RefreshCw, Settings2, X } from 'lucide-react';
import { useState } from 'react';
import { Trade, UserRole } from '../types';

interface TradeCardProps {
  trade: Trade;
  userRole: UserRole;
  onOpenDraftPanel: (trade: Trade) => void;
  onOpenReplay: (trade: Trade) => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onOpenJournal: (id: string) => void;
  onRegrade: (id: string) => void;
  onOpenInvalidatePanel: (trade: Trade) => void;
}

const GRADE_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  queued:  { label: 'GRADE QUEUED', className: 'border-black/30 dark:border-white/30 text-black/50 dark:text-white/50' },
  grading: { label: 'GRADING...',   className: 'border-amber-500 text-amber-600 dark:text-amber-400 animate-pulse' },
  ready:   { label: 'GRADED',       className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
  failed:  { label: 'GRADE FAILED', className: 'border-rose-500 text-rose-600 dark:text-rose-400' },
};

function GradeStatusBadge({ status }: { status: string }) {
  const config = GRADE_STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <div className="px-6 pb-4">
      <span className={`inline-block font-mono text-[9px] uppercase tracking-widest px-2 py-[3px] border ${config.className}`}>
        {config.label}
      </span>
    </div>
  );
}

export function TradeCard({ trade, userRole, onOpenDraftPanel, onOpenReplay, onUpdateStatus, onOpenJournal, onRegrade, onOpenInvalidatePanel }: TradeCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const gradeStatus = trade.aiSetupGradeStatus;
  const canRegrade = trade.status === 'draft' && (!gradeStatus || gradeStatus === 'not_requested' || gradeStatus === 'failed');
  const isGrading = gradeStatus === 'queued' || gradeStatus === 'grading';
  const canInvalidate = trade.status === 'draft' || trade.status === 'working' || trade.status === 'filled';
  const actionable = trade.status === 'draft' || trade.status === 'working' || trade.status === 'filled' || trade.status === 'closed';

  const formattedDate = trade.createdAt
    ? new Date(trade.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : null;

  const formattedInvalidatedAt = trade.invalidatedAt
    ? new Date(trade.invalidatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : null;

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };

  const runAndClose = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <>
      <div className="relative bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)] flex flex-col">
        <div className="bg-white dark:bg-black flex-grow flex flex-col [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)]">
        <div className={`border-b border-black dark:border-white p-3 flex justify-between items-center text-white ${trade.bias === 'Long' ? 'bg-emerald-600 dark:bg-emerald-700' : trade.bias === 'Short' ? 'bg-rose-600 dark:bg-rose-700' : 'bg-black dark:bg-white dark:text-black'}`}>
          <div className="font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="opacity-70">{trade.id}</span>
            <span>{trade.bias} {trade.instrument}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 opacity-90">
            {trade.status === 'working' && <Activity className="w-3 h-3" />}
            [{trade.status}]
            {userRole === 'ADMIN' && actionable && (
              <button
                onClick={toggleMenu}
                className="ml-1 h-7 w-7 flex items-center justify-center opacity-85 hover:opacity-60 transition-opacity"
                aria-label="Open trade action menu"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative p-6 flex-grow overflow-hidden">
          <div className="grid grid-cols-2 gap-y-6 mb-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">ENTRY</div>
              <div className="font-mono text-2xl">{trade.entry}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">RISK</div>
              <div className="font-mono text-2xl">${trade.riskAmount ?? 0}</div>
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

          {formattedDate && (
            <div className="border-t border-black dark:border-white pt-4">
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">CREATED</div>
              <div className="font-mono text-xs uppercase tracking-widest">{formattedDate}</div>
            </div>
          )}

          {trade.status === 'invalidated' && (
            <div className="border-t border-black dark:border-white pt-4 mt-4">
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">INVALIDATED</div>
              <div className="font-mono text-xs uppercase tracking-widest text-rose-600 dark:text-rose-400">
                {trade.invalidationReason || 'Reason not recorded'}
              </div>
              {formattedInvalidatedAt && (
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mt-2">{formattedInvalidatedAt}</div>
              )}
            </div>
          )}

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="absolute inset-0 z-30 bg-white/55 dark:bg-black/55 backdrop-blur-sm p-3 font-mono text-[10px] uppercase tracking-widest"
              >
                <motion.div
                  initial={{ opacity: 0, y: -10, scaleY: 0.96 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -8, scaleY: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: 'top center' }}
                  className="bg-white/90 dark:bg-black/90 border border-black dark:border-white"
                >
                {trade.status === 'draft' && (
                  <>
                    <button
                      onClick={() => runAndClose(() => onOpenDraftPanel(trade))}
                      className="w-full px-4 py-3 border-b border-black dark:border-white text-left border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                    >
                      <Settings2 className="w-3 h-3" /> EDIT
                    </button>
                    <button
                      onClick={() => runAndClose(() => onUpdateStatus(trade.id, 'working'))}
                      className="w-full px-4 py-3 border-b border-black dark:border-white text-left border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                    >
                      <Play className="w-3 h-3" /> SET ORDER
                    </button>
                    {canRegrade && (
                      <button
                        onClick={() => runAndClose(() => onRegrade(trade.id))}
                        className="w-full px-4 py-3 border-b border-black dark:border-white text-left border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                      >
                        <RefreshCw className="w-3 h-3" /> {gradeStatus === 'failed' ? 'RETRY GRADE' : 'RUN GRADE'}
                      </button>
                    )}
                    {isGrading && (
                      <div className="w-full px-4 py-3 border-b border-black dark:border-white text-left opacity-50 flex items-center gap-2">
                        <Activity className="w-3 h-3" /> GRADING
                      </div>
                    )}
                  </>
                )}

                {trade.status === 'working' && (
                  <>
                    <button
                      onClick={() => runAndClose(() => onOpenDraftPanel(trade))}
                      className="w-full px-4 py-3 border-b border-black dark:border-white text-left border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                    >
                      <Settings2 className="w-3 h-3" /> EDIT
                    </button>
                    <button
                      onClick={() => runAndClose(() => onUpdateStatus(trade.id, 'filled'))}
                      className="w-full px-4 py-3 border-b border-black dark:border-white text-left border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                    >
                      <CircleDot className="w-3 h-3" /> MARK FILLED
                    </button>
                  </>
                )}

                {trade.status === 'filled' && (
                  <button
                    onClick={() => runAndClose(() => onOpenJournal(trade.id))}
                    className="w-full px-4 py-3 border-b border-black dark:border-white text-left border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                  >
                    <X className="w-3 h-3" /> JOURNAL
                  </button>
                )}

                {trade.status === 'closed' && (
                  <button
                    onClick={() => runAndClose(() => onOpenReplay(trade))}
                    className="w-full px-4 py-3 border-b border-black dark:border-white text-left border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                  >
                    <Play className="w-3 h-3" /> REPLAY
                  </button>
                )}

                {canInvalidate && (
                  <button
                    onClick={() => runAndClose(() => onOpenInvalidatePanel(trade))}
                    className="w-full px-4 py-3 text-left text-rose-600 dark:text-rose-400 border-rose-600/60 dark:border-rose-400/60 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-500 dark:hover:text-black transition-colors flex items-center gap-2"
                  >
                    <Ban className="w-3 h-3" /> INVALIDATE
                  </button>
                )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {gradeStatus && gradeStatus !== 'not_requested' && (
          <GradeStatusBadge status={gradeStatus} />
        )}

      </div>
      </div>

    </>
  );
}
