'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { MoreVertical, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
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

type Lead = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string; // new, contacted, archived
  created_at: number;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Request to ${url} failed: ${res.status}`);
  return res.json();
};

const badgePill = 'border-2 border-black rounded-full text-[10px] font-bold uppercase tracking-wider px-2 py-0.5';

const menuContentClass =
  'border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] bg-white text-[var(--ds-charcoal)] p-1';

const statusStyle: Record<string, { bg: string; label: string }> = {
  new: { bg: 'var(--ds-yellow)', label: 'New' },
  contacted: { bg: 'var(--ds-sage)', label: 'Contacted' },
  archived: { bg: '#e5e5e5', label: 'Archived' },
};

function StatusBadge({ status }: { status: string }) {
  const style = statusStyle[status];
  return (
    <Badge variant="outline" className={badgePill} style={{ backgroundColor: style?.bg || 'var(--ds-white)' }}>
      {style?.label || status}
    </Badge>
  );
}

export default function LeadsManager({ isAdmin }: { isAdmin: boolean }) {
  const { data: leads = [], isLoading: loading, mutate: mutateLeads } = useSWR<Lead[]>('/api/proxy/leads', fetcher);

  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const { toast } = useToast();

  const setStatus = async (id: string, status: string) => {
    if (!isAdmin) return;
    const previous = leads;
    mutateLeads(previous.map((l) => (l.id === id ? { ...l, status } : l)), { revalidate: false });

    try {
      const res = await fetch('/api/proxy/leads/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        mutateLeads();
      } else {
        const errorData = await res.json();
        toast({ title: 'Error', description: errorData.error || 'Failed to update status', variant: 'destructive' });
        mutateLeads(previous, { revalidate: false });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
      mutateLeads(previous, { revalidate: false });
    }
  };

  // Soft delete: clears name/email/message on demand, the same fields the
  // 30-day retention sweep clears automatically (see backend/leads.go
  // runLeadRetentionSweep) - the row and its status stay.
  const handleRedact = async (id: string, label: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`Redact ${label || 'this lead'}'s name, email, and message? This can't be undone.`)) {
      return;
    }
    const previous = leads;
    mutateLeads(previous.map((l) => (l.id === id ? { ...l, name: '', email: '', message: '' } : l)), { revalidate: false });

    try {
      const res = await fetch('/api/proxy/leads/redact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast({ title: 'Redacted', description: 'Name, email, and message cleared.' });
        mutateLeads();
      } else {
        const errorData = await res.json();
        toast({ title: 'Error', description: errorData.error || 'Failed to redact lead', variant: 'destructive' });
        mutateLeads(previous, { revalidate: false });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
      mutateLeads(previous, { revalidate: false });
    }
  };

  if (loading) return (
    <div role="status" aria-live="polite" className="text-sm font-bold text-[var(--ds-charcoal)]/70 p-8 text-center bg-white border-2 border-black" style={{ borderRadius: '0.75rem' }}>
      Loading leads&hellip;
    </div>
  );

  const filtered = leads.filter((l) => statusFilter === 'all' || l.status === statusFilter);
  const viewing = leads.find((l) => l.id === viewingId) || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="border-2 border-black rounded-[0.5rem] h-9 bg-white font-bold text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className={menuContentClass}>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs font-bold text-[var(--ds-charcoal)]/70 ml-auto">
          {filtered.length} of {leads.length}
        </span>
      </div>

      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '0.75rem' }}>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--ds-charcoal)]/70">
            No leads match these filters.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[var(--ds-yellow)]/40">
              <TableRow className="border-b-2 border-black hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Name</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Email</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Message</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]">Submitted</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => {
                // Retention sweep anonymizes name/email/message 30 days
                // after submission (see backend/leads.go
                // runLeadRetentionSweep) - it never deletes the row.
                const isAnonymized = !lead.name && !lead.email && !lead.message;
                return (
                  <TableRow key={lead.id} className="border-b-2 border-black/10 last:border-b-0">
                    <TableCell className="whitespace-normal">
                      <Button
                        variant="link"
                        className="px-0 h-auto font-extrabold text-[var(--ds-charcoal)]"
                        onClick={() => setViewingId(lead.id)}
                      >
                        {isAnonymized ? <span className="italic font-normal text-[var(--ds-charcoal)]/70">Anonymized</span> : (lead.name || '—')}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--ds-charcoal)]/80">
                      {isAnonymized ? <span className="text-[var(--ds-charcoal)]/40">—</span> : lead.email}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--ds-charcoal)]/80 max-w-[280px] truncate">
                      {isAnonymized ? <span className="text-[var(--ds-charcoal)]/40">—</span> : (lead.message || '—')}
                    </TableCell>
                    <TableCell><StatusBadge status={lead.status} /></TableCell>
                    <TableCell className="text-xs font-mono text-[var(--ds-charcoal)]/70 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString()}
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
                          <DropdownMenuItem onClick={() => setViewingId(lead.id)}>View details</DropdownMenuItem>
                          {isAdmin && !isAnonymized && (
                            <DropdownMenuItem onClick={() => window.location.assign(`mailto:${lead.email}`)}>
                              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                              Email lead
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              {lead.status !== 'new' && <DropdownMenuItem onClick={() => setStatus(lead.id, 'new')}>Mark as new</DropdownMenuItem>}
                              {lead.status !== 'contacted' && <DropdownMenuItem onClick={() => setStatus(lead.id, 'contacted')}>Mark as contacted</DropdownMenuItem>}
                              {lead.status !== 'archived' && <DropdownMenuItem onClick={() => setStatus(lead.id, 'archived')}>Archive</DropdownMenuItem>}
                            </>
                          )}
                          {isAdmin && !isAnonymized && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => handleRedact(lead.id, lead.name || lead.email)}>
                                Delete (redact PII)
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

      <Sheet open={!!viewing} onOpenChange={(open) => !open && setViewingId(null)}>
        <SheetContent className="bg-white border-l-2 border-black text-[var(--ds-charcoal)] w-full sm:max-w-md overflow-y-auto" style={{ fontFamily: 'var(--ds-font-body)' }}>
          {viewing && (() => {
            const isAnonymized = !viewing.name && !viewing.email && !viewing.message;
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-black font-extrabold text-xl">
                    {isAnonymized ? 'Anonymized lead' : (viewing.name || 'No name given')}
                  </SheetTitle>
                  <SheetDescription>
                    {isAnonymized ? 'Contact info erased 30 days after submission.' : viewing.email}
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 flex flex-col gap-4 text-sm">
                  <StatusBadge status={viewing.status} />

                  {!isAnonymized && viewing.message && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70 mb-1">Message</p>
                      <p className="bg-black/5 p-3 italic" style={{ borderRadius: '0.5rem' }}>&ldquo;{viewing.message}&rdquo;</p>
                    </div>
                  )}

                  <div className="text-xs text-[var(--ds-charcoal)]/70 font-mono pt-2 border-t-2 border-black/10">
                    Submitted: {new Date(viewing.created_at).toLocaleString()}
                  </div>
                </div>
                {isAdmin && !isAnonymized && (
                  <SheetFooter className="flex-row justify-end gap-3">
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 mr-auto"
                      onClick={() => handleRedact(viewing.id, viewing.name || viewing.email)}
                    >
                      Delete
                    </Button>
                    <Button
                      className="border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-0.5 hover:translate-y-0.5 bg-black text-white rounded-[0.5rem]"
                      onClick={() => window.location.assign(`mailto:${viewing.email}`)}
                    >
                      <Mail className="w-4 h-4" aria-hidden="true" />
                      Email lead
                    </Button>
                  </SheetFooter>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
