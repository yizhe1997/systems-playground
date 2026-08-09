'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { MoreVertical, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, ExternalLink, Copy, Check } from 'lucide-react';
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
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type ResumeFile = { name: string; filename: string; path: string; size: number; modified: string };

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
  hiring_agency?: string;
  work_type?: string;
  industry?: string;
  salary_range?: string;
  job_posting_url?: string;
};

type SortField = 'name' | 'company' | 'created_at';

// job_posting_url is deliberately not offered as a table column - it's the
// one field that's a link to somewhere third parties chose, not just text,
// and belongs in the details Sheet where opening it is a conscious action
// (see the Sheet's Copy-not-auto-link treatment) rather than something that
// can get glanced at, or misclicked, while scanning a dense table row.
type OptionalColumnKey = 'work_type' | 'hiring_agency' | 'industry' | 'salary_range';
const OPTIONAL_COLUMNS: { key: OptionalColumnKey; label: string }[] = [
  { key: 'work_type', label: 'Work type' },
  { key: 'hiring_agency', label: 'Hiring agency' },
  { key: 'industry', label: 'Industry' },
  { key: 'salary_range', label: 'Salary range' },
];

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Request to ${url} failed: ${res.status}`);
  return res.json();
};

const dsInput =
  'w-full px-3 py-2.5 bg-white border-2 border-black rounded-[0.5rem] text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] transition-shadow';

const pushBtnSm =
  'transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-0.5 hover:translate-y-0.5';

const badgePill = 'border-2 border-black rounded-full text-[10px] font-bold uppercase tracking-wider px-2 py-0.5';

const menuContentClass =
  'border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] bg-white text-[var(--ds-charcoal)] p-1';

function SortableHead({
  label,
  field,
  sortField,
  sortDir,
  onSort,
  className = '',
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sortField === field;
  const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <TableHead className={`text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)] ${className}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 hover:opacity-70 transition-opacity ${active ? '' : 'opacity-70'}`}
      >
        {label}
        <Icon className="w-3 h-3" />
      </button>
    </TableHead>
  );
}

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

export default function ResumeRequests({ isAdmin, activeResumePath }: { isAdmin: boolean; activeResumePath?: string }) {
  // SWR owns the fetch-on-mount lifecycle for both lists - replacing the old
  // effect-plus-state pattern. mutateRequests/mutateResumeFiles below drive
  // the optimistic updates the action handlers need (approve/reject/
  // retriage/redact), matching what manual setRequests+revert used to do.
  const { data: requests = [], isLoading: loading, mutate: mutateRequests } = useSWR<ResumeRequest[]>('/api/proxy/resume', fetcher);
  const { data: resumeFiles = [], mutate: mutateResumeFiles } = useSWR<ResumeFile[]>(isAdmin ? '/api/proxy/resume-files' : null, fetcher);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [legitimacyFilter, setLegitimacyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  // Reset to page 1 whenever filters/search/pageSize change, during render
  // (React's documented "adjust state when a dependency changes" pattern)
  // rather than in an effect that fires a render after.
  const filterKey = `${statusFilter}|${legitimacyFilter}|${search}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  // Sorting - free-text/date columns only (name, company, requested);
  // Status and AI Verdict stay filter-only, they're categorical enough that a
  // dedicated filter dropdown already covers what sorting them would offer.
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  // Advanced fields are hidden by default - most requests leave them blank,
  // so showing all of them always would mostly be empty-cell clutter.
  const [visibleColumns, setVisibleColumns] = useState<Set<OptionalColumnKey>>(new Set());
  const toggleColumn = (key: OptionalColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const activeOptionalColumns = OPTIONAL_COLUMNS.filter((c) => visibleColumns.has(c.key));

  // Details sheet state
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Dialog state
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; reqId: string | null; name: string }>({ open: false, reqId: null, name: '' });
  const [emailSubject, setEmailSubject] = useState('Chin Yi Zhe - Requested Resume');
  const [emailBody, setEmailBody] = useState('');
  const [selectedResumePaths, setSelectedResumePaths] = useState<string[]>([]);
  const [copiedJobUrl, setCopiedJobUrl] = useState(false);

  const { toast } = useToast();

  // Copy, don't auto-link: job_posting_url is a URL a third party chose, not
  // one we control - rendering it as a clickable <a> would open it with one
  // reflexive click. Copying forces a deliberate paste (into a browser, or a
  // URL scanner first) instead.
  const copyJobUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedJobUrl(true);
    setTimeout(() => setCopiedJobUrl(false), 2000);
  };

  const openApproveDialog = (id: string, name: string) => {
    setEmailSubject('Chin Yi Zhe - Requested Resume');
    setEmailBody(`Hi {{name}},\n\nThank you for your interest! As requested, here is the link to download my resume.\n\n{{link}}\n\nBest regards,\nChin Yi Zhe`);
    // Pre-check whatever's marked "Active" in Resume / CV Files - the fast
    // path stays a single click, but nothing stops picking a different one
    // (or several) before sending.
    setSelectedResumePaths(activeResumePath ? [activeResumePath] : []);
    setApproveDialog({ open: true, reqId: id, name });
    // Revalidate rather than trust the mount-time list - the separate
    // "Upload Attachment" dialog on this same page can add/remove files
    // without this component remounting.
    mutateResumeFiles();
  };

  const toggleResumePath = (path: string) => {
    setSelectedResumePaths((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
  };

  const handleAction = async (id: string, action: 'approve' | 'reject', subject?: string, body?: string, resumePaths?: string[]) => {
    if (!isAdmin) return;
    const previous = requests;

    // Optimistic update, no revalidation until we know the server call landed
    mutateRequests(
      previous.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approving...' : 'rejected' } : r),
      { revalidate: false }
    );
    setApproveDialog({ open: false, reqId: null, name: '' });

    try {
      const res = await fetch('/api/proxy/resume/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, subject, body, resumePaths })
      });

      if (res.ok) {
        toast({ title: "Success", description: `Request ${action}d successfully` });
        mutateRequests(); // Refresh actual state
      } else {
        const errorData = await res.json();
        toast({ title: "Error", description: errorData.error || `Failed to ${action} request`, variant: "destructive" });
        mutateRequests(previous, { revalidate: false }); // Revert
      }
    } catch {
      toast({ title: "Error", description: 'Network error', variant: "destructive" });
      mutateRequests(previous, { revalidate: false });
    }
  };

  const handleRetriage = async (id: string) => {
    if (!isAdmin) return;
    const previous = requests;
    mutateRequests(
      previous.map(r => r.id === id ? { ...r, triage_status: 'queued', triage_error: '' } : r),
      { revalidate: false }
    );

    try {
      const res = await fetch('/api/proxy/resume/retriage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast({ title: "Retriage started", description: "Re-running AI triage now." });
        setTimeout(() => mutateRequests(), 3000);
      } else {
        const errorData = await res.json();
        toast({ title: "Error", description: errorData.error || "Failed to requeue triage", variant: "destructive" });
        mutateRequests(previous, { revalidate: false });
      }
    } catch {
      toast({ title: "Error", description: 'Network error', variant: "destructive" });
      mutateRequests(previous, { revalidate: false });
    }
  };

  // Soft delete: clears name/email on demand, same fields the 30-day
  // retention sweep clears automatically (see backend/resume.go
  // runRetentionSweep) - company/reason/status/triage verdict stay, and
  // there's no hard-delete route to fall back to.
  const handleRedact = async (id: string, name: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`Redact ${name || 'this request'}'s name and email? This can't be undone - the request itself stays, but its contact info is gone for good.`)) {
      return;
    }
    const previous = requests;
    mutateRequests(
      previous.map(r => r.id === id ? { ...r, name: '', email: '' } : r),
      { revalidate: false }
    );

    try {
      const res = await fetch('/api/proxy/resume/redact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast({ title: "Redacted", description: "Name and email cleared." });
        mutateRequests();
      } else {
        const errorData = await res.json();
        toast({ title: "Error", description: errorData.error || "Failed to redact request", variant: "destructive" });
        mutateRequests(previous, { revalidate: false });
      }
    } catch {
      toast({ title: "Error", description: 'Network error', variant: "destructive" });
      mutateRequests(previous, { revalidate: false });
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
    .sort((a, b) => {
      let cmp: number;
      if (sortField === 'created_at') {
        cmp = a.created_at - b.created_at;
      } else {
        cmp = (a[sortField] || '').toLowerCase().localeCompare((b[sortField] || '').toLowerCase());
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="border-2 border-black rounded-[0.5rem] h-9 bg-white font-bold text-sm">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                Columns
              </Button>
            }
          />
          <DropdownMenuContent align="end" className={menuContentClass}>
            {OPTIONAL_COLUMNS.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={visibleColumns.has(c.key)}
                onCheckedChange={() => toggleColumn(c.key)}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
                <SortableHead label="Requester" field="name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Email</TableHead>
                <SortableHead label="Company" field="company" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                {activeOptionalColumns.map((c) => (
                  <TableHead key={c.key} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">{c.label}</TableHead>
                ))}
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">AI Verdict</TableHead>
                <SortableHead label="Requested" field="created_at" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(req => {
                // Retention sweep anonymizes name/email 30 days after
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
                    <TableCell className="text-sm text-[var(--ds-charcoal)]/80">
                      {isAnonymized ? <span className="text-[var(--ds-charcoal)]/40">—</span> : req.email}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--ds-charcoal)]/80">{req.company || '—'}</TableCell>
                    {activeOptionalColumns.map((c) => (
                      <TableCell key={c.key} className="text-sm text-[var(--ds-charcoal)]/80">{req[c.key] || '—'}</TableCell>
                    ))}
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
                          <DropdownMenuItem onClick={() => window.open(`/resume/status/${req.id}`, '_blank', 'noopener,noreferrer')}>
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                            View status page
                          </DropdownMenuItem>
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
                          {isAdmin && !isAnonymized && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => handleRedact(req.id, req.name)}>
                                Delete (redact name &amp; email)
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

                  {(viewing.work_type || viewing.hiring_agency || viewing.industry || viewing.salary_range) && (
                    <div className="flex flex-wrap gap-1.5">
                      {viewing.work_type && <Badge variant="outline" className={badgePill}>{viewing.work_type}</Badge>}
                      {viewing.industry && <Badge variant="outline" className={badgePill}>{viewing.industry}</Badge>}
                      {viewing.salary_range && <Badge variant="outline" className={badgePill}>{viewing.salary_range}</Badge>}
                      {viewing.hiring_agency && <Badge variant="outline" className={badgePill}>via {viewing.hiring_agency}</Badge>}
                    </div>
                  )}

                  {viewing.job_posting_url && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70 mb-1">Job posting URL</p>
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-[var(--ds-charcoal)]/70 break-all flex-1">{viewing.job_posting_url}</span>
                        <button
                          type="button"
                          onClick={() => copyJobUrl(viewing.job_posting_url!)}
                          className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70 hover:text-black"
                        >
                          {copiedJobUrl ? <Check className="w-3 h-3" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                          {copiedJobUrl ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-[10px] text-[var(--ds-charcoal)]/50 mt-1">
                        Not auto-linked - a submitted URL is untrusted input. Copy it and check it before opening.
                      </p>
                    </div>
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
                {isAdmin && !isAnonymized && (
                  <SheetFooter className="flex-row justify-end gap-3">
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 mr-auto"
                      onClick={() => handleRedact(viewing.id, viewing.name)}
                    >
                      Delete
                    </Button>
                    {viewing.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleAction(viewing.id, 'reject')}
                        >
                          Reject
                        </Button>
                        <Button
                          className={`border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none ${pushBtnSm} bg-black text-white rounded-[0.5rem]`}
                          onClick={() => openApproveDialog(viewing.id, viewing.name)}
                        >
                          Approve &amp; Email Link
                        </Button>
                      </>
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
              Use <code className="bg-black/5 px-1 rounded text-[var(--ds-charcoal)]">{"{{name}}"}</code> and <code className="bg-black/5 px-1 rounded text-[var(--ds-charcoal)]">{"{{link}}"}</code> as template variables - <code className="bg-black/5 px-1 rounded text-[var(--ds-charcoal)]">{"{{link}}"}</code> expands to a list if more than one resume is checked below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Attach</label>
              {resumeFiles.length === 0 ? (
                <p className="text-sm text-[var(--ds-charcoal)]/60">
                  No resume files uploaded yet - add one from the &quot;Upload Attachment&quot; button on this page first.
                </p>
              ) : (
                <ul className="border-2 border-black divide-y-2 divide-black" style={{ borderRadius: '0.5rem', overflow: 'hidden' }}>
                  {resumeFiles.map((file) => (
                    <li key={file.path} className="flex items-center gap-2 px-3 py-2">
                      <input
                        type="checkbox"
                        id={`attach-${file.path}`}
                        checked={selectedResumePaths.includes(file.path)}
                        onChange={() => toggleResumePath(file.path)}
                        className="accent-black"
                      />
                      <label htmlFor={`attach-${file.path}`} className="text-sm font-bold flex-1 min-w-0 truncate cursor-pointer">
                        {file.name}
                      </label>
                      {file.path === activeResumePath && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/50 shrink-0">Active</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {selectedResumePaths.length === 0 && (
                <p className="text-xs font-bold text-red-600">Select at least one resume to send.</p>
              )}
            </div>
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
              onClick={() => handleAction(approveDialog.reqId!, 'approve', emailSubject, emailBody, selectedResumePaths)}
              disabled={selectedResumePaths.length === 0}
              className={`px-5 py-2 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none ${pushBtnSm} bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0`}
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
