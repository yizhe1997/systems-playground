'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TYPE_STYLES: Record<string, string> = {
  success: 'border-emerald-500 text-emerald-700 dark:text-emerald-400',
  error:   'border-rose-500 text-rose-700 dark:text-rose-400',
  info:    'border-black dark:border-white text-black dark:text-white',
};

const TYPE_LABELS: Record<string, string> = {
  success: 'OK',
  error:   'ERR',
  info:    'INFO',
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto flex items-start gap-3 bg-white dark:bg-black border ${TYPE_STYLES[t.type]} px-4 py-3 max-w-xs w-full`}
          >
            <span className={`font-mono text-[9px] uppercase tracking-widest mt-[2px] shrink-0 opacity-60`}>
              [{TYPE_LABELS[t.type]}]
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wide leading-snug flex-grow">
              {t.message}
            </span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-40 hover:opacity-100 transition-opacity mt-[1px]"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
