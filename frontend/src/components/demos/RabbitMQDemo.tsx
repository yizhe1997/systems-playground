'use client';

import { useState, useEffect, useRef } from 'react';

type Job = {
  id: string;
  status: 'queued' | 'processing' | 'completed';
  data: string;
  timestamp: number;
};

export default function RabbitMQDemo({ widgetId }: { widgetId: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let retryTimeout: NodeJS.Timeout;

    const connectWs = () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      // Convert http/https to ws/wss
      const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/demo';

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Try to reconnect if the Go API bounces or proxy drops
          retryTimeout = setTimeout(connectWs, 2000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            setJobs((prev) =>
              prev.map((job) => {
                if (job.id === msg.jobId) {
                  if (msg.type === 'job_processing') {
                    return { ...job, status: 'processing' };
                  }
                  if (msg.type === 'job_completed') {
                    return { ...job, status: 'completed' };
                  }
                }
                return job;
              })
            );
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('Failed to establish WebSocket:', err);
        retryTimeout = setTimeout(connectWs, 2000);
      }
    };

    connectWs();

    // The frontend sends a heartbeat to keep the Scale-to-Zero NUC container alive!
    const heartbeat = setInterval(() => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      fetch(`${apiUrl}/api/demo/widgets/${widgetId}/heartbeat`, { method: 'POST' }).catch(() => {});
    }, 60000);

    return () => {
      clearTimeout(retryTimeout);
      clearInterval(heartbeat);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendWebhook = async () => {
    if (!isConnected) return;

    // Generate a random mock ID and data payload
    const id = Math.random().toString(36).substring(2, 9);
    const data = `ATS Job Sync #${Math.floor(Math.random() * 9000) + 1000}`;

    // Optimistically add it to the UI queue
    setJobs((prev) => [{ id, status: 'queued' as const, data, timestamp: Date.now() }, ...prev].slice(0, 5)); // Keep only last 5

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      await fetch(`${apiUrl}/api/demo/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          timestamp: Date.now(),
          data,
        }),
      });
    } catch (err) {
      console.error('Webhook failed:', err);
      // Mark as failed in a real app, but for demo we just log it
    }
  };

  return (
    <div className="flex flex-col w-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-inner h-64">
      {/* Demo Header */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {isConnected ? 'WebSocket Connected' : 'Connecting to API...'}
          </span>
        </div>
        <button
          onClick={sendWebhook}
          disabled={!isConnected}
          className={`text-xs px-4 py-1.5 rounded font-medium shadow-sm transition-colors ${
            isConnected
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Fire Webhook
        </button>
      </div>

      {/* Demo Body (The Queue) */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-xs font-medium">Queue is empty</p>
            <p className="text-[10px] mt-1">Click "Fire Webhook" to drop a payload into RabbitMQ.</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-md shadow-sm">
              <div className="flex items-center gap-3">
                <div className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {job.id}
                </div>
                <span className="text-sm font-medium text-gray-700">{job.data}</span>
              </div>

              <div className="flex items-center">
                {job.status === 'queued' && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    In Queue
                  </span>
                )}
                {job.status === 'processing' && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    <svg className="animate-spin h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Worker Processing
                  </span>
                )}
                {job.status === 'completed' && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                    Success
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
