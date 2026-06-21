'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { Account, DraftFormState, InstrumentDefinition, Rubric } from '../../types';

interface DraftTradePanelProps {
  isOpen: boolean;
  editTradeId: string | null;
  activeAccountId: string;
  accounts: Account[];
  rubrics: Rubric[];
  instruments: InstrumentDefinition[];
  draftForm: DraftFormState;
  isAiImproving: boolean;
  availableAiProviders: string[];
  onClose: () => void;
  onDraftFormChange: (next: DraftFormState) => void;
  onAiImproveNotes: () => void;
  onSubmit: () => void;
}

export function DraftTradePanel({
  isOpen,
  editTradeId,
  activeAccountId,
  accounts,
  rubrics,
  instruments,
  draftForm,
  isAiImproving,
  availableAiProviders,
  onClose,
  onDraftFormChange,
  onAiImproveNotes,
  onSubmit,
}: DraftTradePanelProps) {
  const sanitizeDecimalInput = (value: string) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  const preventInvalidIntegerKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-', '.'].includes(event.key)) {
      event.preventDefault();
    }
  };

  const handlePriceBlur = (key: 'entry' | 'stopLoss' | 'takeProfit') => {
    const rawValue = draftForm[key];
    if (!rawValue) {
      return;
    }

    const parsedValue = parseFloat(rawValue);
    if (!Number.isFinite(parsedValue)) {
      onDraftFormChange({ ...draftForm, [key]: '' });
      return;
    }

    onDraftFormChange({ ...draftForm, [key]: parsedValue.toFixed(2) });
  };

  const getValidationError = (): string | null => {
    const entry = Number.parseFloat(draftForm.entry);
    const stopLoss = Number.parseFloat(draftForm.stopLoss);
    const takeProfit = Number.parseFloat(draftForm.takeProfit);

    if (!(draftForm.accountId || activeAccountId)) {
      return 'Account is required';
    }
    if (!draftForm.instrument) {
      return 'Instrument is required';
    }
    if (!draftForm.bias) {
      return 'Bias (Long/Short) is required';
    }
    if (!draftForm.entry || !Number.isFinite(entry) || entry <= 0) {
      return 'Entry price is required and must be > 0';
    }
    if (!draftForm.stopLoss || !Number.isFinite(stopLoss) || stopLoss <= 0) {
      return 'Stop Loss is required and must be > 0';
    }
    if (!draftForm.takeProfit || !Number.isFinite(takeProfit) || takeProfit <= 0) {
      return 'Take Profit is required and must be > 0';
    }
    if (!draftForm.contracts || draftForm.contracts <= 0) {
      return 'Contracts must be > 0';
    }
    return null;
  };

  const validationError = getValidationError();

  const [isDraftAccountDropdownOpen, setIsDraftAccountDropdownOpen] = useState(false);
  const [isDraftRubricDropdownOpen, setIsDraftRubricDropdownOpen] = useState(false);
  const [isDraftInstrumentDropdownOpen, setIsDraftInstrumentDropdownOpen] = useState(false);

  const draftAccountDropdownRef = useRef<HTMLDivElement>(null);
  const draftRubricDropdownRef = useRef<HTMLDivElement>(null);
  const draftInstrumentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (draftAccountDropdownRef.current && !draftAccountDropdownRef.current.contains(event.target as Node)) {
        setIsDraftAccountDropdownOpen(false);
      }
      if (draftRubricDropdownRef.current && !draftRubricDropdownRef.current.contains(event.target as Node)) {
        setIsDraftRubricDropdownOpen(false);
      }
      if (draftInstrumentDropdownRef.current && !draftInstrumentDropdownRef.current.contains(event.target as Node)) {
        setIsDraftInstrumentDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fc-panel-overlay z-[99]"
            onClick={onClose}
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
                  {editTradeId ? 'EDIT SETUP' : 'DRAFT NEW SETUP'}
                </h2>
                <button onClick={onClose} className="fc-btn-subtle fc-icon-btn">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="fc-panel-body">
                <div ref={draftAccountDropdownRef} className="relative">
                  <label className="fc-label">SELECT ACCOUNT</label>
                  <button
                    onClick={() => setIsDraftAccountDropdownOpen(prev => !prev)}
                    className="fc-select-trigger"
                  >
                    <span>{accounts.find(account => account.id === (draftForm.accountId || activeAccountId))?.type || 'SELECT ACCOUNT'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDraftAccountDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isDraftAccountDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fc-dropdown-menu max-h-[200px] overflow-y-auto"
                      >
                        {accounts.map(account => (
                          <button
                            key={account.id}
                            onClick={() => {
                              onDraftFormChange({ ...draftForm, accountId: account.id });
                              setIsDraftAccountDropdownOpen(false);
                            }}
                            className="fc-dropdown-item"
                          >
                            {account.type}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div ref={draftRubricDropdownRef} className="relative">
                  <label className="fc-label">GRADING RUBRIC</label>
                  <button
                    onClick={() => setIsDraftRubricDropdownOpen(prev => !prev)}
                    className="fc-select-trigger"
                  >
                    <span>{rubrics.find(rubric => rubric.id === draftForm.rubricId)?.name || 'SELECT RUBRIC'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDraftRubricDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isDraftRubricDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fc-dropdown-menu max-h-[200px] overflow-y-auto"
                      >
                        {rubrics.map(rubric => (
                          <button
                            key={rubric.id}
                            onClick={() => {
                              onDraftFormChange({ ...draftForm, rubricId: rubric.id });
                              setIsDraftRubricDropdownOpen(false);
                            }}
                            className="fc-dropdown-item"
                          >
                            {rubric.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div ref={draftInstrumentDropdownRef} className="relative">
                  <label className="fc-label">INSTRUMENT</label>
                  <button
                    onClick={() => setIsDraftInstrumentDropdownOpen(prev => !prev)}
                    className="fc-select-trigger"
                  >
                    <span>{instruments.find(instrument => instrument.code === draftForm.instrument)?.code || 'SELECT INSTRUMENT'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDraftInstrumentDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isDraftInstrumentDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fc-dropdown-menu max-h-[220px] overflow-y-auto"
                      >
                        {instruments.length === 0 ? (
                          <div className="px-4 py-3 font-mono text-xs uppercase tracking-widest opacity-60">
                            NO INSTRUMENTS. USE INSTRUMENT CONFIG PANEL.
                          </div>
                        ) : (
                          instruments.map(instrument => (
                            <button
                              key={instrument.code}
                              onClick={() => {
                                onDraftFormChange({ ...draftForm, instrument: instrument.code });
                                setIsDraftInstrumentDropdownOpen(false);
                              }}
                              className="fc-dropdown-item"
                            >
                              {instrument.code}
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">BIAS</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => onDraftFormChange({ ...draftForm, bias: 'Long' })}
                      className={`py-3 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold transition-colors ${draftForm.bias === 'Long' ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600'}`}
                    >
                      LONG
                    </button>
                    <button
                      onClick={() => onDraftFormChange({ ...draftForm, bias: 'Short' })}
                      className={`py-3 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold transition-colors ${draftForm.bias === 'Short' ? 'bg-rose-600 text-white border-rose-600' : 'hover:bg-rose-600 hover:text-white hover:border-rose-600'}`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="fc-label">ENTRY ZONE</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={draftForm.entry}
                      onChange={event => onDraftFormChange({ ...draftForm, entry: sanitizeDecimalInput(event.target.value) })}
                      onBlur={() => handlePriceBlur('entry')}
                      className="fc-input-line"
                    />
                  </div>
                  <div>
                    <label className="fc-label text-rose-600 dark:text-rose-400">STOP LOSS</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={draftForm.stopLoss}
                      onChange={event => onDraftFormChange({ ...draftForm, stopLoss: sanitizeDecimalInput(event.target.value) })}
                      onBlur={() => handlePriceBlur('stopLoss')}
                      className="fc-input-line"
                    />
                  </div>
                  <div>
                    <label className="fc-label text-emerald-600 dark:text-emerald-400">TAKE PROFIT</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={draftForm.takeProfit}
                      onChange={event => onDraftFormChange({ ...draftForm, takeProfit: sanitizeDecimalInput(event.target.value) })}
                      onBlur={() => handlePriceBlur('takeProfit')}
                      className="fc-input-line"
                    />
                  </div>
                </div>

                <div>
                  <label className="fc-label">CONTRACTS</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={draftForm.contracts}
                    onChange={event => onDraftFormChange({ ...draftForm, contracts: parseInt(event.target.value, 10) || 1 })}
                    onKeyDown={preventInvalidIntegerKeys}
                    inputMode="numeric"
                    min={1}
                    step={1}
                    className="fc-input-line"
                  />
                </div>

                <div>
                  <label
                    className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2"
                    data-cursor-text="Capture any context around this setup: trade-specific or general conditions (e.g. clean R:R, no-news session, market tone, confidence, execution constraints)."
                  >
                    CONTEXT / NOTES
                  </label>
                  <textarea
                    placeholder="S&D Zone details, news events, time of day..."
                    rows={4}
                    value={draftForm.notes}
                    onChange={event => onDraftFormChange({ ...draftForm, notes: event.target.value })}
                    className="fc-textarea"
                  />
                  {availableAiProviders.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={onAiImproveNotes}
                        disabled={isAiImproving || !draftForm.notes}
                        className="font-mono text-[10px] uppercase tracking-widest fc-btn-subtle disabled:opacity-30"
                      >
                        {isAiImproving ? 'THINKING...' : '[ AI: IMPROVE WRITING ]'}
                      </button>
                    </div>
                  )}

                  {editTradeId && (
                    <div className="mt-6">
                      <label
                        className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2"
                        data-cursor-text="Setup grade findings will appear here after the async grading job completes."
                      >
                        AI SETUP GRADE FINDINGS
                      </label>
                      <textarea
                        rows={5}
                        readOnly
                        value={draftForm.aiSetupFindings || ''}
                        placeholder="Grading in progress or not yet requested..."
                        className="fc-textarea"
                      />
                    </div>
                  )}

                  <label className="mt-4 flex items-start gap-3 font-mono text-[10px] uppercase tracking-widest opacity-80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftForm.runAiSetupGrade}
                      onChange={event => onDraftFormChange({ ...draftForm, runAiSetupGrade: event.target.checked })}
                      className="mt-[1px] h-3 w-3 accent-black dark:accent-white"
                    />
                    <span>
                      RUN AI SETUP GRADE AFTER CREATE (ASYNC)
                    </span>
                  </label>
                </div>
              </div>

              <div className="fc-panel-footer space-y-3">
                {validationError && (
                  <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-700 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-rose-700 dark:text-rose-300">
                    {validationError}
                  </div>
                )}
                <button
                  onClick={onSubmit}
                  disabled={!!validationError}
                  className="fc-btn w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  CREATE DRAFT
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
