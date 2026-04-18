'use client';

import { useState } from 'react';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardControlBar } from './components/DashboardControlBar';
import { TradeGrid } from './components/TradeGrid';
import { DashboardPagination } from './components/DashboardPagination';
import { DraftTradePanel } from './components/panels/DraftTradePanel';
import { RubricConfigPanel } from './components/panels/RubricConfigPanel';
import { AccountPanel } from './components/panels/AccountPanel';
import { JournalPanel } from './components/panels/JournalPanel';
import { DashboardTab } from './types';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardMutations } from './hooks/useDashboardMutations';

export default function CopilotPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('all');

  const data = useDashboardData(activeTab);
  const {
    accounts,
    rubrics,
    visibleTrades,
    activeAccount,
    activeAccountId,
    setActiveAccountId,
    normalizedActiveAccountId,
    mutateTrades,
    mutateAccounts,
    mutateRubrics,
    userRole,
    mounted,
    createdFrom,
    setCreatedFrom,
    createdTo,
    setCreatedTo,
    page,
    setPage,
    pageSize,
    totalTrades,
    totalPages,
  } = data;

  const mutations = useDashboardMutations({
    trades: data.trades,
    rubrics,
    normalizedActiveAccountId,
    activeAccount,
    setActiveAccountId,
    mutateAccounts,
    mutateTrades,
    mutateRubrics,
  });

  const {
    isDraftOpen,
    editTradeId,
    isRubricOpen,
    setIsRubricOpen,
    isAccountOpen,
    setIsAccountOpen,
    journalTradeId,
    setJournalTradeId,
    draftForm,
    setDraftForm,
    rubricForm,
    setRubricForm,
    accountForm,
    setAccountForm,
    journalData,
    setJournalData,
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
    openDraftPanel,
    openNewDraftPanel,
    closeDraftPanel,
    openUpdateAccountPanel,
    openNewAccountPanel,
    handleDraftSubmit,
    handleRubricSubmit,
    handleDeleteRubric,
    handleAccountSubmit,
    handleDeleteAccount,
    handleAiScrapeUrls,
    handleAiImproveRules,
    handleJournalSubmit,
    handleUpdateStatus,
  } = mutations;

  const clearFilters = () => {
    setActiveTab('all');
    setCreatedFrom('');
    setCreatedTo('');
  };

  if (!mounted) return null;

  return (
    <div className="w-full">
      <main className="max-w-[1600px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">
        <DashboardHeader
          activeAccount={activeAccount}
          accounts={accounts}
          userRole={userRole}
          onSelectAccount={setActiveAccountId}
          onOpenUpdateAccount={openUpdateAccountPanel}
          onOpenNewAccount={openNewAccountPanel}
        />

        <DashboardControlBar
          activeTab={activeTab}
          createdFrom={createdFrom}
          createdTo={createdTo}
          userRole={userRole}
          onTabChange={setActiveTab}
          onCreatedFromChange={setCreatedFrom}
          onCreatedToChange={setCreatedTo}
          onClearFilters={clearFilters}
          onOpenRubric={() => setIsRubricOpen(true)}
          onOpenDraft={openNewDraftPanel}
        />

        <TradeGrid
          trades={visibleTrades}
          userRole={userRole}
          onOpenDraftPanel={openDraftPanel}
          onUpdateStatus={handleUpdateStatus}
          onOpenJournal={setJournalTradeId}
        />

        <DashboardPagination
          page={page}
          totalPages={totalPages}
          totalTrades={totalTrades}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </main>

      <DraftTradePanel
        isOpen={isDraftOpen}
        editTradeId={editTradeId}
        activeAccountId={activeAccountId}
        accounts={accounts}
        rubrics={rubrics}
        draftForm={draftForm}
        onClose={closeDraftPanel}
        onDraftFormChange={setDraftForm}
        onSubmit={handleDraftSubmit}
      />

      <RubricConfigPanel
        isOpen={isRubricOpen}
        rubrics={rubrics}
        rubricForm={rubricForm}
        showDeleteRubricConfirm={showDeleteRubricConfirm}
        onClose={() => setIsRubricOpen(false)}
        onRubricFormChange={setRubricForm}
        onShowDeleteConfirmChange={setShowDeleteRubricConfirm}
        onSave={handleRubricSubmit}
        onDelete={handleDeleteRubric}
      />

      <AccountPanel
        isOpen={isAccountOpen}
        accountForm={accountForm}
        showDeleteConfirm={showDeleteConfirm}
        showUrlInput={showUrlInput}
        aiUrlsInput={aiUrlsInput}
        isAiScraping={isAiScraping}
        isAiImproving={isAiImproving}
        onClose={() => setIsAccountOpen(false)}
        onAccountFormChange={setAccountForm}
        onShowDeleteConfirmChange={setShowDeleteConfirm}
        onShowUrlInputChange={setShowUrlInput}
        onAiUrlsInputChange={setAiUrlsInput}
        onAiImproveRules={handleAiImproveRules}
        onAiScrapeUrls={handleAiScrapeUrls}
        onSubmit={handleAccountSubmit}
        onDelete={handleDeleteAccount}
      />

      <JournalPanel
        tradeId={journalTradeId}
        journalData={journalData}
        onJournalDataChange={setJournalData}
        onClose={() => setJournalTradeId(null)}
        onSubmit={handleJournalSubmit}
      />
    </div>
  );
}