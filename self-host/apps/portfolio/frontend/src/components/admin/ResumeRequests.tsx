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
  triage_status: string;
  ai_model?: string;
  legitimacy?: string;
  legitimacy_reason?: string;
  role_fit_summary?: string;
  triage_error?: string;
  triage_attempts?: number;
};

const dsInput =
  "w-full px-3 py-2.5 bg-white border-2 border-black rounded-[0.5rem] text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] transition-shadow";

const dsSelect =
  "px-3 py-2 bg-white border-2 border-black rounded-[0.5rem] text-sm font-bold text-[var(--ds-charcoal)] focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] transition-shadow";

const pushBtnSm =
  "transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-0.5 hover:translate-y-0.5";

const PAGE_SIZE = 10;

const statusStyle: Record<string, { bg: string; label: string }> = {
  pending: { bg: 'var(--ds-yellow)', label: 'Pending' },
  approved: { bg: 'var(--ds-sage)', label: 'Approved' },
  'approving...': { bg: 'var(--ds-sage)', label: 'Approving…' },
  rejected: { bg: '#f5a3a3', label: 'Rejected' },
};

const legitimacyStyle: Record<string, { bg: string; label: string; text: string }> = {
  legit: { bg: 'var(--ds-sage)', label: 'Legit', text: 'black' },
  suspicious: { bg: 'var(--ds-yellow)', label: 'Suspicious', text: 'black' },
  spam: { bg: 'var(--ds-charcoal)', label: 'Spam', text: 'white' },
};

function TriageBadge({ req, onRetry, isAdmin }: { req: ResumeRequest; onRetry: (id: string) => void; isAdmin: boolean }) {
  if (req.triage_status === 'queued' || req.triage_status === 'processing') {
    return (
      <span
        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-black"
        style={{ borderRadius: '999px', backgroundColor: 'var(--ds-white)' }}
      >
        Triaging…
      </span>
    );
  }
  if (req.triage_status === 'failed') {
    return (
      <span className="inline-flex items-center gap-2">
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-black"
          style={{ borderRadius: '999px', backgroundColor: 'var(--ds-yellow)' }}
          title={req.triage_error || 'Triage failed'}
        >
          Triage failed{req.triage_attempts ? ` (${req.triage_attempts}x)` : ''}
        </span>
        {isAdmin && (
          <button
            onClick={() => onRetry(req.id)}
            className="text-[10px] font-bold underline underline-offset-2 text-[var(--ds-charcoal)]/70 hover:text-black"
          >
            Retry
          </button>
        )}
      </span>
    );
  }
  const style = req.legitimacy ? legitimacyStyle[req.legitimacy] : null;
  if (!style) return null;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-black"
      style={{ borderRadius: '999px', backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

export default function ResumeRequests({ isAdmin }: { isAdmin: boolean }) {
  const [requests, setRequests] = useState<ResumeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [legitimacyFilter, setLegitimacyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [statusFilter, legitimacyFilter, search]);

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

  const handleRetriage = async (id: string) => {
    if (!isAdmin) return;
    const previous = [...requests];
    setRequests(reqs => reqs.map(r => r.id === id ? { ...r, triage_status: 'queued', triage_error: '' } : r));

    try {
      const res = await fetch('/api/proxy/resume/retriage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast({ title: "Retriage started", description: "Re-running AI triage now." });
        setTimeout(fetchRequests, 3000);
      } else {
        const errorData = await res.json();
        toast({ title: "Error", description: errorData.error || "Failed to requeue triage", variant: "destructive" });
        setRequests(previous);
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

  const filtered = requests
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => {
      if (legitimacyFilter === 'all') return true;
      if (legitimacyFilter === 'triaging') return r.triage_status === 'queued' || r.triage_status === 'processing';
      if (legitimacyFilter === 'failed') return r.triage_status === 'failed';
      return r.legitimacy === legitimacyFilter;
    })
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.company.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    })
    .sort((a, b) => b.created_at - a.created_at);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, company, email…"
          className={`${dsInput} max-w-xs`}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={dsSelect}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={legitimacyFilter} onChange={e => setLegitimacyFilter(e.target.value)} className={dsSelect}>
          <option value="all">All AI verdicts</option>
          <option value="legit">Legit</option>
          <option value="suspicious">Suspicious</option>
          <option value="spam">Spam</option>
          <option value="triaging">Triaging…</option>
          <option value="failed">Triage failed</option>
        </select>
        <span className="text-xs font-bold text-[var(--ds-charcoal)]/70 ml-auto">
          {filtered.length} of {requests.length}
        </span>
      </div>

      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '0.75rem' }}>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--ds-charcoal)]/70">
            No resume requests match these filters.
          </div>
        ) : (
          <div className="divide-y-2 divide-black">
            {paginated.map(req => {
              // Retention sweep anonymizes name/email/reason 30 days after
              // submission (see backend/resume.go runRetentionSweep) - it
              // never deletes the row, so this state is expected and
              // permanent, not missing/corrupted data.
              const isAnonymized = !req.name && !req.email;
              return (
              <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h4 className="font-extrabold text-lg">
                      {isAnonymized ? <span className="italic font-normal text-[var(--ds-charcoal)]/70">Anonymized</span> : req.name}
                    </h4>
                    <span className="text-sm font-bold text-[var(--ds-charcoal)]/70 bg-black/5 px-2 py-0.5" style={{ borderRadius: '0.25rem' }}>{req.company}</span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-black"
                      style={{ borderRadius: '999px', backgroundColor: statusStyle[req.status]?.bg || 'var(--ds-white)' }}
                    >
                      {statusStyle[req.status]?.label || req.status}
                    </span>
                    <TriageBadge req={req} onRetry={handleRetriage} isAdmin={isAdmin} />
                  </div>
                  {isAnonymized ? (
                    <span className="text-sm text-[var(--ds-charcoal)]/70 italic mb-3 inline-block">Contact info erased 30 days after submission</span>
                  ) : isAdmin ? (
                    <a href={`mailto:${req.email}`} className="text-sm text-[var(--ds-charcoal)] hover:underline mb-3 inline-block">{req.email}</a>
                  ) : (
                    <span className="text-sm text-[var(--ds-charcoal)]/70 mb-3 inline-block">{req.email}</span>
                  )}
                  {req.reason && (
                    <p className="text-sm text-[var(--ds-charcoal)]/80 bg-black/5 p-3 italic" style={{ borderRadius: '0.5rem' }}>
                      &ldquo;{req.reason}&rdquo;
                    </p>
                  )}
                  {req.role_fit_summary && (
                    <p className="text-xs text-[var(--ds-charcoal)]/70 mt-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--ds-charcoal)]/70 mr-1">AI read</span>
                      {req.role_fit_summary}
                    </p>
                  )}
                  <div className="text-[10px] text-[var(--ds-charcoal)]/70 mt-3 font-mono flex flex-wrap gap-x-3">
                    <span>Requested: {new Date(req.created_at).toLocaleString()}</span>
                    {req.ai_model && <span>Graded by: {req.ai_model}</span>}
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
                    {isAnonymized ? (
                      <span className="text-xs text-[var(--ds-charcoal)]/70 italic max-w-[12rem]">
                        Can&apos;t approve &mdash; contact info anonymized
                      </span>
                    ) : (
                      <button
                        onClick={() => openApproveDialog(req.id, req.name)}
                        className={`px-4 py-2 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${pushBtnSm} bg-black text-white`}
                        style={{ borderRadius: '0.5rem' }}
                      >
                        Approve &amp; Email Link
                      </button>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-bold border-2 border-black bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderRadius: '0.5rem' }}
          >
            Prev
          </button>
          <span className="text-sm font-bold text-[var(--ds-charcoal)]/70">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-bold border-2 border-black bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderRadius: '0.5rem' }}
          >
            Next
          </button>
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
              className="px-4 py-2 text-sm font-bold text-[var(--ds-charcoal)]/70 hover:text-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
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
