'use client';

import { createContext, useCallback, useContext, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastInput {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (messageOrInput: string | ToastInput, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
});

export function useToastState(): ToastContextValue {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((messageOrInput: string | ToastInput, type: ToastType = 'info') => {
    let normalizedMessage = '';
    let normalizedType: ToastType = type;

    if (typeof messageOrInput === 'string') {
      normalizedMessage = messageOrInput;
    } else {
      const title = messageOrInput.title?.trim();
      const description = messageOrInput.description?.trim();
      normalizedMessage = [title, description].filter(Boolean).join(': ') || 'Notification';
      normalizedType = messageOrInput.variant === 'destructive' ? 'error' : 'info';
    }

    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message: normalizedMessage, type: normalizedType }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}

export function useToast() {
  return useContext(ToastContext);
}
