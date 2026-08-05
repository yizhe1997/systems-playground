'use client';
import { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import StatusToggle from '@/components/admin/StatusToggle';

type CreditItem = { text: string; url: string };
type CreditRow = { id: string; label: string; items: CreditItem[]; status: string };

const RequiredMark = () => <span className="text-red-600" aria-hidden="true"> *</span>;

const fieldClass =
  'border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow h-9';

const formatUrl = (url: string) => {
  if (!url) return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

function CreditRowPreview({ row }: { row: CreditRow }) {
  return (
    <div className="p-8" style={{ backgroundColor: 'var(--ds-charcoal)', borderRadius: '0.75rem' }}>
      <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[160px_1fr] gap-x-6 gap-y-1 items-start">
        <span className="text-right text-white/40 text-sm font-medium pt-0.5">{row.label || 'Label'}</span>
        <div className="flex flex-col gap-1">
          {row.items.length === 0 && <span className="text-white/40 text-sm italic">No items yet</span>}
          {row.items.map((item, idx) =>
            item.url ? (
              <a
                key={idx}
                href={formatUrl(item.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline underline-offset-2 decoration-white/30 hover:decoration-[var(--ds-yellow)] hover:text-[var(--ds-yellow)] transition-colors text-sm w-fit"
              >
                {item.text || 'Untitled item'}
              </a>
            ) : (
              <span key={idx} className="text-white/70 text-sm">{item.text || 'Untitled item'}</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreditsManager({ isAdmin, onDirtyChange }: { isAdmin: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const [rows, setRows] = useState<CreditRow[]>([]);
  const [baseline, setBaseline] = useState<CreditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    const url = isAdmin ? '/api/proxy/cms?type=credits' : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085'}/api/credits`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { const d = data || []; setRows(d); setBaseline(d); })
      .catch(console.error);
  }, [isAdmin]);

  const isDirty = JSON.stringify(rows) !== JSON.stringify(baseline);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const validate = (): { message: string; key: string }[] => {
    const errors: { message: string; key: string }[] = [];
    rows.forEach((row, i) => {
      if (row.status !== 'published') return;
      if (!row.label.trim()) errors.push({ message: `Row #${i + 1} needs a label.`, key: `row-${i}` });
      row.items.forEach((it, ji) => {
        if (!it.text.trim()) errors.push({ message: `"${row.label || `Row #${i + 1}`}" item #${ji + 1} needs text.`, key: `item-${i}-${ji}` });
      });
    });
    return errors;
  };

  const save = async () => {
    if (!isAdmin) return;
    const errors = validate();
    if (errors.length > 0) {
      toast({
        title: errors.length === 1 ? 'Missing required field' : `${errors.length} required fields missing`,
        description: errors.map((e) => e.message).join(' '),
        variant: 'destructive',
      });
      const el = fieldRefs.current[errors[0].key];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'credits', payload: rows }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Saved Credits to Redis!' });
        setBaseline(rows);
      } else {
        const body = await res.json().catch(() => null);
        toast({ title: 'Error', description: body?.error || 'Failed to save Credits.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const addRow = () => {
    setRows([...rows, { id: Math.random().toString(36).substring(2, 8), label: '', items: [], status: 'draft' }]);
  };

  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const moveRow = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const n = [...rows];
    [n[i], n[j]] = [n[j], n[i]];
    setRows(n);
  };

  const updateRow = (i: number, patch: Partial<CreditRow>) => {
    const n = [...rows];
    n[i] = { ...n[i], ...patch };
    setRows(n);
  };

  const addItem = (i: number) => {
    const n = [...rows];
    n[i].items = [...n[i].items, { text: '', url: '' }];
    setRows(n);
  };

  const removeItem = (i: number, j: number) => {
    const n = [...rows];
    n[i].items = n[i].items.filter((_, idx) => idx !== j);
    setRows(n);
  };

  const updateItem = (i: number, j: number, patch: Partial<CreditItem>) => {
    const n = [...rows];
    n[i].items[j] = { ...n[i].items[j], ...patch };
    setRows(n);
  };

  return (
    <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '0.75rem' }}>
      <div className="p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b-2 border-black">
        <div>
          <h2 className="text-xl font-extrabold mb-1">Credits</h2>
          <p className="text-sm text-[var(--ds-charcoal)]/70">
            Shown on the homepage after Docs (e.g. &quot;Crafted by&quot;, &quot;Inspired by&quot;, &quot;Deployed on&quot;). Leave an item&apos;s URL blank for plain text.
          </p>
        </div>
        <Button
          onClick={addRow}
          disabled={!isAdmin}
          variant="outline"
          className="border-2 border-black rounded-[0.5rem] font-bold hover:bg-black hover:text-white whitespace-nowrap"
        >
          + Add Row
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="p-12 text-sm text-[var(--ds-charcoal)]/60 text-center">
          No rows yet. Click &quot;Add Row&quot; to begin (e.g. &quot;Crafted by&quot;, &quot;Inspired by&quot;).
        </div>
      ) : (
        <div className="divide-y-2 divide-black">
          {rows.map((row, i) => (
            <div key={row.id} className="p-6 space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`cred-label-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    Row label<RequiredMark />
                  </Label>
                  <Input
                    id={`cred-label-${i}`}
                    ref={(el) => { fieldRefs.current[`row-${i}`] = el; }}
                    value={row.label}
                    onChange={(e) => updateRow(i, { label: e.target.value })}
                    className={`font-bold ${fieldClass}`}
                    placeholder="Crafted by"
                    disabled={!isAdmin}
                  />
                </div>
                <StatusToggle value={row.status} onChange={(v) => updateRow(i, { status: v })} disabled={!isAdmin} />
                <div className="flex gap-1 shrink-0">
                  <Button
                    onClick={() => moveRow(i, -1)}
                    disabled={!isAdmin || i === 0}
                    variant="ghost"
                    size="icon"
                    aria-label="Move up"
                    className="border-2 border-transparent hover:border-black rounded-[0.5rem]"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => moveRow(i, 1)}
                    disabled={!isAdmin || i === rows.length - 1}
                    variant="ghost"
                    size="icon"
                    aria-label="Move down"
                    className="border-2 border-transparent hover:border-black rounded-[0.5rem]"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setPreviewIndex(i)}
                    variant="ghost"
                    size="icon"
                    aria-label="Preview"
                    className="border-2 border-transparent hover:border-black rounded-[0.5rem]"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => removeRow(i)}
                    disabled={!isAdmin}
                    variant="destructive"
                    size="icon"
                    aria-label="Remove row"
                    className="border-2 border-black rounded-[0.5rem]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {row.items.length > 0 && (
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/50">Text<RequiredMark /></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/50">URL (optional)</span>
                  <span />
                  {row.items.map((item, j) => (
                    <div key={j} className="contents">
                      <Input
                        ref={(el) => { fieldRefs.current[`item-${i}-${j}`] = el; }}
                        value={item.text}
                        onChange={(e) => updateItem(i, j, { text: e.target.value })}
                        className={`text-sm ${fieldClass}`}
                        placeholder="Vercel"
                        disabled={!isAdmin}
                      />
                      <Input
                        value={item.url}
                        onChange={(e) => updateItem(i, j, { url: e.target.value })}
                        className={`text-xs ${fieldClass}`}
                        placeholder="https://vercel.com"
                        disabled={!isAdmin}
                      />
                      <Button
                        onClick={() => removeItem(i, j)}
                        disabled={!isAdmin}
                        variant="ghost"
                        size="icon"
                        aria-label="Remove item"
                        className="border-2 border-transparent hover:border-black rounded-[0.5rem] text-red-600 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => addItem(i)}
                disabled={!isAdmin}
                variant="ghost"
                className="text-xs font-bold underline px-4 hover:bg-transparent"
              >
                + Add item
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="p-6 border-t-2 border-black">
        <Button
          onClick={save}
          disabled={!isAdmin || loading || !isDirty}
          className="px-5 h-10 text-sm font-bold border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-all bg-black text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? 'Saving...' : 'Save Credits'}
        </Button>
      </div>

      <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <DialogContent
          className="sm:max-w-md bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-black font-extrabold">Row preview</DialogTitle>
            <DialogDescription className="text-[var(--ds-charcoal)]/70">
              Unsaved changes — the Credits section sits on a dark background on the homepage, shown here for context.
              {previewIndex !== null && rows[previewIndex]?.status !== 'published' && (
                <span className="block mt-2 font-bold text-black">This row is a Draft and won&apos;t appear on the live site until Published.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {previewIndex !== null && rows[previewIndex] && <CreditRowPreview row={rows[previewIndex]} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
