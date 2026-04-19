'use client';

import React, { useEffect, useRef, useId } from 'react';
import { useTheme } from '@/lib/theme-context';

declare global {
  interface Window {
    TradingView: unknown;
  }
}

// Global interface for TradingView widget

export default function TradingViewWidget({ symbol = "COMEX:GC1!" }: { symbol?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    const isDark = theme === 'dark';

    const initWidget = () => {
      if (!container.current) return;

      container.current.innerHTML = ''; // Clear previous widget
      
      const createWidget = () => {
        // @ts-expect-error - TradingView is appended to window via script
        if (typeof window.TradingView !== 'undefined') {
          // @ts-expect-error - TradingView is appended to window via script
          new window.TradingView.widget({
            autosize: true,
            symbol: symbol,
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
        }
      };

      // @ts-expect-error - TradingView is appended to window via script
      if (typeof window.TradingView === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = createWidget;
        container.current.appendChild(script);
      } else {
        createWidget();
      }
    };

    initWidget();
  }, [theme, symbol, id]);

  return (
    <div className="tradingview-widget-container w-full h-full min-h-[500px]">
      <div id={`tradingview_${id}`} ref={container} className="w-full h-full" />
    </div>
  );
}