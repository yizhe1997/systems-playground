'use client';

import { useState } from 'react';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardControlBar } from './components/DashboardControlBar';
import { TradeGrid } from './components/TradeGrid';
import { DashboardPagination } from './components/DashboardPagination';
import { DraftTradePanel } from './components/panels/DraftTradePanel';
import { RubricConfigPanel } from './components/panels/RubricConfigPanel';
import { InstrumentConfigPanel } from './components/panels/InstrumentConfigPanel';
import { AccountPanel } from './components/panels/AccountPanel';
import { JournalPanel } from './components/panels/JournalPanel';
import { InvalidateTradePanel } from './components/panels/InvalidateTradePanel';
import { ReplayTradePanel } from './components/panels/ReplayTradePanel';
import { DashboardTab, Trade } from './types';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardMutations } from './hooks/useDashboardMutations';

export default function CopilotPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('all');
  const [replayTrade, setReplayTrade] = useState<Trade | null>(null);
  const [isInstrumentOpen, setIsInstrumentOpen] = useState(false);

  const data = useDashboardData(activeTab);
  const {
    accounts,
    rubrics,
    instruments,
    visibleTrades,
    activeAccount,
    activeAccountId,
    setActiveAccountId,
    normalizedActiveAccountId,
    mutateTrades,
    mutateAccounts,
    mutateInstruments,
    mutateRubrics,
    userRole,
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
    rubrics,
    instruments,
    normalizedActiveAccountId,
    activeAccount,
    setActiveAccountId,
    mutateAccounts,
    mutateInstruments,
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
    invalidateTradeTarget,
    invalidateReasonText,
    setInvalidateReasonText,
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
    isAiImprovingRubric,
    isAiImprovingDraft,
    isSavingInstrument,
    availableAiProviders,
    openDraftPanel,
    openNewDraftPanel,
    closeDraftPanel,
    openInvalidateTradePanel,
    closeInvalidateTradePanel,
    openUpdateAccountPanel,
    openNewAccountPanel,
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
    handleInvalidateSubmit,
  } = mutations;

  const clearFilters = () => {
    setActiveTab('all');
    setCreatedFrom('');
    setCreatedTo('');
  };

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
          onOpenInstruments={() => setIsInstrumentOpen(true)}
          onOpenDraft={openNewDraftPanel}
        />

        <TradeGrid
          trades={visibleTrades}
          userRole={userRole}
          onOpenDraftPanel={openDraftPanel}
          onOpenReplay={setReplayTrade}
          onUpdateStatus={handleUpdateStatus}
          onOpenJournal={setJournalTradeId}
          onRegrade={handleRegrade}
          onOpenInvalidatePanel={openInvalidateTradePanel}
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
        instruments={instruments}
        draftForm={draftForm}
        isAiImproving={isAiImprovingDraft}
        availableAiProviders={availableAiProviders}
        onClose={closeDraftPanel}
        onDraftFormChange={setDraftForm}
        onAiImproveNotes={handleAiImproveDraftNotes}
        onSubmit={handleDraftSubmit}
      />

      <RubricConfigPanel
        isOpen={isRubricOpen}
        rubrics={rubrics}
        rubricForm={rubricForm}
        showDeleteRubricConfirm={showDeleteRubricConfirm}
        isAiImproving={isAiImprovingRubric}
        availableAiProviders={availableAiProviders}
        onClose={() => setIsRubricOpen(false)}
        onRubricFormChange={setRubricForm}
        onShowDeleteConfirmChange={setShowDeleteRubricConfirm}
        onAiImproveRules={handleAiImproveRubricRules}
        onSave={handleRubricSubmit}
        onDelete={handleDeleteRubric}
      />

      <InstrumentConfigPanel
        isOpen={isInstrumentOpen}
        instruments={instruments}
        isSaving={isSavingInstrument}
        onClose={() => setIsInstrumentOpen(false)}
        onSave={handleSaveInstrument}
        onDelete={handleDeleteInstrument}
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
        availableAiProviders={availableAiProviders}
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

      <ReplayTradePanel
        trade={replayTrade}
        instruments={instruments}
        onClose={() => setReplayTrade(null)}
      />

      <InvalidateTradePanel
        trade={invalidateTradeTarget}
        reasonText={invalidateReasonText}
        onReasonTextChange={setInvalidateReasonText}
        onClose={closeInvalidateTradePanel}
        onSubmit={handleInvalidateSubmit}
      />
    </div>
  );
}