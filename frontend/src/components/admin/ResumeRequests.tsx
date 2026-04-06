'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  
  // Dialog state
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; reqId: string | null; name: string }>({ open: false, reqId: null, name: '' });
  const [emailSubject, setEmailSubject] = useState("Chin Yi Zhe - Requested Resume");
  const [emailBody, setEmailBody] = useState("");

  const { toast } = useToast();

  const openApproveDialog = (id: string, name: string) => {
    setEmailSubject("Chin Yi Zhe - Requested Resume");
    setEmailBody(`Hi {{name}},\n\nThank you for your interest! As requested, here is the link to download my resume.\n\n{{link}}\n\nBest regards,\nChin Yi Zhe`);
    setApproveDialog({ open: true, reqId: id, name });
  };

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

  const handleAction = async (id: string, action: 'approve' | 'reject', subject?: string, body?: string) => {
    if (!isAdmin) return;
    const previous = [...requests];
    
    // Optimistic update
    setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approving...' : 'rejected' } : r));
    setApproveDialog({ open: false, reqId: null, name: '' });

    try {
      const res = await fetch('/api/proxy/resume/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, subject, body })
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
                    onClick={() => openApproveDialog(req.id, req.name)}
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

      {/* Approval Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => !open && setApproveDialog({ ...approveDialog, open: false })}>
        <DialogContent className="sm:max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">Approve Request</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Customize the email that will be sent to <strong className="text-foreground">{approveDialog.name}</strong>. 
              Use <code className="bg-muted px-1 rounded text-primary">{"{{name}}"}</code> and <code className="bg-muted px-1 rounded text-primary">{"{{link}}"}</code> as template variables.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email Subject</Label>
              <Input 
                value={emailSubject} 
                onChange={e => setEmailSubject(e.target.value)} 
                className="bg-background border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email Body</Label>
              <Textarea 
                value={emailBody} 
                onChange={e => setEmailBody(e.target.value)} 
                rows={8}
                className="bg-background border-input text-foreground font-mono text-sm leading-relaxed"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setApproveDialog({ ...approveDialog, open: false })}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md transition"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleAction(approveDialog.reqId!, 'approve', emailSubject, emailBody)}
              className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition flex items-center gap-2"
            >
              Send Secure Link
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
