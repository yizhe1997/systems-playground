'use client';

import { useState, useEffect, useRef } from 'react';
import { useWidgetHeartbeat } from '@/hooks/use-widget-heartbeat';

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
  
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [targetId, setTargetId] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<'draft' | 'published' | 'closed'>('draft');
  
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-fill form when targetId changes
  useEffect(() => {
    if (mode === 'update' && targetId) {
      const job = jobs.find(j => j.id === targetId);
      if (job) {
        setJobTitle(job.title);
        setJobStatus(job.status as any);
      }
    }
  }, [targetId, mode, jobs]);

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
            
            // Determine log text
            let text = '';
            if (msg.type === 'job_processing') text = `Worker picked up job ${msg.jobId}`;
            else if (msg.type === 'job_duplicate') text = `[Idempotency Lock] Ignored duplicate webhook for ${msg.jobId}`;
            else text = `Successfully synced job ${msg.jobId} to database`;

            // Add a log entry for the visual queue
            setQueueLogs(prev => [{
              id: msg.jobId,
              text,
              time: msg.timestamp
            }, ...prev].slice(0, 15));

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

    return () => {
      clearTimeout(retryTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Keeps the container alive: immediate beat on mount, periodic beats, plus
  // recovery beats on tab-visibility-regained and network-reconnect.
  useWidgetHeartbeat(widgetId);

  const sendWebhook = async (isBurst = false) => {
    if (!isConnected) return;
    if (mode === 'update' && !targetId) {
      alert('Please select a job ID to update.');
      return;
    }

    const id = mode === 'create' ? Math.random().toString(36).substring(2, 9) : targetId;
    const title = jobTitle.trim() || `Software Engineer L${Math.floor(Math.random() * 5) + 1}`;
    const idempotencyKey = `req-${id}-${Date.now()}`;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
    
    // Add to the visual queue log
    setQueueLogs(prev => [{
      id,
      text: isBurst ? `⚡ Firing 10 identical webhooks simultaneously (Network Burst)` : `HTTP 202 Accepted: Dropped payload into RabbitMQ`,
      time: Date.now()
    }, ...prev].slice(0, 15));

    const fireRequest = () => fetch(`${apiUrl}/api/demo/webhook`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        id,
        timestamp: Date.now(),
        data: {
          title: title,
          target_status: jobStatus
        }
      }),
    });

    try {
      if (isBurst) {
        // Fire 10 parallel requests with the EXACT same idempotency key
        await Promise.all(Array(10).fill(null).map(fireRequest));
      } else {
        await fireRequest();
      }
      
      if (mode === 'create') {
        setJobTitle(''); // Clear title on new creation
      }
    } catch (err) {
      console.error('Webhook failed:', err);
    }
  };

  return (
    <div className="flex flex-col w-full h-[85vh] min-h-[600px] bg-background text-foreground font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between p-4 border-b border-border bg-card gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-md ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-foreground">Event-Driven Job Sync</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isConnected ? 'Go WebSocket Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col gap-2 w-full sm:w-72 bg-muted p-3 rounded-lg border border-border">
          <div className="flex bg-muted/50 p-1 rounded-md gap-1">
            <button 
              onClick={() => setMode('create')} 
              className={`flex-1 text-[11px] font-semibold py-1 rounded transition-colors ${mode === 'create' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
            >
              New Job
            </button>
            <button 
              onClick={() => { setMode('update'); if(jobs.length > 0) setTargetId(jobs[0].id); }} 
              disabled={jobs.length === 0}
              className={`flex-1 text-[11px] font-semibold py-1 rounded transition-colors ${mode === 'update' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground/80'} disabled:opacity-50`}
            >
              Update Job
            </button>
          </div>

          {mode === 'update' && (
            <select 
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="text-xs border border-border rounded px-2 py-1.5 bg-card text-foreground/80 outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>Select target ID...</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.id} - {j.title}</option>)}
            </select>
          )}

          <input 
            type="text" 
            value={jobTitle} 
            onChange={(e) => setJobTitle(e.target.value)} 
            placeholder={mode === 'create' ? "Job Title (e.g. Software Engineer)" : "Update Job Title"}
            className="w-full text-xs border border-border rounded px-2 py-1.5 bg-card text-foreground/80 outline-none focus:ring-1 focus:ring-primary"
          />

          <select 
            value={jobStatus}
            onChange={(e) => setJobStatus(e.target.value as any)}
            className="w-full text-xs border border-border rounded px-2 py-1.5 bg-card text-foreground/80 outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => sendWebhook(false)}
              disabled={!isConnected}
              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded shadow-sm transition whitespace-nowrap ${
                isConnected
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-slate-200 text-muted-foreground/70 cursor-not-allowed'
              }`}
            >
              Fire Webhook
            </button>
            <button
              onClick={() => sendWebhook(true)}
              disabled={!isConnected}
              title="Sends 10 identical requests simultaneously to test the Redis idempotency lock"
              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded shadow-sm transition whitespace-nowrap border ${
                isConnected
                  ? 'bg-rose-50 hover:bg-rose-500/10 text-rose-500 border-rose-200'
                  : 'bg-muted/50 text-muted-foreground/70 cursor-not-allowed border-border'
              }`}
            >
              Simulate Burst
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
        {/* Left Side: Live Database State */}
        <div className="flex-1 border-b sm:border-b-0 sm:border-r border-border flex flex-col bg-card overflow-hidden">
          <div className="bg-muted border-b border-border px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
            <span>Live Redis Database State</span>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]" title="Redis Key Pattern">Keys: job:*</span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {jobs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground/70 opacity-70">
                <span className="text-4xl mb-2">🗄️</span>
                <p className="text-sm font-medium">Database is empty</p>
                <p className="text-xs text-center mt-1">Fire a webhook to insert a job</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="border border-border rounded-md p-3 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <h4 className="font-bold text-foreground text-sm leading-tight">{job.title}</h4>
                      <span className="text-[10px] font-mono text-muted-foreground">ID: {job.id}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                      job.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="pl-2 pt-2 border-t border-border/50 flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground/70">
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
        <div className="w-full sm:w-2/5 flex flex-col bg-slate-950 text-slate-300 overflow-hidden">
          <div className="bg-black/90 border-b border-slate-800/50 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
            <span>Event Stream</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live</span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-3 font-mono text-[11px] leading-relaxed">
            {queueLogs.length === 0 ? (
              <div className="opacity-50 text-center mt-10">
                Listening for events on<br/>`webhook_jobs` queue...
              </div>
            ) : (
              queueLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground shrink-0">[{new Date(log.time).toISOString().substring(11, 19)}]</span>
                  <span className={`
                    ${log.text.includes('Dropped payload') ? 'text-blue-400' : ''}
                    ${log.text.includes('Worker picked up') ? 'text-amber-400' : ''}
                    ${log.text.includes('Successfully synced') ? 'text-emerald-400' : ''}
                    ${log.text.includes('Duplicate') || log.text.includes('Burst') ? 'text-rose-400' : ''}
                  `}>
                    {log.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Info Panel */}
      <div className="bg-primary/5 border-t border-primary/20 p-4 shrink-0 text-[11px] sm:text-xs text-foreground leading-relaxed overflow-y-auto">
        <h4 className="font-bold uppercase tracking-wider text-primary mb-2">How this architecture works</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <strong>1. The Idempotency Lock:</strong> Clicking "Simulate Burst" fires 10 identical webhook payloads at the Go API simultaneously. The API generates a hash (the Idempotency-Key) and checks it against Redis via a <code>SETNX</code> command. The first request grabs the lock and drops the payload into RabbitMQ. The other 9 requests instantly hit the lock and are rejected, preventing race conditions and database corruption.
          </div>
          <div>
            <strong>2. Event-Driven Syncing:</strong> Instead of the HTTP API thread talking directly to the database (which crashes during high load), it instantly returns <code>202 Accepted</code>. A background Go worker consumes the RabbitMQ queue (FIFO) at a safe speed, updates the Redis database, and pushes the final state to the UI via persistent WebSockets.
          </div>
          <div>
            <strong>3. Eventual Consistency:</strong> Because the API replies instantly <em>before</em> the database actually updates, the frontend state and backend state are briefly out of sync (eventual consistency). To prevent user confusion, WebSockets instantly push the finalized state back to the UI the millisecond the worker finishes, perfectly masking the asynchronous delay.
          </div>
        </div>
      </div>
    </div>
  );
}
