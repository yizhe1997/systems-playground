'use client';
import { useState, useEffect } from 'react';
import { MoreVertical, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
  'w-full px-3 py-2.5 bg-white border-2 border-black rounded-[0.5rem] text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] transition-shadow';

const pushBtnSm =
  'transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-0.5 hover:translate-y-0.5';

const badgePill = 'border-2 border-black rounded-full text-[10px] font-bold uppercase tracking-wider px-2 py-0.5';

const menuContentClass =
  'border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] bg-white text-[var(--ds-charcoal)] p-1';

const PAGE_SIZES = [10, 20, 30, 40, 50];

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

function StatusBadge({ status }: { status: string }) {
  const style = statusStyle[status];
  return (
    <Badge variant="outline" className={badgePill} style={{ backgroundColor: style?.bg || 'var(--ds-white)' }}>
      {style?.label || status}
    </Badge>
  );
}

function TriageBadge({ req, onRetry, isAdmin }: { req: ResumeRequest; onRetry: (id: string) => void; isAdmin: boolean }) {
  if (req.triage_status === 'queued' || req.triage_status === 'processing') {
    return (
      <Badge variant="outline" className={badgePill} style={{ backgroundColor: 'var(--ds-white)' }}>
        Triaging…
      </Badge>
    );
  }
  if (req.triage_status === 'failed') {
    return (
      <span className="inline-flex items-center gap-2">
        <Badge
          variant="outline"
          className={badgePill}
          style={{ backgroundColor: 'var(--ds-yellow)' }}
          title={req.triage_error || 'Triage failed'}
        >
          Triage failed{req.triage_attempts ? ` (${req.triage_attempts}x)` : ''}
        </Badge>
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
  if (!style) return <span className="text-[var(--ds-charcoal)]/40 text-sm">—</span>;
  return (
    <Badge variant="outline" className={badgePill} style={{ backgroundColor: style.bg, color: style.text }}>
      {style.label}
    </Badge>
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
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  // Details sheet state
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Dialog state
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; reqId: string | null; name: string }>({ open: false, reqId: null, name: '' });
  const [emailSubject, setEmailSubject] = useState('Chin Yi Zhe - Requested Resume');
  const [emailBody, setEmailBody] = useState('');

  const { toast } = useToast();

  const openApproveDialog = (id: string, name: string) => {
    setEmailSubject('Chin Yi Zhe - Requested Resume');
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
  }, [statusFilter, legitimacyFilter, search, pageSize]);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const viewing = requests.find(r => r.id === viewingId) || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, company, email…"
          className={`${dsInput} max-w-xs`}
        />
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="border-2 border-black rounded-[0.5rem] h-9 bg-white font-bold text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className={menuContentClass}>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={legitimacyFilter} onValueChange={(v) => v && setLegitimacyFilter(v)}>
          <SelectTrigger className="border-2 border-black rounded-[0.5rem] h-9 bg-white font-bold text-sm">
            <SelectValue placeholder="All AI verdicts" />
          </SelectTrigger>
          <SelectContent className={menuContentClass}>
            <SelectItem value="all">All AI verdicts</SelectItem>
            <SelectItem value="legit">Legit</SelectItem>
            <SelectItem value="suspicious">Suspicious</SelectItem>
            <SelectItem value="spam">Spam</SelectItem>
            <SelectItem value="triaging">Triaging…</SelectItem>
            <SelectItem value="failed">Triage failed</SelectItem>
          </SelectContent>
        </Select>
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
          <Table>
            <TableHeader className="bg-[var(--ds-yellow)]/40">
              <TableRow className="border-b-2 border-black hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Requester</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Company</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">AI Verdict</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Requested</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(req => {
                // Retention sweep anonymizes name/email/reason 30 days after
                // submission (see backend/resume.go runRetentionSweep) - it
                // never deletes the row, so this state is expected and
                // permanent, not missing/corrupted data.
                const isAnonymized = !req.name && !req.email;
                return (
                  <TableRow key={req.id} className="border-b-2 border-black/10 last:border-b-0">
                    <TableCell className="whitespace-normal">
                      <Button
                        variant="link"
                        className="px-0 h-auto font-extrabold text-[var(--ds-charcoal)]"
                        onClick={() => setViewingId(req.id)}
                      >
                        {isAnonymized ? <span className="italic font-normal text-[var(--ds-charcoal)]/70">Anonymized</span> : req.name}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--ds-charcoal)]/80">{req.company || '—'}</TableCell>
                    <TableCell><StatusBadge status={req.status} /></TableCell>
                    <TableCell><TriageBadge req={req} onRetry={handleRetriage} isAdmin={isAdmin} /></TableCell>
                    <TableCell className="text-xs font-mono text-[var(--ds-charcoal)]/70 whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" aria-label="Open actions menu">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className={menuContentClass}>
                          <DropdownMenuItem onClick={() => setViewingId(req.id)}>View details</DropdownMenuItem>
                          {isAdmin && !isAnonymized && (
                            <DropdownMenuItem onClick={() => window.location.assign(`mailto:${req.email}`)}>
                              Email requester
                            </DropdownMenuItem>
                          )}
                          {isAdmin && req.triage_status === 'failed' && (
                            <DropdownMenuItem onClick={() => handleRetriage(req.id)}>Retry AI triage</DropdownMenuItem>
                          )}
                          {isAdmin && req.status === 'pending' && (
                            <>
                              <DropdownMenuSeparator />
                              {isAnonymized ? (
                                <DropdownMenuItem disabled>Can&apos;t approve — anonymized</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => openApproveDialog(req.id, req.name)}>
                                  Approve &amp; email link
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem variant="destructive" onClick={() => handleAction(req.id, 'reject')}>
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="page-size" className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
              Rows per page
            </Label>
            <Select value={`${pageSize}`} onValueChange={(v) => v && setPageSize(Number(v))}>
              <SelectTrigger id="page-size" size="sm" className="border-2 border-black rounded-[0.5rem] bg-white font-bold text-sm w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={menuContentClass}>
                {PAGE_SIZES.map(size => (
                  <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-sm font-bold text-[var(--ds-charcoal)]/70">
            Page {currentPage} of {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="border-2 border-black rounded-[0.5rem]"
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-2 border-black rounded-[0.5rem]"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-2 border-black rounded-[0.5rem]"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-2 border-black rounded-[0.5rem]"
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Details Sheet */}
      <Sheet open={!!viewing} onOpenChange={(open) => !open && setViewingId(null)}>
        <SheetContent className="bg-white border-l-2 border-black text-[var(--ds-charcoal)] w-full sm:max-w-md overflow-y-auto" style={{ fontFamily: 'var(--ds-font-body)' }}>
          {viewing && (() => {
            const isAnonymized = !viewing.name && !viewing.email;
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-black font-extrabold text-xl">
                    {isAnonymized ? 'Anonymized request' : viewing.name}
                  </SheetTitle>
                  <SheetDescription>
                    {viewing.company || 'No company given'}
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 flex flex-col gap-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={viewing.status} />
                    <TriageBadge req={viewing} onRetry={handleRetriage} isAdmin={isAdmin} />
                  </div>

                  {isAnonymized ? (
                    <p className="text-[var(--ds-charcoal)]/70 italic">Contact info erased 30 days after submission.</p>
                  ) : isAdmin ? (
                    <a href={`mailto:${viewing.email}`} className="text-[var(--ds-charcoal)] hover:underline">{viewing.email}</a>
                  ) : (
                    <span className="text-[var(--ds-charcoal)]/70">{viewing.email}</span>
                  )}

                  {viewing.reason && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70 mb-1">Reason</p>
                      <p className="bg-black/5 p-3 italic" style={{ borderRadius: '0.5rem' }}>&ldquo;{viewing.reason}&rdquo;</p>
                    </div>
                  )}

                  {viewing.role_fit_summary && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70 mb-1">AI read</p>
                      <p className="text-[var(--ds-charcoal)]/80">{viewing.role_fit_summary}</p>
                    </div>
                  )}

                  {viewing.legitimacy_reason && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70 mb-1">Verdict reasoning</p>
                      <p className="text-[var(--ds-charcoal)]/80">{viewing.legitimacy_reason}</p>
                    </div>
                  )}

                  <div className="text-xs text-[var(--ds-charcoal)]/70 font-mono flex flex-col gap-1 pt-2 border-t-2 border-black/10">
                    <span>Requested: {new Date(viewing.created_at).toLocaleString()}</span>
                    {viewing.ai_model && <span>Graded by: {viewing.ai_model}</span>}
                  </div>
                </div>
                {isAdmin && viewing.status === 'pending' && (
                  <SheetFooter className="flex-row justify-end gap-3">
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleAction(viewing.id, 'reject')}
                    >
                      Reject
                    </Button>
                    {!isAnonymized && (
                      <Button
                        className={`border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none ${pushBtnSm} bg-black text-white rounded-[0.5rem]`}
                        onClick={() => openApproveDialog(viewing.id, viewing.name)}
                      >
                        Approve &amp; Email Link
                      </Button>
                    )}
                  </SheetFooter>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

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
