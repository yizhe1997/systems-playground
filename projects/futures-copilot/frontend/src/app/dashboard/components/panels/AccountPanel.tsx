'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { AccountFormState } from '../../types';

interface AccountPanelProps {
  isOpen: boolean;
  accountForm: AccountFormState;
  showDeleteConfirm: boolean;
  showUrlInput: boolean;
  aiUrlsInput: string[];
  isAiScraping: boolean;
  isAiImproving: boolean;
  availableAiProviders: string[];
  onClose: () => void;
  onAccountFormChange: (next: AccountFormState) => void;
  onShowDeleteConfirmChange: (next: boolean) => void;
  onShowUrlInputChange: (next: boolean) => void;
  onAiUrlsInputChange: (next: string[]) => void;
  onAiImproveRules: () => void;
  onAiScrapeUrls: () => void;
  onSubmit: () => void;
  onDelete: () => void;
}

export function AccountPanel({
  isOpen,
  accountForm,
  showDeleteConfirm,
  showUrlInput,
  aiUrlsInput,
  isAiScraping,
  isAiImproving,
  availableAiProviders,
  onClose,
  onAccountFormChange,
  onShowDeleteConfirmChange,
  onShowUrlInputChange,
  onAiUrlsInputChange,
  onAiImproveRules,
  onAiScrapeUrls,
  onSubmit,
  onDelete,
}: AccountPanelProps) {
  const hasAvailableAI = availableAiProviders.length > 0;
  const normalizedAccountType = accountForm.type.trim();
  const canSubmitAccount =
    normalizedAccountType.length > 0 &&
    Number(accountForm.currentBalance) > 0 &&
    Number(accountForm.currentDailyStopLevel) > 0 &&
    Number(accountForm.currentMaxLossLevel) > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm z-[99]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-[100]"
          >
            <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
              <div className="pl-[70px] pr-6 py-6 border-b border-black dark:border-white flex justify-between items-center bg-black text-white dark:bg-white dark:text-black">
                <h2 className="font-mono text-sm uppercase tracking-widest font-bold">
                  {accountForm.id ? 'ACCOUNT DETAIL' : 'NEW ACCOUNT'}
                </h2>
                <button onClick={onClose} className="hover:opacity-50 transition-opacity flex items-center justify-center w-5 h-5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 flex-grow overflow-y-auto space-y-8">
                <div>
                  <label
                    data-cursor-text="Name format: [Broker Name] [Account Type] [Account Size], e.g. Topstep Express Funded Account 50K."
                    className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2"
                  >
                    ACCOUNT TYPE
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TOPSTEP Express Funded Account 50K"
                    value={accountForm.type}
                    onChange={event => onAccountFormChange({ ...accountForm, type: event.target.value })}
                    required
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50"
                  />
                </div>
                <div>
                  <label
                    data-cursor-text="Enter the current account balance from your broker dashboard."
                    className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2"
                  >
                    CURRENT BALANCE
                  </label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={accountForm.currentBalance}
                    onChange={event => onAccountFormChange({ ...accountForm, currentBalance: parseFloat(event.target.value) || 0 })}
                    min={0.01}
                    step="any"
                    required
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50"
                  />
                </div>
                <div>
                  <label
                    data-cursor-text="Enter the broker-defined daily stop floor for this account type."
                    className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2"
                  >
                    DAILY STOP LEVEL (FLOOR)
                  </label>
                  <input
                    type="number"
                    placeholder="49000"
                    value={accountForm.currentDailyStopLevel}
                    onChange={event => onAccountFormChange({ ...accountForm, currentDailyStopLevel: parseFloat(event.target.value) || 0 })}
                    min={0.01}
                    step="any"
                    required
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50"
                  />
                </div>
                <div>
                  <label
                    data-cursor-text="Enter the broker-defined max loss floor for this account type."
                    className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2"
                  >
                    MAX LOSS LEVEL (FLOOR)
                  </label>
                  <input
                    type="number"
                    placeholder="48000"
                    value={accountForm.currentMaxLossLevel}
                    onChange={event => onAccountFormChange({ ...accountForm, currentMaxLossLevel: parseFloat(event.target.value) || 0 })}
                    min={0.01}
                    step="any"
                    required
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50"
                  />
                </div>
                <div>
                  <label
                    data-cursor-text="Add broker rules that apply specifically to the account type you selected."
                    className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2"
                  >
                    RULES CONTEXT
                  </label>
                  <textarea
                    placeholder="Trailing rules context..."
                    value={accountForm.rulesContext}
                    onChange={event => onAccountFormChange({ ...accountForm, rulesContext: event.target.value })}
                    className="w-full bg-transparent border border-black dark:border-white p-3 font-mono text-xs focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 min-h-[100px] resize-y"
                  />
                  <div className="mt-4 flex flex-col gap-2">
                    {hasAvailableAI && (
                      <div className="flex gap-4">
                        <button
                          onClick={() => onShowUrlInputChange(!showUrlInput)}
                          disabled={!normalizedAccountType}
                          className="font-mono text-[10px] uppercase tracking-widest hover:opacity-50 transition-opacity disabled:opacity-30"
                        >
                          [ AI: SCRAPE FROM URLS ]
                        </button>
                        <button
                          onClick={onAiImproveRules}
                          disabled={isAiImproving || !accountForm.rulesContext || !normalizedAccountType}
                          className="font-mono text-[10px] uppercase tracking-widest hover:opacity-50 transition-opacity disabled:opacity-30"
                        >
                          {isAiImproving ? 'THINKING...' : '[ AI: CLEANUP TEXT ]'}
                        </button>
                      </div>
                    )}
                    {hasAvailableAI && showUrlInput && (
                      <div className="flex flex-col gap-2 mt-2">
                        {aiUrlsInput.map((url, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder="Paste rule URL here..."
                              value={url}
                              onChange={event => {
                                const nextUrls = [...aiUrlsInput];
                                nextUrls[idx] = event.target.value;
                                onAiUrlsInputChange(nextUrls);
                              }}
                              className="flex-grow bg-transparent border-b border-black dark:border-white py-1 font-mono text-xs focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50"
                            />
                            {aiUrlsInput.length > 1 && (
                              <button
                                onClick={() => {
                                  const nextUrls = [...aiUrlsInput];
                                  nextUrls.splice(idx, 1);
                                  onAiUrlsInputChange(nextUrls);
                                }}
                                className="text-rose-500 hover:opacity-50"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {aiUrlsInput.length < 3 && (
                          <button
                            onClick={() => onAiUrlsInputChange([...aiUrlsInput, ''])}
                            className="self-start font-mono text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 mt-1"
                          >
                            + ADD ANOTHER URL
                          </button>
                        )}
                        <p className="font-mono text-[8px] text-rose-500 uppercase mt-2">Warning: This will overwrite existing context.</p>
                        <button
                          onClick={onAiScrapeUrls}
                          disabled={isAiScraping || !normalizedAccountType}
                          className="w-full py-3 bg-black text-white dark:bg-white dark:text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:opacity-80 transition-opacity mt-2 disabled:opacity-30"
                        >
                          {isAiScraping ? 'SCRAPING...' : 'EXTRACT RULES'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {showDeleteConfirm ? (
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111] flex flex-col gap-4">
                  <p className="font-mono text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
                    WARNING: This will permanently delete {accountForm.type} along with all trades and outcomes tied to it.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={onDelete}
                      className="flex-1 py-4 bg-rose-600 text-white font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity"
                    >
                      CONFIRM
                    </button>
                    <button
                      onClick={() => onShowDeleteConfirmChange(false)}
                      className="flex-1 py-4 border border-black dark:border-white text-black dark:text-white font-mono text-xs uppercase tracking-widest font-bold hover:opacity-50 transition-opacity"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                  <button
                    onClick={onSubmit}
                    disabled={!canSubmitAccount}
                    className={`w-full py-4 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-mono text-xs uppercase tracking-widest font-bold disabled:opacity-30 ${accountForm.id ? 'mb-4' : ''}`}
                  >
                    {accountForm.id ? 'UPDATE ACCOUNT' : 'CREATE ACCOUNT'}
                  </button>

                  {accountForm.id && (
                    <button
                      onClick={() => onShowDeleteConfirmChange(true)}
                      className="w-full py-4 bg-transparent border border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400 font-mono text-xs uppercase tracking-widest font-bold hover:bg-rose-600 hover:text-white dark:hover:bg-rose-400 dark:hover:text-black transition-colors"
                    >
                      DELETE ACCOUNT
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
