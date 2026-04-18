'use client';

import { Activity, CircleDot, Play, Settings2, X } from 'lucide-react';
import { Trade, UserRole } from '../types';

interface TradeCardProps {
  trade: Trade;
  userRole: UserRole;
  onOpenDraftPanel: (trade: Trade) => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onOpenJournal: (id: string) => void;
}

export function TradeCard({ trade, userRole, onOpenDraftPanel, onUpdateStatus, onOpenJournal }: TradeCardProps) {
  return (
    <div className="bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)] flex flex-col">
      <div className="bg-white dark:bg-black flex-grow flex flex-col [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)]">
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

        <div className="p-6 flex-grow">
          <div className="grid grid-cols-2 gap-y-6 mb-8">
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

          <div className="border-t border-black dark:border-white pt-4">
            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">NOTES</div>
            <p className="font-mono text-xs leading-relaxed uppercase">
              &quot;{trade.notes || ''}&quot;
            </p>
          </div>
        </div>

        {userRole === 'ADMIN' && (
          <div className="flex border-t border-black dark:border-white font-mono text-[10px] uppercase tracking-widest">
            {trade.status === 'draft' && (
              <>
                <button
                  onClick={() => onOpenDraftPanel(trade)}
                  className="flex-1 py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-1.5"
                >
                  <Settings2 className="w-3 h-3" /> EDIT
                </button>
                <button className="flex-[1.5] py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-1.5">
                  <Activity className="w-3 h-3" /> AI CHECK
                </button>
                <button
                  onClick={() => onUpdateStatus(trade.id, 'working')}
                  className="flex-[1.5] py-4 bg-[#ececec] dark:bg-[#1a1a1a] hover:opacity-80 transition-opacity flex items-center justify-center gap-1.5 font-bold"
                >
                  <Play className="w-3 h-3" /> SET ORDER
                </button>
              </>
            )}
            {trade.status === 'working' && (
              <>
                <button
                  onClick={() => onOpenDraftPanel(trade)}
                  className="flex-1 py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-2"
                >
                  <Settings2 className="w-4 h-4" /> EDIT LEVELS
                </button>
                <button
                  onClick={() => onUpdateStatus(trade.id, 'filled')}
                  className="flex-1 py-4 bg-[#ececec] dark:bg-[#1a1a1a] hover:opacity-80 transition-opacity flex items-center justify-center gap-2 font-bold"
                >
                  <CircleDot className="w-4 h-4" /> MARK FILLED
                </button>
              </>
            )}
            {trade.status === 'filled' && (
              <>
                <button
                  onClick={() => onOpenDraftPanel(trade)}
                  className="flex-1 py-4 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-2"
                >
                  <Settings2 className="w-4 h-4" /> EDIT TARGETS
                </button>
                <button
                  onClick={() => onOpenJournal(trade.id)}
                  className="flex-1 py-4 bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity flex items-center justify-center gap-2 font-bold"
                >
                  <X className="w-4 h-4" /> CLOSE & JOURNAL
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
