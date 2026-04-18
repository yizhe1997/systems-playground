'use client';

import { useState } from 'react';
import {
  deleteAccount,
  deleteRubric,
  draftTrade,
  improveRulesContext,
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
      const payload = {
        ...draftForm,
        accountId: draftForm.accountId || normalizedActiveAccountId,
        entry: parseFloat(draftForm.entry),
        stopLoss: parseFloat(draftForm.stopLoss),
        takeProfit: parseFloat(draftForm.takeProfit),
      };
      mutateTrades([...trades, { ...payload, id: 'temp-draft', status: 'draft', riskAmount: 0 }], false);
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
    try {
      const payload = {
        ...accountForm,
        currentBalance: Number(accountForm.currentBalance),
        currentDailyStopLevel: Number(accountForm.currentDailyStopLevel),
        currentMaxLossLevel: Number(accountForm.currentMaxLossLevel),
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
    if (urls.length === 0) return;
    setIsAiScraping(true);
    try {
      const res = await scrapeRulesFromUrls(urls);
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
    if (!accountForm.rulesContext) return;
    setIsAiImproving(true);
    try {
      const res = await improveRulesContext(accountForm.rulesContext);
      if (res && res.context) {
        setAccountForm({ ...accountForm, rulesContext: res.context });
      }
    } catch (error) {
      console.error(error);
    }
    setIsAiImproving(false);
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
    handleJournalSubmit,
    handleUpdateStatus,
  };
}
