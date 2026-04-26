'use client';

import { useEffect, useId, useRef } from 'react';
import { useTheme } from '@/lib/theme-context';

type TradingViewWidgetCtor = new (config: Record<string, unknown>) => unknown;

declare global {
  interface Window {
    TradingView?: {
      widget: TradingViewWidgetCtor;
    };
  }
}

let tradingViewScriptPromise: Promise<void> | null = null;

const ensureTradingViewScript = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.TradingView?.widget) {
    return Promise.resolve();
  }

  if (tradingViewScriptPromise) {
    return tradingViewScriptPromise;
  }

  tradingViewScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector('script[data-tv-script="true"]') as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load TradingView script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.dataset.tvScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TradingView script'));
    document.head.appendChild(script);
  });

  return tradingViewScriptPromise;
};

interface TradingViewWidgetProps {
  symbol?: string;
  onScriptError?: () => void;
  onWidgetReady?: () => void;
}

export default function TradingViewWidget({ symbol = 'COMEX:GC1!', onScriptError, onWidgetReady }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    let cancelled = false;
    const isDark = theme === 'dark';

    const initWidget = async () => {
      if (!container.current) {
        return;
      }

      container.current.innerHTML = '';

      try {
        await ensureTradingViewScript();
      } catch {
        if (!cancelled) {
          onScriptError?.();
        }
        return;
      }

      if (cancelled || !window.TradingView?.widget) {
        return;
      }

      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval: '15',
        timezone: 'Etc/UTC',
        theme: isDark ? 'dark' : 'light',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        backgroundColor: isDark ? '#000000' : '#ffffff',
        gridColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
        hide_top_toolbar: true,
        hide_legend: false,
        save_image: false,
        container_id: `tradingview_${id}`,
        toolbar_bg: isDark ? '#000000' : '#ffffff',
      });

      onWidgetReady?.();
    };

    initWidget();

    return () => {
      cancelled = true;
    };
  }, [theme, symbol, id, onScriptError, onWidgetReady]);

  return (
    <div className="tradingview-widget-container w-full h-full min-h-[500px] relative overflow-hidden">
      <div id={`tradingview_${id}`} ref={container} className="w-full h-full min-h-[500px]" />
      <style jsx global>{`
        .tradingview-widget-container,
        .tradingview-widget-container > div,
        .tradingview-widget-container iframe {
          width: 100% !important;
          height: 100% !important;
          min-height: 500px;
        }
      `}</style>
    </div>
  );
}
