'use client';

import { Plus, Settings2 } from 'lucide-react';
import { DashboardTab, UserRole } from '../types';

interface DashboardControlBarProps {
  activeTab: DashboardTab;
  userRole: UserRole;
  onTabChange: (tab: DashboardTab) => void;
  onOpenRubric: () => void;
  onOpenDraft: () => void;
}

const TABS: DashboardTab[] = ['all', 'draft', 'working', 'filled'];

export function DashboardControlBar({ activeTab, userRole, onTabChange, onOpenRubric, onOpenDraft }: DashboardControlBarProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-black dark:border-white pb-4 mb-12 gap-6">
      <div className="flex gap-6 font-mono text-sm uppercase tracking-widest">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`relative pb-1 ${activeTab === tab ? 'font-bold' : 'opacity-50 hover:opacity-100 transition-opacity'}`}
          >
            [{tab}]
          </button>
        ))}
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
