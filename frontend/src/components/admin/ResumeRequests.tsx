'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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
        toast({ title: "Success", description: `Request ${action}d successfully` });
        fetchRequests(); // Refresh actual state
      } else {
        const errorData = await res.json();
        toast({ title: "Error", description: errorData.error || `Failed to ${action} request`, variant: "destructive" });
        setRequests(previous); // Revert
      }
    } catch (e) {
      toast({ title: "Error", description: 'Network error', variant: "destructive" });
      setRequests(previous);
    }
  };

  if (loading) return <div className="animate-pulse text-muted-foreground p-8 text-center bg-card  border border-border /50 rounded-xl">Loading requests...</div>;

  return (
    <div className="bg-card  rounded-xl shadow-sm border border-border /50 overflow-hidden">
      {requests.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground dark:text-muted-foreground/70">
          <span className="text-4xl block mb-4 opacity-50">📥</span>
          No resume requests found.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {requests.sort((a, b) => b.created_at - a.created_at).map(req => (
            <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/50  transition">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-bold text-foreground  text-lg">{req.name}</h4>
                  <span className="text-sm font-mono text-muted-foreground dark:text-muted-foreground/70 bg-muted  px-2 py-0.5 rounded">{req.company}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    req.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-200   ' :
                    req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-200   ' :
                    req.status === 'approving...' ? 'bg-blue-100 text-blue-700 border-blue-200    animate-pulse' :
                    'bg-rose-500/10 text-rose-500 border-rose-200   '
                  }`}>
                    {req.status}
                  </span>
                </div>
                {isAdmin ? (
                  <a href={`mailto:${req.email}`} className="text-sm text-blue-600 hover:underline mb-3 inline-block">{req.email}</a>
                ) : (
                  <span className="text-sm text-muted-foreground mb-3 inline-block">{req.email}</span>
                )}
                {req.reason && (
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground/70 bg-muted/50 dark:bg-black/90 p-3 rounded-lg border border-border/50 /50 italic">
                    "{req.reason}"
                  </p>
                )}
                <div className="text-[10px] text-muted-foreground/70 mt-3 font-mono">
                  Requested: {new Date(req.created_at).toLocaleString()}
                </div>
              </div>
              
              {req.status === 'pending' && isAdmin && (
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => handleAction(req.id, 'reject')}
                    className="px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50  rounded-lg transition"
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
