'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { InstrumentDefinition } from '../../types';
import { normalizeInstrumentCode } from '@/lib/instruments';

interface InstrumentConfigPanelProps {
  isOpen: boolean;
  instruments: InstrumentDefinition[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (instrument: InstrumentDefinition, previousCode?: string) => Promise<void>;
  onDelete: (code: string) => Promise<void>;
}

interface InstrumentFormState {
  code: string;
}

const DEFAULT_INSTRUMENT_FORM: InstrumentFormState = {
  code: '',
};

export function InstrumentConfigPanel({
  isOpen,
  instruments,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: InstrumentConfigPanelProps) {
  const [isInstrumentDropdownOpen, setIsInstrumentDropdownOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [form, setForm] = useState<InstrumentFormState>(DEFAULT_INSTRUMENT_FORM);

  const instrumentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (instrumentDropdownRef.current && !instrumentDropdownRef.current.contains(event.target as Node)) {
        setIsInstrumentDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCode('');
      setForm(DEFAULT_INSTRUMENT_FORM);
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  const loadInstrumentIntoForm = (instrument: InstrumentDefinition) => {
    setSelectedCode(instrument.code);
    setForm({
      code: instrument.code,
    });
    setShowDeleteConfirm(false);
  };

  const startCreateNew = () => {
    setSelectedCode('');
    setForm(DEFAULT_INSTRUMENT_FORM);
    setShowDeleteConfirm(false);
  };

  const handleSave = async () => {
    const code = normalizeInstrumentCode(form.code);

    if (!code) {
      window.alert('Instrument code is required.');
      return;
    }

    await onSave(
      {
        code,
      },
      selectedCode || undefined,
    );

    setSelectedCode(code);
    setForm({ code });
    setShowDeleteConfirm(false);
  };

  const handleDelete = async () => {
    if (!selectedCode) {
      return;
    }

    await onDelete(selectedCode);
    startCreateNew();
  };

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
                <h2 className="font-mono text-sm uppercase tracking-widest font-bold">INSTRUMENT CONFIG</h2>
                <button onClick={onClose} className="hover:opacity-50 transition-opacity flex items-center justify-center w-5 h-5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 flex-grow overflow-y-auto space-y-8">
                <div ref={instrumentDropdownRef} className="relative">
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">SELECT OR CREATE</label>
                  <button
                    onClick={() => setIsInstrumentDropdownOpen(prev => !prev)}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                  >
                    <span>{selectedCode || 'CREATE NEW'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isInstrumentDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isInstrumentDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col max-h-[220px] overflow-y-auto"
                      >
                        <button
                          onClick={() => {
                            startCreateNew();
                            setIsInstrumentDropdownOpen(false);
                          }}
                          className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b border-black dark:border-white font-bold"
                        >
                          CREATE NEW
                        </button>
                        {instruments.map(instrument => (
                          <button
                            key={instrument.code}
                            onClick={() => {
                              loadInstrumentIntoForm(instrument);
                              setIsInstrumentDropdownOpen(false);
                            }}
                            className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-b last:border-b-0 border-black dark:border-white opacity-80 hover:opacity-100"
                          >
                            {instrument.code}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">TICKER / TRADINGVIEW SYMBOL</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={event => setForm(prev => ({ ...prev, code: normalizeInstrumentCode(event.target.value) }))}
                    className="w-full bg-transparent border-b border-black dark:border-white py-2 font-mono text-xl focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 uppercase"
                    placeholder="COMEX:MGC1!"
                  />
                </div>
              </div>

              {showDeleteConfirm ? (
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                  <p className="font-mono text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold leading-relaxed mb-4">
                    WARNING: This will permanently delete {selectedCode}.
                  </p>
                  <button
                    onClick={handleDelete}
                    className="w-full py-4 bg-transparent border border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400 font-mono text-xs uppercase tracking-widest font-bold hover:bg-rose-600 hover:text-white dark:hover:bg-rose-400 dark:hover:text-black transition-colors mb-4"
                  >
                    CONFIRM
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-4 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-mono text-xs uppercase tracking-widest font-bold"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <div className="p-6 border-t border-black dark:border-white bg-[#f8f8f8] dark:bg-[#111]">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`w-full py-4 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-mono text-xs uppercase tracking-widest font-bold ${selectedCode ? 'mb-4' : ''} disabled:opacity-40`}
                  >
                    {isSaving ? 'SAVING...' : 'SAVE INSTRUMENT'}
                  </button>
                  {selectedCode && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-4 bg-transparent border border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400 font-mono text-xs uppercase tracking-widest font-bold hover:bg-rose-600 hover:text-white dark:hover:bg-rose-400 dark:hover:text-black transition-colors"
                    >
                      DELETE INSTRUMENT
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
