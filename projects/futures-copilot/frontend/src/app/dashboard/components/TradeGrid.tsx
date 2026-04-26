'use client';

import { SearchX } from 'lucide-react';
import { Trade, UserRole } from '../types';
import { TradeCard } from './TradeCard';

interface TradeGridProps {
  trades: Trade[];
  userRole: UserRole;
  onOpenDraftPanel: (trade: Trade) => void;
  onOpenReplay: (trade: Trade) => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onOpenJournal: (id: string) => void;
  onRegrade: (id: string) => void;
  onOpenInvalidatePanel: (trade: Trade) => void;
}

export function TradeGrid({ trades, userRole, onOpenDraftPanel, onOpenReplay, onUpdateStatus, onOpenJournal, onRegrade, onOpenInvalidatePanel }: TradeGridProps) {
  if (trades.length === 0) {
    return (
      <div className="border border-black dark:border-white p-8 md:p-12 text-center bg-[#f8f8f8] dark:bg-[#111]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <SearchX className="w-5 h-5" />
          </div>
          <h3 className="font-mono text-sm md:text-base uppercase tracking-widest font-bold">No Trades Found</h3>
          <p className="font-mono text-[10px] md:text-xs uppercase tracking-widest opacity-70 max-w-xl leading-relaxed">
            No results match the current filters. Try changing status, date range, or selected account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-10 md:gap-y-12">
      {trades.map(trade => (
        <TradeCard
          key={trade.id}
          trade={trade}
          userRole={userRole}
          onOpenDraftPanel={onOpenDraftPanel}
          onOpenReplay={onOpenReplay}
          onUpdateStatus={onUpdateStatus}
          onOpenJournal={onOpenJournal}
          onRegrade={onRegrade}
          onOpenInvalidatePanel={onOpenInvalidatePanel}
        />
      ))}
    </div>
  );
}
