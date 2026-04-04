'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type ResumeRequest = {
  id: string;
  name: string;
  email: string;
  company: string;
  reason: string;
  status: string;
  created_at: number;
};

export default function ResumeRequests({ isAdmin }: { isAdmin: boolean }) {
  const [requests, setRequests] = useState<ResumeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/proxy/resume');
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!isAdmin) return;
    const previous = [...requests];
    
    // Optimistic update
    setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approving...' : 'rejected' } : r));

    try {
      const res = await fetch('/api/proxy/resume/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      
      if (res.ok) {
        toast.success(`Request ${action}d successfully`);
        fetchRequests(); // Refresh actual state
      } else {
        toast.error(`Failed to ${action} request`);
        setRequests(previous); // Revert
      }
    } catch (e) {
      toast.error('Network error');
      setRequests(previous);
    }
  };

  if (loading) return <div className="animate-pulse text-slate-500 p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">Loading requests...</div>;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {requests.length === 0 ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400">
          <span className="text-4xl block mb-4 opacity-50">📥</span>
          No resume requests found.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {requests.sort((a, b) => b.created_at - a.created_at).map(req => (
            <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{req.name}</h4>
                  <span className="text-sm font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{req.company}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    req.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                    req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                    req.status === 'approving...' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 animate-pulse' :
                    'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <a href={`mailto:${req.email}`} className="text-sm text-blue-600 hover:underline mb-3 inline-block">{req.email}</a>
                {req.reason && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                    "{req.reason}"
                  </p>
                )}
                <div className="text-[10px] text-slate-400 mt-3 font-mono">
                  Requested: {new Date(req.created_at).toLocaleString()}
                </div>
              </div>
              
              {req.status === 'pending' && isAdmin && (
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => handleAction(req.id, 'reject')}
                    className="px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => handleAction(req.id, 'approve')}
                    className="px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition"
                  >
                    Approve & Email Link
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
