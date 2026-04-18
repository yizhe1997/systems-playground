'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { API_ENDPOINTS, fetcher } from '@/lib/dashboard/api';
import { Account, DashboardTab, Rubric, Trade } from '../types';

export function useDashboardData(activeTab: DashboardTab) {
  const [activeAccountId, setActiveAccountId] = useState('a-001');
  const [mounted, setMounted] = useState(false);

  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role || 'ANON';

  const { data: rawAccounts, mutate: mutateAccounts } = useSWR(API_ENDPOINTS.accounts, fetcher, { fallbackData: [] });
  const { data: rawTrades, mutate: mutateTrades } = useSWR(API_ENDPOINTS.trades, fetcher, { fallbackData: [] });
  const { data: rawRubrics, mutate: mutateRubrics } = useSWR(API_ENDPOINTS.rubrics, fetcher, { fallbackData: [] });

  const accounts = (rawAccounts || []) as Account[];
  const trades = (rawTrades || []) as Trade[];
  const rubrics = (rawRubrics || []) as Rubric[];

  const normalizedActiveAccountId = accounts.some(a => a.id === activeAccountId)
    ? activeAccountId
    : (accounts[0]?.id || '');

  const activeAccount = accounts.find(a => a.id === normalizedActiveAccountId) || accounts[0] || null;

  const filteredTrades = trades.filter(
    t => t.accountId === activeAccount?.id && (activeTab === 'all' || t.status === activeTab)
  );

  const visibleTrades = userRole === 'ANON' ? filteredTrades.slice(0, 3) : filteredTrades;

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return {
    accounts,
    trades,
    rubrics,
    mutateAccounts,
    mutateTrades,
    mutateRubrics,
    activeAccountId,
    setActiveAccountId,
    normalizedActiveAccountId,
    activeAccount,
    filteredTrades,
    visibleTrades,
    userRole,
    mounted,
  };
}
