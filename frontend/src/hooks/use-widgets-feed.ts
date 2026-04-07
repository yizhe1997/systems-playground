'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type WidgetFeedItem = {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
};

export function useWidgetsFeed() {
  const [widgets, setWidgets] = useState<WidgetFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/widgets`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to fetch widgets: ${res.status}`);
      }
      const data = (await res.json()) as WidgetFeedItem[];
      setWidgets(data);
      setWaking((prev) => {
        if (!prev) return prev;
        const wokenWidget = data.find((w) => w.id === prev);
        return wokenWidget?.status === 'running' ? null : prev;
      });
      return data;
    } catch (err) {
      console.error('Error fetching widgets:', err);
      if (!hasLoadedOnce.current) {
        setWidgets([]);
      }
      return [] as WidgetFeedItem[];
    } finally {
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
        setLoading(false);
      }
    }
  }, [apiUrl]);

  const wakeWidget = useCallback(async (id: string) => {
    setWaking(id);
    try {
      const res = await fetch(`${apiUrl}/api/demo/widgets/${id}/wake`, {
        method: 'POST',
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Failed to wake widget: ${res.status}`);
      }
      await fetchWidgets();
    } catch (err) {
      console.error('Failed to wake widget:', err);
      setWaking(null);
    }
  }, [apiUrl, fetchWidgets]);

  useEffect(() => {
    fetchWidgets();

    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/demo';
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'WIDGETS_UPDATED') {
            fetchWidgets();
          }
        } catch {
          // ignore non-JSON messages
        }
      };
      ws.onclose = () => {
        reconnectTimer = setTimeout(connectWs, 3000);
      };
    };

    connectWs();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [apiUrl, fetchWidgets]);

  return {
    widgets,
    loading,
    waking,
    wakeWidget,
    refreshWidgets: fetchWidgets,
  };
}
