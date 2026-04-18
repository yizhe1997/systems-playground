'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { API_ENDPOINTS, fetcher } from '@/lib/dashboard/api';
import { Account, DashboardTab, PaginatedTradesResponse, Rubric, Trade } from '../types';

export function useDashboardData(activeTab: DashboardTab) {
  const [activeAccountId, setActiveAccountId] = useState('a-001');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [mounted, setMounted] = useState(false);

  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role || 'ANON';

  const { data: rawAccounts, mutate: mutateAccounts } = useSWR(API_ENDPOINTS.accounts, fetcher, { fallbackData: [] });
  const { data: rawRubrics, mutate: mutateRubrics } = useSWR(API_ENDPOINTS.rubrics, fetcher, { fallbackData: [] });

  const accounts = (rawAccounts || []) as Account[];
  const rubrics = (rawRubrics || []) as Rubric[];

  const normalizedActiveAccountId = accounts.some(a => a.id === activeAccountId)
    ? activeAccountId
    : (accounts[0]?.id || '');

  const tradesParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (normalizedActiveAccountId) {
    tradesParams.set('accountId', normalizedActiveAccountId);
  }

  if (activeTab !== 'all') {
    tradesParams.set('status', activeTab);
  }

  if (createdFrom) {
    tradesParams.set('createdFrom', createdFrom);
  }

  if (createdTo) {
    tradesParams.set('createdTo', createdTo);
  }

  const tradesUrl = `${API_ENDPOINTS.trades}?${tradesParams.toString()}`;
  const { data: rawTradesPage, mutate: mutateTrades } = useSWR(tradesUrl, fetcher, {
    fallbackData: {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    } satisfies PaginatedTradesResponse,
  });

  const tradesPage = (rawTradesPage || {
    items: [],
    total: 0,
    page: 1,
    pageSize,
    totalPages: 1,
  }) as PaginatedTradesResponse;

  const trades = (tradesPage.items || []) as Trade[];

  const activeAccount = accounts.find(a => a.id === normalizedActiveAccountId) || accounts[0] || null;

  const filteredTrades = trades;

  const visibleTrades = trades;

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, normalizedActiveAccountId, createdFrom, createdTo]);

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
    createdFrom,
    setCreatedFrom,
    createdTo,
    setCreatedTo,
    page,
    setPage,
    pageSize,
    totalTrades: tradesPage.total,
    totalPages: tradesPage.totalPages,
    userRole,
    mounted,
  };
}
