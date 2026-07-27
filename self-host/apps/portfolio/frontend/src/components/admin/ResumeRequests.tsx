'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type ResumeRequest = {
  id: string;
  name: string;
  email: string;
  company: string;
  reason: string;
  status: string;
  created_at: number;
};

const dsInput =
  "w-full px-3 py-2.5 bg-white border-2 border-black rounded-[0.5rem] text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] transition-shadow";

const pushBtnSm =
  "transition-transform duration-200 [transition-timing-function:cubic-bezier(0.175,0.885,0.32,1.275)] hover:translate-x-0.5 hover:translate-y-0.5";

const statusStyle: Record<string, { bg: string; label: string }> = {
  pending: { bg: 'var(--ds-yellow)', label: 'Pending' },
  approved: { bg: 'var(--ds-sage)', label: 'Approved' },
  'approving...': { bg: 'var(--ds-sage)', label: 'Approving…' },
  rejected: { bg: '#f5a3a3', label: 'Rejected' },
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

  if (loading) return (
    <div role="status" aria-live="polite" className="text-sm font-bold text-[var(--ds-charcoal)]/70 p-8 text-center bg-white border-2 border-black" style={{ borderRadius: '0.75rem' }}>
      Loading requests&hellip;
    </div>
  );

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '0.75rem' }}>
      {requests.length === 0 ? (
        <div className="p-12 text-center text-[var(--ds-charcoal)]/70">
          No resume requests found.
        </div>
      ) : (
        <div className="divide-y-2 divide-black">
          {requests.sort((a, b) => b.created_at - a.created_at).map(req => (
            <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h4 className="font-extrabold text-lg">{req.name}</h4>
                  <span className="text-sm font-bold text-[var(--ds-charcoal)]/70 bg-black/5 px-2 py-0.5" style={{ borderRadius: '0.25rem' }}>{req.company}</span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-black"
                    style={{ borderRadius: '999px', backgroundColor: statusStyle[req.status]?.bg || 'var(--ds-white)' }}
                  >
                    {statusStyle[req.status]?.label || req.status}
                  </span>
                </div>
                {isAdmin ? (
                  <a href={`mailto:${req.email}`} className="text-sm text-[var(--ds-charcoal)] hover:underline mb-3 inline-block">{req.email}</a>
                ) : (
                  <span className="text-sm text-[var(--ds-charcoal)]/70 mb-3 inline-block">{req.email}</span>
                )}
                {req.reason && (
                  <p className="text-sm text-[var(--ds-charcoal)]/80 bg-black/5 p-3 italic" style={{ borderRadius: '0.5rem' }}>
                    &ldquo;{req.reason}&rdquo;
                  </p>
                )}
                <div className="text-[10px] text-[var(--ds-charcoal)]/50 mt-3 font-mono">
                  Requested: {new Date(req.created_at).toLocaleString()}
                </div>
              </div>

              {req.status === 'pending' && isAdmin && (
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleAction(req.id, 'reject')}
                    className="px-4 py-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => openApproveDialog(req.id, req.name)}
                    className={`px-4 py-2 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${pushBtnSm} bg-black text-white`}
                    style={{ borderRadius: '0.5rem' }}
                  >
                    Approve &amp; Email Link
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => !open && setApproveDialog({ ...approveDialog, open: false })}>
        <DialogContent
          className="sm:max-w-xl bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-black font-extrabold">Approve Request</DialogTitle>
            <DialogDescription className="text-[var(--ds-charcoal)]/70">
              Customize the email that will be sent to <strong className="text-black">{approveDialog.name}</strong>.
              Use <code className="bg-black/5 px-1 rounded text-[var(--ds-charcoal)]">{"{{name}}"}</code> and <code className="bg-black/5 px-1 rounded text-[var(--ds-charcoal)]">{"{{link}}"}</code> as template variables.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Email Subject</label>
              <input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className={dsInput}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Email Body</label>
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                rows={8}
                className={`${dsInput} font-mono text-sm leading-relaxed resize-none`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setApproveDialog({ ...approveDialog, open: false })}
              className="px-4 py-2 text-sm font-bold text-[var(--ds-charcoal)]/60 hover:text-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={() => handleAction(approveDialog.reqId!, 'approve', emailSubject, emailBody)}
              className={`px-5 py-2 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none ${pushBtnSm} bg-black text-white`}
              style={{ borderRadius: '0.5rem' }}
            >
              Send Secure Link
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
