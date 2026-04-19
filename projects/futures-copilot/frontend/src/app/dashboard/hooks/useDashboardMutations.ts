'use client';

import { useEffect, useState } from 'react';
import {
  deleteAccount,
  deleteRubric,
  draftTrade,
  getAIAvailability,
  improveRulesContext,
  improveText,
  journalTrade,
  saveAccount,
  saveRubric,
  scrapeRulesFromUrls,
  updateTradeStatus,
} from '@/lib/dashboard/api';
import {
  Account,
  AccountFormState,
  DraftFormState,
  JournalDataState,
  PaginatedTradesResponse,
  Rubric,
  RubricFormState,
  Trade,
} from '../types';
import {
  DEFAULT_ACCOUNT_FORM,
  DEFAULT_DRAFT_FORM,
  DEFAULT_JOURNAL_DATA,
  DEFAULT_RUBRIC_FORM,
} from '../constants';
import { KeyedMutator } from 'swr';

interface UseDashboardMutationsInput {
  trades: Trade[];
  rubrics: Rubric[];
  normalizedActiveAccountId: string;
  activeAccount: Account | null;
  setActiveAccountId: (id: string) => void;
  mutateAccounts: KeyedMutator<unknown>;
  mutateTrades: KeyedMutator<unknown>;
  mutateRubrics: KeyedMutator<unknown>;
}

export function useDashboardMutations({
  trades,
  rubrics,
  normalizedActiveAccountId,
  activeAccount,
  setActiveAccountId,
  mutateAccounts,
  mutateTrades,
  mutateRubrics,
}: UseDashboardMutationsInput) {
  // Panel open state
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [editTradeId, setEditTradeId] = useState<string | null>(null);
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [journalTradeId, setJournalTradeId] = useState<string | null>(null);

  // Form state
  const [draftForm, setDraftForm] = useState<DraftFormState>(DEFAULT_DRAFT_FORM);
  const [rubricForm, setRubricForm] = useState<RubricFormState>(DEFAULT_RUBRIC_FORM);
  const [accountForm, setAccountForm] = useState<AccountFormState>(DEFAULT_ACCOUNT_FORM);
  const [journalData, setJournalData] = useState<JournalDataState>(DEFAULT_JOURNAL_DATA);

  // Account panel UI state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteRubricConfirm, setShowDeleteRubricConfirm] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [aiUrlsInput, setAiUrlsInput] = useState<string[]>(['']);
  const [isAiScraping, setIsAiScraping] = useState(false);
  const [isAiImproving, setIsAiImproving] = useState(false);
  const [isAiImprovingRubric, setIsAiImprovingRubric] = useState(false);
  const [isAiImprovingDraft, setIsAiImprovingDraft] = useState(false);
  const [availableAiProviders, setAvailableAiProviders] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAIAvailability() {
      if (!isAccountOpen && !isRubricOpen && !isDraftOpen) {
        return;
      }

      try {
        const availability = await getAIAvailability();
        if (cancelled) {
          return;
        }

        const realProviders = (availability.availableProviders || []).filter(provider => provider !== 'mock');
        setAvailableAiProviders(realProviders);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setAvailableAiProviders([]);
        }
      }
    }

    loadAIAvailability();

    return () => {
      cancelled = true;
    };
  }, [isAccountOpen, isRubricOpen, isDraftOpen]);

  // Panel navigation helpers
  const openDraftPanel = (trade: Trade) => {
    setEditTradeId(trade.id);
    setDraftForm({
      accountId: trade.accountId,
      instrument: trade.instrument,
      bias: trade.bias === 'Short' ? 'Short' : 'Long',
      entry: trade.entry.toString(),
      stopLoss: trade.stopLoss.toString(),
      takeProfit: trade.takeProfit.toString(),
      contracts: trade.contracts,
      notes: trade.notes || '',
      rubricId: trade.rubricId || '',
    });
    setIsDraftOpen(true);
  };

  const openNewDraftPanel = () => {
    setEditTradeId(null);
    setDraftForm({
      ...DEFAULT_DRAFT_FORM,
      accountId: normalizedActiveAccountId,
      rubricId: rubrics[0]?.id || '',
    });
    setIsDraftOpen(true);
  };

  const closeDraftPanel = () => {
    setIsDraftOpen(false);
    setEditTradeId(null);
  };

  const openUpdateAccountPanel = () => {
    if (activeAccount) {
      setAccountForm({
        id: activeAccount.id,
        type: activeAccount.type,
        currentBalance: activeAccount.currentBalance,
        currentDailyStopLevel: activeAccount.currentDailyStopLevel,
        currentMaxLossLevel: activeAccount.currentMaxLossLevel,
        rulesContext: activeAccount.rulesContext || '',
      });
      setShowDeleteConfirm(false);
      setIsAccountOpen(true);
    }
  };

  const openNewAccountPanel = () => {
    setAccountForm(DEFAULT_ACCOUNT_FORM);
    setShowDeleteConfirm(false);
    setShowUrlInput(false);
    setAiUrlsInput(['']);
    setIsAccountOpen(true);
  };

  // Mutation handlers
  const handleDraftSubmit = async () => {
    try {
      const entry = parseFloat(draftForm.entry);
      const stopLoss = parseFloat(draftForm.stopLoss);
      const takeProfit = parseFloat(draftForm.takeProfit);

      if (!Number.isFinite(entry) || !Number.isFinite(stopLoss) || !Number.isFinite(takeProfit)) {
        window.alert('Entry zone, stop loss, and take profit must all be valid numbers.');
        return;
      }

      const payload = {
        ...draftForm,
        accountId: draftForm.accountId || normalizedActiveAccountId,
        entry,
        stopLoss,
        takeProfit,
      };

      mutateTrades(current => {
        const currentPage = current as PaginatedTradesResponse | undefined;
        if (!currentPage || !Array.isArray(currentPage.items)) {
          return current;
        }

        const optimisticTrade: Trade = {
          ...payload,
          id: 'temp-draft',
          status: 'draft',
          riskAmount: 0,
        };
        const nextTotal = (currentPage.total || 0) + 1;
        const nextPageSize = currentPage.pageSize || 1;

        return {
          ...currentPage,
          items: [optimisticTrade, ...currentPage.items].slice(0, nextPageSize),
          total: nextTotal,
          totalPages: Math.max(1, Math.ceil(nextTotal / nextPageSize)),
        };
      }, false);

      await draftTrade(payload);
      setIsDraftOpen(false);
      setEditTradeId(null);
      setDraftForm({
        ...DEFAULT_DRAFT_FORM,
        accountId: draftForm.accountId || normalizedActiveAccountId,
        rubricId: rubrics[0]?.id || '',
      });
      mutateTrades();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRubricSubmit = async () => {
    try {
      await saveRubric(rubricForm);
      setIsRubricOpen(false);
      mutateRubrics();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteRubric = async () => {
    if (!rubricForm.id) return;
    try {
      await deleteRubric(rubricForm.id);
      setShowDeleteRubricConfirm(false);
      setIsRubricOpen(false);
      const fetchedRubrics = await mutateRubrics();
      if (fetchedRubrics && (fetchedRubrics as Rubric[]).length > 0) {
        setRubricForm((fetchedRubrics as Rubric[])[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAccountSubmit = async () => {
    const type = accountForm.type.trim();
    const currentBalance = Number(accountForm.currentBalance);
    const dailyStopLevel = Number(accountForm.currentDailyStopLevel);
    const maxLossLevel = Number(accountForm.currentMaxLossLevel);

    if (!type) {
      window.alert('Account type is required.');
      return;
    }

    if (!Number.isFinite(currentBalance) || currentBalance <= 0) {
      window.alert('Current balance is required and must be greater than 0.');
      return;
    }

    if (!Number.isFinite(dailyStopLevel) || dailyStopLevel <= 0) {
      window.alert('Daily stop level is required and must be greater than 0.');
      return;
    }

    if (!Number.isFinite(maxLossLevel) || maxLossLevel <= 0) {
      window.alert('Max loss level is required and must be greater than 0.');
      return;
    }

    try {
      const payload = {
        ...accountForm,
        type,
        currentBalance,
        currentDailyStopLevel: dailyStopLevel,
        currentMaxLossLevel: maxLossLevel,
      };
      const res = await saveAccount(payload);
      setIsAccountOpen(false);
      const fetchedAccounts = await mutateAccounts();
      if (fetchedAccounts) {
        setActiveAccountId(res.id || (fetchedAccounts as Account[])[0]?.id || '');
      }
      setAccountForm(DEFAULT_ACCOUNT_FORM);
      setShowUrlInput(false);
      setAiUrlsInput(['']);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountForm.id) return;
    try {
      await deleteAccount(accountForm.id);
      setIsAccountOpen(false);
      setShowDeleteConfirm(false);
      const fetchedAccounts = await mutateAccounts();
      if (fetchedAccounts && (fetchedAccounts as Account[]).length > 0) {
        setActiveAccountId((fetchedAccounts as Account[])[0].id);
      } else {
        setActiveAccountId('');
      }
      mutateTrades();
      setAccountForm(DEFAULT_ACCOUNT_FORM);
      setShowUrlInput(false);
      setAiUrlsInput(['']);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAiScrapeUrls = async () => {
    const urls = aiUrlsInput.map(s => s.trim()).filter(Boolean);
    const accountType = accountForm.type.trim();
    if (urls.length === 0 || !accountType) return;
    setIsAiScraping(true);
    try {
      const res = await scrapeRulesFromUrls(urls, accountType);
      if (res && res.context) {
        setAccountForm({ ...accountForm, rulesContext: res.context });
        setAiUrlsInput(['']);
        setShowUrlInput(false);
      }
    } catch (error) {
      console.error(error);
    }
    setIsAiScraping(false);
  };

  const handleAiImproveRules = async () => {
    const accountType = accountForm.type.trim();
    if (!accountForm.rulesContext || !accountType) return;
    setIsAiImproving(true);
    try {
      const res = await improveRulesContext(accountForm.rulesContext, accountType);
      if (res && res.context) {
        setAccountForm({ ...accountForm, rulesContext: res.context });
      }
    } catch (error) {
      console.error(error);
    }
    setIsAiImproving(false);
  };

  const handleAiImproveRubricRules = async () => {
    if (!rubricForm.rules) return;
    setIsAiImprovingRubric(true);
    try {
      const res = await improveText(rubricForm.rules);
      if (res && res.text) {
        setRubricForm({ ...rubricForm, rules: res.text });
      }
    } catch (error) {
      console.error(error);
    }
    setIsAiImprovingRubric(false);
  };

  const handleAiImproveDraftNotes = async () => {
    if (!draftForm.notes) return;
    setIsAiImprovingDraft(true);
    try {
      const res = await improveText(draftForm.notes);
      if (res && res.text) {
        setDraftForm({ ...draftForm, notes: res.text });
      }
    } catch (error) {
      console.error(error);
    }
    setIsAiImprovingDraft(false);
  };

  const handleJournalSubmit = async () => {
    if (!journalTradeId) return;
    try {
      await journalTrade({
        tradeId: journalTradeId,
        pnl: parseFloat(journalData.pnl),
        outcome: journalData.outcome,
        reflection: journalData.reflection,
      });
      setJournalTradeId(null);
      setJournalData(DEFAULT_JOURNAL_DATA);
      mutateTrades();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateTradeStatus(id, newStatus);
      mutateTrades();
    } catch (error) {
      console.error(error);
    }
  };

  return {
    // Panel open state
    isDraftOpen,
    setIsDraftOpen,
    editTradeId,
    isRubricOpen,
    setIsRubricOpen,
    isAccountOpen,
    setIsAccountOpen,
    journalTradeId,
    setJournalTradeId,
    // Form state
    draftForm,
    setDraftForm,
    rubricForm,
    setRubricForm,
    accountForm,
    setAccountForm,
    journalData,
    setJournalData,
    // Account panel UI state
    showDeleteConfirm,
    setShowDeleteConfirm,
    showDeleteRubricConfirm,
    setShowDeleteRubricConfirm,
    showUrlInput,
    setShowUrlInput,
    aiUrlsInput,
    setAiUrlsInput,
    isAiScraping,
    isAiImproving,
    isAiImprovingRubric,
    isAiImprovingDraft,
    availableAiProviders,
    // Panel helpers
    openDraftPanel,
    openNewDraftPanel,
    closeDraftPanel,
    openUpdateAccountPanel,
    openNewAccountPanel,
    // Mutation handlers
    handleDraftSubmit,
    handleRubricSubmit,
    handleDeleteRubric,
    handleAccountSubmit,
    handleDeleteAccount,
    handleAiScrapeUrls,
    handleAiImproveRules,
    handleAiImproveRubricRules,
    handleAiImproveDraftNotes,
    handleJournalSubmit,
    handleUpdateStatus,
  };
}
