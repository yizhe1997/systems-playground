'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Power } from 'lucide-react';

type ConsumerState = {
  crashed: boolean;
  state: Record<string, string>;
};

type KafkaState = {
  inventory: ConsumerState;
  email: ConsumerState;
  analytics: ConsumerState;
};

export default function RedpandaDemo({ widgetId }: { widgetId: string }) {
  const [kafkaState, setKafkaState] = useState<KafkaState>({
    inventory: { crashed: false, state: {} },
    email: { crashed: false, state: {} },
    analytics: { crashed: false, state: {} }
  });
  const [isConnected, setIsConnected] = useState(false);
  const [orderLogs, setOrderLogs] = useState<{id: string, time: number}[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>('');

  const ensureSessionId = () => {
    if (sessionIdRef.current) return sessionIdRef.current;

    const storageKey = `kafka-demo-session:${widgetId}`;
    const existing = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
    if (existing) {
      sessionIdRef.current = existing;
      return existing;
    }

    const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, generated);
    }
    sessionIdRef.current = generated;
    return generated;
  };

  const fetchState = async () => {
    try {
      const sessionId = ensureSessionId();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const res = await fetch(`${apiUrl}/api/demo/kafka/state`, {
        headers: { 'X-Demo-Session': sessionId }
      });
      const data = await res.json();
      if (data) setKafkaState(data);
    } catch (err) {
      console.error('Failed to fetch Kafka state:', err);
    }
  };

  useEffect(() => {
    let ws: WebSocket;
    let retryTimeout: NodeJS.Timeout;
    const sessionId = ensureSessionId();

    fetchState();

    const connectWs = () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/demo';

      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => {
          setIsConnected(false);
          retryTimeout = setTimeout(connectWs, 2000);
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'kafka_state_update') {
              const messageSession = msg?.data?.session_id;
              if (!messageSession || messageSession !== sessionId) return;

              const { session_id: _ignored, ...stateData } = msg.data;
              setKafkaState(stateData);
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };
        wsRef.current = ws;
      } catch (err) {
        retryTimeout = setTimeout(connectWs, 2000);
      }
    };

    connectWs();

    const heartbeat = setInterval(() => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      fetch(`${apiUrl}/api/demo/widgets/${widgetId}/heartbeat`, { method: 'POST' }).catch(() => {});
    }, 60000);

    return () => {
      clearTimeout(retryTimeout);
      clearInterval(heartbeat);
      if (wsRef.current) wsRef.current.close();
    };
  }, [widgetId]);

  const sendOrder = async () => {
    if (!isConnected) return;
    const id = "ORD-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
    const sessionId = ensureSessionId();
    
    setOrderLogs(prev => [{ id, time: Date.now() }, ...prev].slice(0, 5));

    try {
      await fetch(`${apiUrl}/api/demo/kafka/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Session': sessionId,
        },
        body: JSON.stringify({ order_id: id, amount: Math.floor(Math.random() * 100) + 10 }),
      });
    } catch (err) {
      console.error('Order failed:', err);
    }
  };

  const toggleService = async (service: 'inventory' | 'email' | 'analytics', isCrashed: boolean) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const sessionId = ensureSessionId();
      const action = isCrashed ? 'restart' : 'crash';
      await fetch(`${apiUrl}/api/demo/kafka/${action}/${service}`, {
        method: 'POST',
        headers: { 'X-Demo-Session': sessionId },
      });
      setKafkaState(prev => ({
        ...prev,
        [service]: { ...prev[service], crashed: !isCrashed }
      }));
    } catch (err) {
      console.error(`Failed to toggle ${service}:`, err);
    }
  };
  const ConsumerBlock = ({ title, name, data, icon }: { title: string, name: 'inventory' | 'email' | 'analytics', data: ConsumerState, icon: string }) => (
    <div className="flex flex-col border border-border bg-card rounded-xl overflow-hidden shadow-sm">
      <div className="flex justify-between items-center bg-muted/50 p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h4 className="font-bold text-foreground text-sm">{title}</h4>
        </div>
        <button
          onClick={() => toggleService(name, data.crashed)}
          className={`px-3 py-1 rounded text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
            data.crashed 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white' 
              : 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground'
          }`}
        >
          {data.crashed ? <Power className="w-3 h-3" /> : 'Crash Service'}
          {data.crashed ? 'Restart' : ''}
        </button>
      </div>
      <div className="p-3 bg-slate-950 text-slate-300 font-mono text-[10px] sm:text-[11px] h-40 overflow-y-auto flex flex-col gap-1.5">
        {data.crashed && (
          <div className="flex items-center justify-center h-full flex-col gap-2 opacity-50">
            <span className="text-2xl">💀</span>
            <span>Service Offline</span>
          </div>
        )}
        {!data.crashed && Object.keys(data.state).length === 0 && (
          <div className="flex items-center justify-center h-full opacity-50">
            Waiting for events...
          </div>
        )}
        {!data.crashed && orderLogs.map(log => (
          data.state[log.id] ? (
            <div key={log.id} className="flex justify-between items-center text-emerald-400 border-b border-slate-800 pb-1.5">
              <span>{log.id}</span>
              <span>{data.state[log.id]}</span>
            </div>
          ) : (
            <div key={log.id} className="flex justify-between items-center opacity-50 border-b border-slate-800 pb-1.5">
              <span>{log.id}</span>
              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Processing</span>
            </div>
          )
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full h-[85vh] min-h-[600px] bg-background text-foreground font-sans">
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between p-4 border-b border-border bg-card gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-md ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-foreground">Distributed Event Streaming</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`}></span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isConnected ? 'Redpanda Cluster Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={sendOrder}
            disabled={!isConnected}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl shadow-sm transition whitespace-nowrap ${
              isConnected
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            🛒 Simulate Checkout (Produce Event)
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden p-6 bg-muted/30">
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full font-mono text-xs font-bold shadow-md relative z-10">
            <span className="text-primary">Topic:</span> orders
          </div>
          <div className="absolute top-1/2 left-0 w-full h-px bg-border -z-0"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          <ConsumerBlock title="Inventory Microservice" name="inventory" data={kafkaState.inventory} icon="📦" />
          <ConsumerBlock title="Email Microservice" name="email" data={kafkaState.email} icon="📧" />
          <ConsumerBlock title="Analytics Microservice" name="analytics" data={kafkaState.analytics} icon="📊" />
        </div>
      </div>

      <div className="bg-primary/5 border-t border-primary/20 p-4 shrink-0 text-[11px] sm:text-xs text-foreground leading-relaxed overflow-y-auto">
        <h4 className="font-bold uppercase tracking-wider text-primary mb-2">The Distributed Log Concept</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <strong>1. Event Pub/Sub:</strong> Unlike a traditional Message Queue (which deletes tasks after 1 worker finishes them), Redpanda/Kafka stores events in an immutable append-only log. When you click Checkout, 1 single event is produced.
          </div>
          <div>
            <strong>2. Independent Consumers:</strong> Three entirely distinct microservices (Inventory, Email, Analytics) all subscribe to the same topic. They process the exact same event at their own individual speeds without blocking each other.
          </div>
          <div>
            <strong>3. Disaster Recovery (Replay):</strong> Try clicking <strong>Crash Service</strong> on the Email worker, then fire a few checkouts. Notice how Inventory updates, but Emails are lost. Now click <strong>Restart</strong>. Because the log is immutable, the Email service instantly reads its missed offsets and catches up!
          </div>
        </div>
      </div>
    </div>
  );
}
