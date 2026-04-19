'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Plus, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DashboardTab, UserRole } from '../types';

interface DashboardControlBarProps {
  activeTab: DashboardTab;
  createdFrom: string;
  createdTo: string;
  userRole: UserRole;
  onTabChange: (tab: DashboardTab) => void;
  onCreatedFromChange: (value: string) => void;
  onCreatedToChange: (value: string) => void;
  onClearFilters: () => void;
  onOpenRubric: () => void;
  onOpenDraft: () => void;
}

const TABS: DashboardTab[] = ['all', 'draft', 'working', 'filled'];

export function DashboardControlBar({
  activeTab,
  createdFrom,
  createdTo,
  userRole,
  onTabChange,
  onCreatedFromChange,
  onCreatedToChange,
  onClearFilters,
  onOpenRubric,
  onOpenDraft,
}: DashboardControlBarProps) {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const hasActiveFilters = activeTab !== 'all' || createdFrom !== '' || createdTo !== '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-black dark:border-white pb-4 mb-12 gap-6">
      <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6 w-full md:w-auto">
        <div ref={statusDropdownRef} className="relative min-w-[190px]">
          <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Status</label>
          <button
            onClick={() => setIsStatusDropdownOpen(prev => !prev)}
            className="w-full bg-transparent border border-black dark:border-white px-3 py-2 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
          >
            <span>{activeTab}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isStatusDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col"
              >
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      onTabChange(tab);
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors border-b last:border-b-0 border-black dark:border-white ${
                      activeTab === tab
                        ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                        : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black opacity-80 hover:opacity-100'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="min-w-[300px]">
          <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Date Range</label>
          <div className="flex items-center gap-2 border border-black dark:border-white px-3 py-2">
            <input
              type="date"
              value={createdFrom}
              onChange={event => onCreatedFromChange(event.target.value)}
              className="bg-transparent font-mono text-xs uppercase tracking-widest focus:outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
              aria-label="Created from date"
            />
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">to</span>
            <input
              type="date"
              value={createdTo}
              onChange={event => onCreatedToChange(event.target.value)}
              className="bg-transparent font-mono text-xs uppercase tracking-widest focus:outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
              aria-label="Created to date"
            />
          </div>
        </div>

        <button
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className="px-4 py-2 border border-black dark:border-white font-mono text-[10px] md:text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-40"
        >
          Clear Filters
        </button>
      </div>

      <div className="flex gap-4 font-mono text-xs tracking-widest uppercase">
        {userRole === 'ADMIN' && (
          <>
            <button
              onClick={onOpenRubric}
              className="flex items-center gap-2 px-4 py-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              RUBRIC CONFIG
            </button>
            <button
              onClick={onOpenDraft}
              className="flex items-center gap-2 px-4 py-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            >
              <Plus className="w-4 h-4" />
              DRAFT NEW SETUP
            </button>
          </>
        )}
      </div>
    </div>
  );
}
