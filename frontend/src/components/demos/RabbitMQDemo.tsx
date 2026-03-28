'use client';

import { useState, useEffect, useRef } from 'react';

type Job = {
  id: string;
  title: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at?: string;
};

export default function RabbitMQDemo({ widgetId }: { widgetId: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [queueLogs, setQueueLogs] = useState<{id: string, text: string, time: number}[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'draft' | 'published'>('published');
  const wsRef = useRef<WebSocket | null>(null);

  const fetchDatabaseState = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const res = await fetch(`${apiUrl}/api/demo/jobs`);
      const data = await res.json();
      setJobs(data || []);
    } catch (err) {
      console.error('Failed to fetch Redis jobs:', err);
    }
  };

  useEffect(() => {
    let ws: WebSocket;
    let retryTimeout: NodeJS.Timeout;

    fetchDatabaseState();

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
            
            // Add a log entry for the visual queue
            setQueueLogs(prev => [{
              id: msg.jobId,
              text: msg.type === 'job_processing' ? `Worker picked up job ${msg.jobId}` : `Successfully synced job ${msg.jobId} to database`,
              time: msg.timestamp
            }, ...prev].slice(0, 8));

            // If a job just finished, re-fetch the actual database to prove it mutated!
            if (msg.type === 'job_completed') {
              fetchDatabaseState();
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

    const id = Math.random().toString(36).substring(2, 9);
    const title = `Software Engineer L${Math.floor(Math.random() * 5) + 1}`;
    
    // Add to the visual queue log
    setQueueLogs(prev => [{
      id,
      text: `HTTP 202 Accepted: Dropped payload into RabbitMQ`,
      time: Date.now()
    }, ...prev].slice(0, 8));

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      await fetch(`${apiUrl}/api/demo/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          timestamp: Date.now(),
          data: {
            title: title,
            target_status: selectedStatus
          }
        }),
      });
    } catch (err) {
      console.error('Webhook failed:', err);
    }
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-200 bg-white gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-md ${isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Event-Driven Job Sync</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {isConnected ? 'Go WebSocket Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto pr-8">
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 flex-1 sm:flex-none"
          >
            <option value="draft">Sync as Draft</option>
            <option value="published">Sync as Published</option>
          </select>
          <button
            onClick={sendWebhook}
            disabled={!isConnected}
            className={`px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition whitespace-nowrap ${
              isConnected
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Fire Webhook
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
        {/* Left Side: Live Database State */}
        <div className="flex-1 border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col bg-white overflow-hidden">
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
            <span>Live Redis Database State</span>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px]" title="Redis Key Pattern">Keys: job:*</span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {jobs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70">
                <span className="text-4xl mb-2">🗄️</span>
                <p className="text-sm font-medium">Database is empty</p>
                <p className="text-xs text-center mt-1">Fire a webhook to insert a job</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="border border-slate-200 rounded-md p-3 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">{job.title}</h4>
                      <span className="text-[10px] font-mono text-slate-500">ID: {job.id}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                      job.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="pl-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">
                      {job.updated_at ? 'Updated: ' : 'Created: '}
                      {new Date(job.updated_at || job.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Event Queue Log */}
        <div className="w-full sm:w-2/5 flex flex-col bg-slate-900 text-slate-300 overflow-hidden">
          <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
            <span>RabbitMQ Event Stream</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live</span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-3 font-mono text-[11px] leading-relaxed">
            {queueLogs.length === 0 ? (
              <div className="opacity-50 text-center mt-10">
                Listening for events on<br/>`webhook_jobs` queue...
              </div>
            ) : (
              queueLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                  <span className="text-slate-500 shrink-0">[{new Date(log.time).toISOString().substring(11, 19)}]</span>
                  <span className={`
                    ${log.text.includes('Dropped payload') ? 'text-blue-400' : ''}
                    ${log.text.includes('Worker picked up') ? 'text-amber-400' : ''}
                    ${log.text.includes('Successfully synced') ? 'text-emerald-400' : ''}
                  `}>
                    {log.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
