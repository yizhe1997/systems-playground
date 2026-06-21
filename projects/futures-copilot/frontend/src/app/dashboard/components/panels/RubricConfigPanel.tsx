'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { Rubric, RubricFormState } from '../../types';
import { DEFAULT_RUBRIC_FORM } from '../../constants';

interface RubricConfigPanelProps {
  isOpen: boolean;
  rubrics: Rubric[];
  rubricForm: RubricFormState;
  showDeleteRubricConfirm: boolean;
  isAiImproving: boolean;
  availableAiProviders: string[];
  onClose: () => void;
  onRubricFormChange: (next: RubricFormState) => void;
  onShowDeleteConfirmChange: (next: boolean) => void;
  onAiImproveRules: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export function RubricConfigPanel({
  isOpen,
  rubrics,
  rubricForm,
  showDeleteRubricConfirm,
  isAiImproving,
  availableAiProviders,
  onClose,
  onRubricFormChange,
  onShowDeleteConfirmChange,
  onAiImproveRules,
  onSave,
  onDelete,
}: RubricConfigPanelProps) {
  const [isConfigRubricDropdownOpen, setIsConfigRubricDropdownOpen] = useState(false);
  const configRubricDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (configRubricDropdownRef.current && !configRubricDropdownRef.current.contains(event.target as Node)) {
        setIsConfigRubricDropdownOpen(false);
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
                <h2
                  className="font-mono text-sm uppercase tracking-widest font-bold"
                  data-cursor-text="Rubrics define how each trade setup is evaluated. Use them to score setup quality and confluence consistency."
                >
                  RUBRIC CONFIG
                </h2>
                <button onClick={onClose} className="fc-btn-subtle fc-icon-btn">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="fc-panel-body">
                <div ref={configRubricDropdownRef} className="relative">
                  <label className="fc-label">SELECT OR CREATE</label>
                  <button
                    onClick={() => setIsConfigRubricDropdownOpen(prev => !prev)}
                    className="fc-select-trigger"
                  >
                    <span>{rubricForm.id === '' ? 'CREATE NEW' : rubrics.find(rubric => rubric.id === rubricForm.id)?.name || 'SELECT RUBRIC'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isConfigRubricDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isConfigRubricDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fc-dropdown-menu max-h-[200px] overflow-y-auto"
                      >
                        <button
                          onClick={() => {
                            onRubricFormChange(DEFAULT_RUBRIC_FORM);
                            setIsConfigRubricDropdownOpen(false);
                          }}
                          className="fc-dropdown-item font-bold"
                        >
                          CREATE NEW
                        </button>
                        {rubrics.map(rubric => (
                          <button
                            key={rubric.id}
                            onClick={() => {
                              onRubricFormChange(rubric);
                              setIsConfigRubricDropdownOpen(false);
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

                <div>
                  <label className="fc-label">RUBRIC NAME</label>
                  <input
                    type="text"
                    value={rubricForm.name}
                    onChange={event => onRubricFormChange({ ...rubricForm, name: event.target.value })}
                    className="fc-input-line uppercase"
                  />
                </div>

                <div>
                  <label
                    className="block w-fit font-mono text-[10px] uppercase tracking-widest opacity-60 mb-4 text-black dark:text-white"
                    data-cursor-text="Define the rules the AI should use to grade your setups. Explain what makes a valid setup in your strategy."
                  >
                    TRADING RULES & CONFLUENCES
                  </label>
                  <textarea
                    placeholder="e.g. 1. Must test a 15m order block. 2. Minimum 1:2 RR. 3. Do not trade within 30m of CPI/NFP..."
                    rows={8}
                    value={rubricForm.rules}
                    onChange={event => onRubricFormChange({ ...rubricForm, rules: event.target.value })}
                    className="fc-textarea p-4"
                  />
                  {availableAiProviders.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={onAiImproveRules}
                        disabled={isAiImproving || !rubricForm.rules}
                        className="font-mono text-[10px] uppercase tracking-widest fc-btn-subtle disabled:opacity-30"
                      >
                        {isAiImproving ? 'THINKING...' : '[ AI: IMPROVE WRITING ]'}
                      </button>
                    </div>
                  )}
                </div>


              </div>

              {showDeleteRubricConfirm ? (
                <div className="fc-panel-footer">
                  <p className="font-mono text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
                    WARNING: This will permanently delete {rubricForm.name}.
                  </p>
                  {rubricForm.id && (
                    <button
                      onClick={onDelete}
                      className={`fc-btn-danger w-full py-4 ${rubricForm.id ? 'mb-4' : ''}`}
                    >
                      CONFIRM
                    </button>
                  )}
                  <button
                    onClick={() => onShowDeleteConfirmChange(false)}
                    className="fc-btn w-full py-4"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <div className="fc-panel-footer">
                  <button
                    onClick={onSave}
                    className={`fc-btn w-full py-4 ${rubricForm.id ? 'mb-4' : ''}`}
                  >
                    SAVE RUBRIC
                  </button>
                  {rubricForm.id && (
                    <button
                      onClick={() => onShowDeleteConfirmChange(true)}
                      className="fc-btn-danger w-full py-4"
                    >
                      DELETE RUBRIC
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
