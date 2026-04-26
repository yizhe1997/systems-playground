'use client';

import { useEffect, useState } from 'react';
import {
  deleteAccount,
  deleteInstrument,
  deleteRubric,
  draftTrade,
  getAIAvailability,
  improveRulesContext,
  improveText,
  invalidateTrade,
  journalTrade,
  regradeTradeSetup,
  saveAccount,
  saveInstrument,
  saveRubric,
  scrapeRulesFromUrls,
  updateTradeStatus,
} from '@/lib/dashboard/api';
import {
  Account,
  AccountFormState,
  DraftFormState,
  InstrumentDefinition,
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
import { useToast } from '@/hooks/use-toast';

const AI_FEATURE_KEY_RUBRIC_RULES_IMPROVE_TEXT = 'rubricRulesImproveText';
const AI_FEATURE_KEY_DRAFT_CONTEXT_NOTES_IMPROVE_TEXT = 'draftContextNotesImproveText';

interface UseDashboardMutationsInput {
  instruments: InstrumentDefinition[];
  rubrics: Rubric[];
  normalizedActiveAccountId: string;
  activeAccount: Account | null;
  setActiveAccountId: (id: string) => void;
  mutateAccounts: KeyedMutator<unknown>;
  mutateInstruments: KeyedMutator<unknown>;
  mutateTrades: KeyedMutator<unknown>;
  mutateRubrics: KeyedMutator<unknown>;
}

export function useDashboardMutations({
  instruments,
  rubrics,
  normalizedActiveAccountId,
  activeAccount,
  setActiveAccountId,
  mutateAccounts,
  mutateInstruments,
  mutateTrades,
  mutateRubrics,
}: UseDashboardMutationsInput) {
  const { toast } = useToast();
  // Panel open state
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [editTradeId, setEditTradeId] = useState<string | null>(null);
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [journalTradeId, setJournalTradeId] = useState<string | null>(null);
  const [invalidateTradeTarget, setInvalidateTradeTarget] = useState<Trade | null>(null);
  const [invalidateReasonText, setInvalidateReasonText] = useState('');

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
  const [isSavingInstrument, setIsSavingInstrument] = useState(false);
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
      runAiSetupGrade: false,
      aiSetupFindings: trade.aiSetupFindings || undefined,
    });
    setIsDraftOpen(true);
  };

  const openNewDraftPanel = () => {
    setEditTradeId(null);
    setDraftForm({
      ...DEFAULT_DRAFT_FORM,
      accountId: normalizedActiveAccountId,
      instrument: instruments[0]?.code || '',
      rubricId: rubrics[0]?.id || '',
    });
    setIsDraftOpen(true);
  };

  const closeDraftPanel = () => {
    setIsDraftOpen(false);
    setEditTradeId(null);
  };

  const openInvalidateTradePanel = (trade: Trade) => {
    setInvalidateTradeTarget(trade);
    setInvalidateReasonText('');
  };

  const closeInvalidateTradePanel = () => {
    setInvalidateTradeTarget(null);
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

      mutateTrades((current: unknown) => {
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
        instrument: draftForm.instrument || instruments[0]?.code || '',
        rubricId: rubrics[0]?.id || '',
      });
      mutateTrades();
      toast(editTradeId ? 'Trade updated.' : 'Trade drafted.', 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to save trade.', 'error');
    }
  };

  const handleRubricSubmit = async () => {
    try {
      await saveRubric(rubricForm);
      setIsRubricOpen(false);
      mutateRubrics();
      toast('Rubric saved.', 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to save rubric.', 'error');
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
      toast('Rubric deleted.', 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to delete rubric.', 'error');
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
      toast('Account saved.', 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to save account.', 'error');
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
      toast('Account deleted.', 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to delete account.', 'error');
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
        toast('Rules context extracted.', 'success');
      }
    } catch (error) {
      console.error(error);
      toast('Failed to scrape URLs.', 'error');
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
        toast('Rules context improved.', 'success');
      }
    } catch (error) {
      console.error(error);
      toast('Failed to improve rules.', 'error');
    }
    setIsAiImproving(false);
  };

  const handleAiImproveRubricRules = async () => {
    if (!rubricForm.rules) return;
    setIsAiImprovingRubric(true);
    try {
      const res = await improveText(rubricForm.rules, AI_FEATURE_KEY_RUBRIC_RULES_IMPROVE_TEXT);
      if (res && res.text) {
        setRubricForm({ ...rubricForm, rules: res.text });
        toast('Rubric rules improved.', 'success');
      }
    } catch (error) {
      console.error(error);
      toast('Failed to improve rubric rules.', 'error');
    }
    setIsAiImprovingRubric(false);
  };

  const handleAiImproveDraftNotes = async () => {
    if (!draftForm.notes) return;
    setIsAiImprovingDraft(true);
    try {
      const res = await improveText(draftForm.notes, AI_FEATURE_KEY_DRAFT_CONTEXT_NOTES_IMPROVE_TEXT);
      if (res && res.text) {
        setDraftForm({ ...draftForm, notes: res.text });
        toast('Notes improved.', 'success');
      }
    } catch (error) {
      console.error(error);
      toast('Failed to improve notes.', 'error');
    }
    setIsAiImprovingDraft(false);
  };

  const handleSaveInstrument = async (instrument: InstrumentDefinition, previousCode?: string) => {
    setIsSavingInstrument(true);
    try {
      if (previousCode && previousCode !== instrument.code) {
        await deleteInstrument(previousCode);
      }

      await saveInstrument({
        code: instrument.code,
      });
      await mutateInstruments();
      toast(`Instrument ${instrument.code} saved.`, 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to save instrument.', 'error');
      throw error;
    } finally {
      setIsSavingInstrument(false);
    }
  };

  const handleDeleteInstrument = async (code: string) => {
    try {
      await deleteInstrument(code);
      await mutateInstruments();
      toast(`Instrument ${code} deleted.`, 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to delete instrument.', 'error');
      throw error;
    }
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
      toast('Trade journaled.', 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to journal trade.', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateTradeStatus(id, newStatus);
      mutateTrades();
    } catch (error) {
      console.error(error);
      toast('Failed to update trade status.', 'error');
    }
  };

  const handleRegrade = async (id: string) => {
    try {
      await regradeTradeSetup(id);
      mutateTrades();
      toast('Regrade queued.', 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to enqueue regrade.', 'error');
    }
  };

  const handleInvalidateTrade = async (id: string, reason: string) => {
    try {
      await invalidateTrade(id, reason);
      mutateTrades();
      toast('Trade invalidated.', 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to invalidate trade.', 'error');
    }
  };

  const handleInvalidateSubmit = async () => {
    if (!invalidateTradeTarget) {
      return;
    }

    const reason = invalidateReasonText.trim();

    if (!reason) {
      window.alert('Please provide an invalidation reason.');
      return;
    }

    await handleInvalidateTrade(invalidateTradeTarget.id, reason);
    closeInvalidateTradePanel();
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
    invalidateTradeTarget,
    invalidateReasonText,
    setInvalidateReasonText,
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
    isSavingInstrument,
    availableAiProviders,
    // Panel helpers
    openDraftPanel,
    openNewDraftPanel,
    closeDraftPanel,
    openInvalidateTradePanel,
    closeInvalidateTradePanel,
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
    handleSaveInstrument,
    handleDeleteInstrument,
    handleJournalSubmit,
    handleUpdateStatus,
    handleRegrade,
    handleInvalidateTrade,
    handleInvalidateSubmit,
  };
}
