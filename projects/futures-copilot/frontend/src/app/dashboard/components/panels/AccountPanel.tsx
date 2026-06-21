'use client';

import { useEffect, useState } from 'react';
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
  const sanitizeDecimalInput = (value: string) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  const formatMoneyInput = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '');

  const [currentBalanceInput, setCurrentBalanceInput] = useState(formatMoneyInput(accountForm.currentBalance));
  const [dailyStopInput, setDailyStopInput] = useState(formatMoneyInput(accountForm.currentDailyStopLevel));
  const [maxLossInput, setMaxLossInput] = useState(formatMoneyInput(accountForm.currentMaxLossLevel));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCurrentBalanceInput(formatMoneyInput(accountForm.currentBalance));
    setDailyStopInput(formatMoneyInput(accountForm.currentDailyStopLevel));
    setMaxLossInput(formatMoneyInput(accountForm.currentMaxLossLevel));
  }, [isOpen, accountForm.id]);

  const handleMoneyInputChange = (
    value: string,
    setter: (value: string) => void,
    key: 'currentBalance' | 'currentDailyStopLevel' | 'currentMaxLossLevel'
  ) => {
    const sanitizedValue = sanitizeDecimalInput(value);
    setter(sanitizedValue);
    onAccountFormChange({
      ...accountForm,
      [key]: sanitizedValue === '' ? 0 : parseFloat(sanitizedValue) || 0,
    });
  };

  const handleMoneyInputBlur = (
    value: string,
    setter: (value: string) => void,
    key: 'currentBalance' | 'currentDailyStopLevel' | 'currentMaxLossLevel'
  ) => {
    if (!value) {
      setter('');
      return;
    }

    const parsedValue = parseFloat(value);
    if (!Number.isFinite(parsedValue)) {
      setter('');
      onAccountFormChange({
        ...accountForm,
        [key]: 0,
      });
      return;
    }

    const formattedValue = parsedValue.toFixed(2);
    setter(formattedValue);
    onAccountFormChange({
      ...accountForm,
      [key]: parsedValue,
    });
  };

  const hasAvailableAI = availableAiProviders.length > 0;
  const isBusy = isAiScraping || isAiImproving;
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
            className="fc-panel-overlay z-[99]"
            onClick={isBusy ? undefined : onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fc-panel-shell max-w-md [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] z-[100]"
          >
            <div className="fc-panel-inner [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]">
              <div className="fc-panel-header">
                <h2 className="font-mono text-sm uppercase tracking-widest font-bold">
                  {accountForm.id ? 'ACCOUNT DETAIL' : 'NEW ACCOUNT'}
                </h2>
                <button disabled={isBusy} onClick={onClose} className="fc-btn-subtle fc-icon-btn disabled:opacity-30">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="fc-panel-body">
                <div>
                  <label
                    data-cursor-text="Name format: [Broker Name] [Account Type] [Account Size], e.g. Topstep Express Funded Account 50K."
                    className="fc-label"
                  >
                    ACCOUNT TYPE
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TOPSTEP Express Funded Account 50K"
                    value={accountForm.type}
                    onChange={event => onAccountFormChange({ ...accountForm, type: event.target.value })}
                    required
                    className="fc-input-line"
                  />
                </div>
                <div>
                  <label
                    data-cursor-text="Enter the current account balance from your broker dashboard."
                    className="fc-label"
                  >
                    CURRENT BALANCE
                  </label>
                  <input
                    type="text"
                    placeholder="50000.00"
                    value={currentBalanceInput}
                    onChange={event => handleMoneyInputChange(event.target.value, setCurrentBalanceInput, 'currentBalance')}
                    onBlur={() => handleMoneyInputBlur(currentBalanceInput, setCurrentBalanceInput, 'currentBalance')}
                    inputMode="decimal"
                    required
                    className="fc-input-line"
                  />
                </div>
                <div>
                  <label
                    data-cursor-text="Enter the broker-defined daily stop floor for this account type."
                    className="fc-label"
                  >
                    DAILY STOP LEVEL (FLOOR)
                  </label>
                  <input
                    type="text"
                    placeholder="49000.00"
                    value={dailyStopInput}
                    onChange={event => handleMoneyInputChange(event.target.value, setDailyStopInput, 'currentDailyStopLevel')}
                    onBlur={() => handleMoneyInputBlur(dailyStopInput, setDailyStopInput, 'currentDailyStopLevel')}
                    inputMode="decimal"
                    required
                    className="fc-input-line"
                  />
                </div>
                <div>
                  <label
                    data-cursor-text="Enter the broker-defined max loss floor for this account type."
                    className="fc-label"
                  >
                    MAX LOSS LEVEL (FLOOR)
                  </label>
                  <input
                    type="text"
                    placeholder="48000.00"
                    value={maxLossInput}
                    onChange={event => handleMoneyInputChange(event.target.value, setMaxLossInput, 'currentMaxLossLevel')}
                    onBlur={() => handleMoneyInputBlur(maxLossInput, setMaxLossInput, 'currentMaxLossLevel')}
                    inputMode="decimal"
                    required
                    className="fc-input-line"
                  />
                </div>
                <div>
                  <label
                    data-cursor-text="Add broker rules that apply specifically to the account type you selected."
                    className="fc-label"
                  >
                    RULES CONTEXT
                  </label>
                  <textarea
                    placeholder="Trailing rules context..."
                    value={accountForm.rulesContext}
                    onChange={event => onAccountFormChange({ ...accountForm, rulesContext: event.target.value })}
                    className="fc-textarea normal-case min-h-[100px]"
                  />
                  <div className="mt-4 flex flex-col gap-2">
                    {hasAvailableAI && (
                      <div className="flex gap-4">
                        <button
                          onClick={() => onShowUrlInputChange(!showUrlInput)}
                          disabled={isBusy || !normalizedAccountType}
                          className="font-mono text-[10px] uppercase tracking-widest fc-btn-subtle disabled:opacity-30"
                        >
                          [ AI: SCRAPE FROM URLS ]
                        </button>
                        <button
                          onClick={onAiImproveRules}
                          disabled={isBusy || !accountForm.rulesContext || !normalizedAccountType}
                          className="font-mono text-[10px] uppercase tracking-widest fc-btn-subtle disabled:opacity-30"
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
                                disabled={isBusy}
                                className="text-rose-500 fc-btn-subtle disabled:opacity-30"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {aiUrlsInput.length < 3 && (
                          <button
                            onClick={() => onAiUrlsInputChange([...aiUrlsInput, ''])}
                            disabled={isBusy}
                            className="self-start font-mono text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 mt-1"
                          >
                            + ADD ANOTHER URL
                          </button>
                        )}
                        <p className="font-mono text-[8px] text-rose-500 uppercase mt-2">Warning: This will overwrite existing context.</p>
                        <button
                          onClick={onAiScrapeUrls}
                          disabled={isBusy || !normalizedAccountType}
                          className="fc-btn-primary w-full py-3 text-[10px] mt-2 disabled:opacity-30"
                        >
                          {isAiScraping ? 'SCRAPING...' : 'EXTRACT RULES'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {showDeleteConfirm ? (
                <div className="fc-panel-footer">
                  <p className="font-mono text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
                    WARNING: This will permanently delete {accountForm.type} along with all trades and outcomes tied to it.
                  </p>
                  <button
                    onClick={onDelete}
                    disabled={isBusy}
                    className={`fc-btn w-full py-4 disabled:opacity-30 ${accountForm.id ? 'mb-4' : ''}`}
                  >
                    CONFIRM
                  </button>

                  {accountForm.id && (
                    <button
                      onClick={() => onShowDeleteConfirmChange(true)}
                      disabled={isBusy}
                      className="fc-btn-danger w-full py-4 disabled:opacity-30"
                    >
                      CANCEL
                    </button>
                  )}
                </div>
              ) : (
                <div className="fc-panel-footer">
                  <button
                    onClick={onSubmit}
                    disabled={isBusy || !canSubmitAccount}
                    className={`fc-btn w-full py-4 disabled:opacity-30 ${accountForm.id ? 'mb-4' : ''}`}
                  >
                    {accountForm.id ? 'UPDATE ACCOUNT' : 'CREATE ACCOUNT'}
                  </button>

                  {accountForm.id && (
                    <button
                      onClick={() => onShowDeleteConfirmChange(true)}
                      disabled={isBusy}
                      className="fc-btn-danger w-full py-4 disabled:opacity-30"
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
