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
  pointValue: string;
}

const DEFAULT_INSTRUMENT_FORM: InstrumentFormState = {
  code: '',
  pointValue: '10',
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
      pointValue: String(instrument.pointValue || 10),
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
    const pointValue = parseFloat(form.pointValue) || 10;

    if (!code) {
      window.alert('Instrument code is required.');
      return;
    }

    if (pointValue <= 0) {
      window.alert('Point value must be greater than 0.');
      return;
    }

    await onSave(
      {
        code,
        pointValue,
      },
      selectedCode || undefined,
    );

    setSelectedCode(code);
    setForm({ code, pointValue: String(pointValue) });
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
                <h2 className="font-mono text-sm uppercase tracking-widest font-bold">INSTRUMENT CONFIG</h2>
                <button onClick={onClose} className="fc-btn-subtle fc-icon-btn">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="fc-panel-body">
                <div ref={instrumentDropdownRef} className="relative">
                  <label className="fc-label">SELECT OR CREATE</label>
                  <button
                    onClick={() => setIsInstrumentDropdownOpen(prev => !prev)}
                    className="fc-select-trigger"
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
                        className="fc-dropdown-menu max-h-[220px] overflow-y-auto"
                      >
                        <button
                          onClick={() => {
                            startCreateNew();
                            setIsInstrumentDropdownOpen(false);
                          }}
                          className="fc-dropdown-item font-bold"
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
                            className="fc-dropdown-item"
                          >
                            {instrument.code}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="fc-label">TICKER / TRADINGVIEW SYMBOL</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={event => setForm(prev => ({ ...prev, code: normalizeInstrumentCode(event.target.value) }))}
                    className="fc-input-line uppercase"
                    placeholder="COMEX:MGC1!"
                  />
                </div>

                <div>
                  <label className="fc-label" data-cursor-text="Per-tick point value. Used to calculate risk: distance × pointValue × contracts">POINT VALUE (GAIN PER TICK)</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={form.pointValue}
                    onChange={e => setForm({ ...form, pointValue: e.target.value })}
                    step="0.1"
                    min="0"
                    className="fc-input-line"
                  />
                  <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 mt-2">Examples: GC=100, NQ=20, ES=50, DAX=25</div>
                </div>
              </div>

              {showDeleteConfirm ? (
                <div className="fc-panel-footer">
                  <p className="font-mono text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold leading-relaxed mb-4">
                    WARNING: This will permanently delete {selectedCode}.
                  </p>
                  <button
                    onClick={handleDelete}
                    className="fc-btn-danger w-full py-4 mb-4"
                  >
                    CONFIRM
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="fc-btn w-full py-4"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <div className="fc-panel-footer">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`fc-btn w-full py-4 ${selectedCode ? 'mb-4' : ''} disabled:opacity-40`}
                  >
                    {isSaving ? 'SAVING...' : 'SAVE INSTRUMENT'}
                  </button>
                  {selectedCode && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="fc-btn-danger w-full py-4"
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
