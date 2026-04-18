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
  onClose: () => void;
  onRubricFormChange: (next: RubricFormState) => void;
  onShowDeleteConfirmChange: (next: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function RubricConfigPanel({
  isOpen,
  rubrics,
  rubricForm,
  showDeleteRubricConfirm,
  onClose,
  onRubricFormChange,
  onShowDeleteConfirmChange,
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
                <h2 className="font-mono text-sm uppercase tracking-widest font-bold flex items-center gap-4">
                  RUBRIC CONFIG
                  <button
                    onClick={() => onRubricFormChange(DEFAULT_RUBRIC_FORM)}
                    className="px-2 py-0.5 bg-white text-black dark:bg-black dark:text-white text-[10px] hover:opacity-80 transition-opacity"
                  >
                    + NEW
                  </button>
                </h2>
                <button onClick={onClose} className="hover:opacity-50 transition-opacity flex items-center justify-center w-5 h-5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 flex-grow overflow-y-auto space-y-8">
                <div ref={configRubricDropdownRef} className="relative">
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">SELECT OR CREATE</label>
                  <button
                    onClick={() => setIsConfigRubricDropdownOpen(prev => !prev)}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
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
                        className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col max-h-[200px] overflow-y-auto"
                      >
                        <button
                          onClick={() => {
                            onRubricFormChange(DEFAULT_RUBRIC_FORM);
                            setIsConfigRubricDropdownOpen(false);
                          }}
                          className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b border-black dark:border-white font-bold"
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
                            className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b last:border-b-0 border-black dark:border-white opacity-80 hover:opacity-100"
                          >
                            {rubric.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">RUBRIC NAME</label>
                  <input
                    type="text"
                    value={rubricForm.name}
                    onChange={event => onRubricFormChange({ ...rubricForm, name: event.target.value })}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 uppercase"
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
                    className="w-full bg-transparent border border-black dark:border-white p-4 font-mono text-xs uppercase leading-relaxed focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 resize-y"
                  />
                </div>

                <div>
                  <label
                    className="block w-fit font-mono text-[10px] uppercase tracking-widest opacity-60 mb-4 text-black dark:text-white"
                    data-cursor-text="Paste custom Pine Script logic or indicators (e.g., Institutional Supply/Demand) to give the AI context on how your technical levels are generated."
                  >
                    PINE SCRIPT LOGIC (OPTIONAL)
                  </label>
                  <textarea
                    placeholder="// Paste indicator logic here..."
                    rows={8}
                    value={rubricForm.pinescript}
                    onChange={event => onRubricFormChange({ ...rubricForm, pinescript: event.target.value })}
                    className="w-full bg-transparent border border-black dark:border-white p-4 font-mono text-[10px] leading-relaxed focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 resize-y"
                  />
                </div>
              </div>

              {showDeleteRubricConfirm ? (
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111] flex flex-col gap-4">
                  <p className="font-mono text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
                    WARNING: This will permanently delete {rubricForm.name}.
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
                      className="flex-1 py-4 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111] flex gap-4">
                  <button
                    onClick={onSave}
                    className="w-full py-4 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-mono text-xs uppercase tracking-widest font-bold"
                  >
                    SAVE RUBRIC
                  </button>
                  {rubricForm.id && rubrics.length > 1 && (
                    <button
                      onClick={() => onShowDeleteConfirmChange(true)}
                      className="flex-none px-6 border border-rose-600 text-rose-600 dark:text-rose-400 font-mono text-xs uppercase tracking-widest font-bold hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-colors"
                    >
                      DELETE
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
