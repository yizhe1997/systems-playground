'use client';

import { useEffect, useRef, useState } from 'react';
import { Account, UserRole } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface DashboardHeaderProps {
  activeAccount: Account | null;
  accounts: Account[];
  userRole: UserRole;
  onSelectAccount: (id: string) => void;
  onOpenUpdateAccount: () => void;
  onOpenNewAccount: () => void;
}

export function DashboardHeader({
  activeAccount,
  accounts,
  userRole,
  onSelectAccount,
  onOpenUpdateAccount,
  onOpenNewAccount,
}: DashboardHeaderProps) {
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-24">
      <div className="lg:col-span-8">
        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.9]">
          Futures Copilot
          <span className="block text-xl md:text-3xl font-mono tracking-widest mt-6 font-normal">
            {'// INTELLIGENCE LAYER'}
          </span>
        </h1>
      </div>

      <div className="lg:col-span-4 self-end">
        <div className="border border-black dark:border-white p-6 bg-white dark:bg-black">
          <div ref={accountDropdownRef} className="flex justify-between items-start border-b border-black dark:border-white pb-4 mb-4 relative">
            <button
              onClick={() => setIsAccountDropdownOpen(prev => !prev)}
              className="font-mono text-xs uppercase tracking-widest bg-transparent flex items-center gap-2 text-black dark:text-white"
            >
              <span>{activeAccount?.type || 'NO ACCOUNT'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isAccountDropdownOpen && accounts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col"
                >
                  {accounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => {
                        onSelectAccount(account.id);
                        setIsAccountDropdownOpen(false);
                      }}
                      className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b last:border-b-0 border-black dark:border-white opacity-80 hover:opacity-100"
                    >
                      {account.type}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex gap-2">
              {userRole === 'ADMIN' && activeAccount && (
                <button
                  onClick={onOpenUpdateAccount}
                  className="font-mono text-[10px] uppercase tracking-widest border border-black dark:border-white px-2 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                >
                  UPDATE
                </button>
              )}
              {userRole === 'ADMIN' && (
                <button
                  onClick={onOpenNewAccount}
                  className="font-mono text-[10px] uppercase tracking-widest border border-black dark:border-white px-2 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                >
                  + NEW
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">BALANCE</div>
              <div className="font-mono text-2xl">${activeAccount?.currentBalance?.toLocaleString() || 0}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">DAILY STOP</div>
              <div className="font-mono text-xl">${activeAccount?.currentDailyStopLevel?.toLocaleString() || 0}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">MAX LOSS FLOOR</div>
              <div className="font-mono text-xl">${activeAccount?.currentMaxLossLevel?.toLocaleString() || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
