'use client';

import { AnimatePresence } from 'framer-motion';
import { Trade, UserRole } from '../types';
import { TradeCard } from './TradeCard';

interface TradeGridProps {
  trades: Trade[];
  userRole: UserRole;
  onOpenDraftPanel: (trade: Trade) => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onOpenJournal: (id: string) => void;
}

export function TradeGrid({ trades, userRole, onOpenDraftPanel, onUpdateStatus, onOpenJournal }: TradeGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
      <AnimatePresence mode="popLayout">
        {trades.map(trade => (
          <TradeCard
            key={trade.id}
            trade={trade}
            userRole={userRole}
            onOpenDraftPanel={onOpenDraftPanel}
            onUpdateStatus={onUpdateStatus}
            onOpenJournal={onOpenJournal}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
