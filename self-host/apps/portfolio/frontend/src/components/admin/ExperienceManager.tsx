'use client';
import { useState, useEffect, useRef } from 'react';
import { Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import MonthYearPicker from '@/components/admin/MonthYearPicker';
import TagList from '@/components/admin/TagList';
import StatusToggle from '@/components/admin/StatusToggle';
import { formatDateRange, formatDuration } from '@/lib/date-range';

const RequiredMark = () => <span className="text-red-600" aria-hidden="true"> *</span>;

type Position = {
  id: string;
  title: string;
  employment_type: string;
  start_date: string;
  end_date: string;
  bullets: string[];
  tech_tags: string[];
};
type Company = {
  id: string;
  company: string;
  location: string;
  location_type: string;
  positions: Position[];
  status: string;
};

const fieldClass =
  'border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow h-9';

const selectClass =
  'border-2 border-black rounded-[0.375rem] px-2 h-9 text-sm bg-white text-[var(--ds-charcoal)] focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed';

const emptyPosition = (): Position => ({
  id: Math.random().toString(36).substring(2, 8),
  title: '', employment_type: 'Full-time', start_date: '', end_date: '', bullets: [], tech_tags: [],
});

function ExperienceCardPreview({ company }: { company: Company }) {
  return (
    <div className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white p-6 sm:p-8" style={{ borderRadius: '0.75rem' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-5">
        <h3 className="text-xl font-extrabold" style={{ fontFamily: 'var(--ds-font-display)' }}>
          {company.company || 'Untitled company'}
        </h3>
        {company.location && (
          <span className="text-sm text-[var(--ds-charcoal)]/70">
            {company.location}
            {company.location_type && ` (${company.location_type})`}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {company.positions.map((pos, pi) => (
          <div key={pos.id} className={pi > 0 ? 'pt-6 border-t-2 border-black/10' : ''}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
              <h4 className="font-bold">
                {pos.title || 'Untitled position'}
                {pos.employment_type && (
                  <span className="font-medium text-[var(--ds-charcoal)]/60"> &middot; {pos.employment_type}</span>
                )}
              </h4>
              <span className="text-xs font-mono text-[var(--ds-charcoal)]/60 whitespace-nowrap">
                {formatDateRange(pos.start_date, pos.end_date)}
                {formatDuration(pos.start_date, pos.end_date) && (
                  <> &middot; {formatDuration(pos.start_date, pos.end_date)}</>
                )}
              </span>
            </div>

            {pos.bullets.filter(Boolean).length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm text-[var(--ds-charcoal)]/80 list-disc list-inside">
                {pos.bullets.filter(Boolean).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}

            {pos.tech_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {pos.tech_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-bold px-2.5 py-1 border-2 border-black"
                    style={{ borderRadius: '0.375rem' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExperienceManager({ isAdmin, onDirtyChange }: { isAdmin: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [baseline, setBaseline] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    const url = isAdmin ? '/api/proxy/cms?type=experience' : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085'}/api/experience`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { const d = data || []; setCompanies(d); setBaseline(d); })
      .catch(console.error);
  }, [isAdmin]);

  const isDirty = JSON.stringify(companies) !== JSON.stringify(baseline);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const validate = (): { message: string; key: string }[] => {
    const errors: { message: string; key: string }[] = [];
    companies.forEach((co, i) => {
      if (co.status !== 'published') return;
      if (!co.company.trim()) errors.push({ message: `Company #${i + 1} needs a name.`, key: `co-${i}` });
      co.positions.forEach((p, pi) => {
        if (!p.title.trim()) errors.push({ message: `"${co.company || `Company #${i + 1}`}" position #${pi + 1} needs a title.`, key: `pos-${i}-${pi}` });
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
        body: JSON.stringify({ type: 'experience', payload: companies }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Saved Experience to Redis!' });
        setBaseline(companies);
      } else {
        const body = await res.json().catch(() => null);
        toast({ title: 'Error', description: body?.error || 'Failed to save Experience.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const addCompany = () => {
    setCompanies([
      { id: Math.random().toString(36).substring(2, 8), company: '', location: '', location_type: 'Remote', positions: [emptyPosition()], status: 'draft' },
      ...companies,
    ]);
  };

  const removeCompany = (i: number) => setCompanies(companies.filter((_, idx) => idx !== i));

  const addPosition = (ci: number) => {
    const n = [...companies];
    n[ci].positions = [...n[ci].positions, emptyPosition()];
    setCompanies(n);
  };

  const removePosition = (ci: number, pi: number) => {
    const n = [...companies];
    n[ci].positions = n[ci].positions.filter((_, i) => i !== pi);
    setCompanies(n);
  };

  const updatePosition = (ci: number, pi: number, patch: Partial<Position>) => {
    const n = [...companies];
    n[ci].positions[pi] = { ...n[ci].positions[pi], ...patch };
    setCompanies(n);
  };

  return (
    <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '0.75rem' }}>
      <div className="p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b-2 border-black">
        <div>
          <h2 className="text-xl font-extrabold mb-1">Experience</h2>
          <p className="text-sm text-[var(--ds-charcoal)]/70">A company can have multiple positions (e.g. a promotion).</p>
        </div>
        <Button
          onClick={addCompany}
          disabled={!isAdmin}
          variant="outline"
          className="border-2 border-black rounded-[0.5rem] font-bold hover:bg-black hover:text-white whitespace-nowrap"
        >
          + Add Company
        </Button>
      </div>

      {companies.length === 0 ? (
        <div className="p-12 text-sm text-[var(--ds-charcoal)]/60 text-center">
          No companies yet. Click &quot;Add Company&quot; to begin.
        </div>
      ) : (
        <div className="divide-y-2 divide-black">
          {companies.map((co, ci) => (
            <div key={co.id}>
              <div className="p-6 pb-4 bg-[var(--ds-sage)]/15 space-y-3">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`co-name-${ci}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                      Company name<RequiredMark />
                    </Label>
                    <Input
                      id={`co-name-${ci}`}
                      ref={(el) => { fieldRefs.current[`co-${ci}`] = el; }}
                      value={co.company}
                      onChange={(e) => { const n = [...companies]; n[ci].company = e.target.value; setCompanies(n); }}
                      className={`font-bold ${fieldClass}`}
                      placeholder="Acme Corp"
                      disabled={!isAdmin}
                    />
                  </div>
                  <StatusToggle value={co.status} onChange={(v) => { const n = [...companies]; n[ci].status = v; setCompanies(n); }} disabled={!isAdmin} />
                  <div className="flex gap-1 shrink-0">
                    <Button
                      onClick={() => setPreviewIndex(ci)}
                      variant="ghost"
                      size="icon"
                      aria-label="Preview"
                      className="border-2 border-transparent hover:border-black rounded-[0.5rem]"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => removeCompany(ci)}
                      disabled={!isAdmin}
                      variant="destructive"
                      size="icon"
                      aria-label="Remove company"
                      className="border-2 border-black rounded-[0.5rem]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`co-loc-${ci}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                      Location
                    </Label>
                    <Input
                      id={`co-loc-${ci}`}
                      value={co.location}
                      onChange={(e) => { const n = [...companies]; n[ci].location = e.target.value; setCompanies(n); }}
                      className={fieldClass}
                      placeholder="Singapore"
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="w-36 space-y-1.5">
                    <Label htmlFor={`co-loctype-${ci}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                      Location type
                    </Label>
                    <select
                      id={`co-loctype-${ci}`}
                      value={co.location_type}
                      onChange={(e) => { const n = [...companies]; n[ci].location_type = e.target.value; setCompanies(n); }}
                      className={`w-full ${selectClass}`}
                      disabled={!isAdmin}
                    >
                      <option value="Remote">Remote</option>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-5 space-y-6">
                {co.positions.map((pos, pi) => (
                  <div key={pos.id} className={pi > 0 ? 'pt-6 border-t-2 border-black/10 space-y-3' : 'space-y-3'}>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor={`pos-title-${ci}-${pi}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                          Position title<RequiredMark />
                        </Label>
                        <Input
                          id={`pos-title-${ci}-${pi}`}
                          ref={(el) => { fieldRefs.current[`pos-${ci}-${pi}`] = el; }}
                          value={pos.title}
                          onChange={(e) => updatePosition(ci, pi, { title: e.target.value })}
                          className={`font-bold ${fieldClass}`}
                          placeholder="Backend Engineer"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="w-36 space-y-1.5">
                        <Label htmlFor={`pos-type-${ci}-${pi}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                          Employment type
                        </Label>
                        <select
                          id={`pos-type-${ci}-${pi}`}
                          value={pos.employment_type}
                          onChange={(e) => updatePosition(ci, pi, { employment_type: e.target.value })}
                          className={`w-full ${selectClass}`}
                          disabled={!isAdmin}
                        >
                          <option>Full-time</option>
                          <option>Part-time</option>
                          <option>Contract</option>
                          <option>Internship</option>
                        </select>
                      </div>
                      <Button
                        onClick={() => removePosition(ci, pi)}
                        disabled={!isAdmin}
                        variant="ghost"
                        size="icon"
                        aria-label="Remove position"
                        className="shrink-0 border-2 border-transparent hover:border-black rounded-[0.5rem] text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex gap-4">
                      <MonthYearPicker
                        label="Start"
                        value={pos.start_date}
                        onChange={(v) => updatePosition(ci, pi, { start_date: v })}
                        disabled={!isAdmin}
                      />
                      <MonthYearPicker
                        label="End"
                        value={pos.end_date}
                        onChange={(v) => updatePosition(ci, pi, { end_date: v })}
                        disabled={!isAdmin}
                        allowOngoing
                        ongoingLabel="Current position"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`pos-bullets-${ci}-${pi}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                        Bullets (one per line)
                      </Label>
                      <Textarea
                        id={`pos-bullets-${ci}-${pi}`}
                        value={pos.bullets.join('\n')}
                        onChange={(e) => updatePosition(ci, pi, { bullets: e.target.value.split('\n') })}
                        className="border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow min-h-[80px]"
                        placeholder={'Design and build X.\nMaintain Y.'}
                        disabled={!isAdmin}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`pos-tags-${ci}-${pi}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                        Tech tags
                      </Label>
                      <TagList
                        id={`pos-tags-${ci}-${pi}`}
                        values={pos.tech_tags}
                        onChange={(v) => updatePosition(ci, pi, { tech_tags: v })}
                        className={`text-xs ${fieldClass}`}
                        placeholder="Go, PostgreSQL, Docker..."
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                ))}
                <Button
                  onClick={() => addPosition(ci)}
                  disabled={!isAdmin}
                  variant="ghost"
                  className="text-xs font-bold underline px-0 hover:bg-transparent"
                >
                  + Add position at this company
                </Button>
              </div>
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
          {loading ? 'Saving...' : 'Save Experience'}
        </Button>
      </div>

      <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <DialogContent
          className="sm:max-w-xl bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-black font-extrabold">Card preview</DialogTitle>
            <DialogDescription className="text-[var(--ds-charcoal)]/70">
              Unsaved changes — this is exactly how the card renders on the <code className="bg-black/5 px-1 rounded text-[var(--ds-charcoal)]">/about</code> page.
              {previewIndex !== null && companies[previewIndex]?.status !== 'published' && (
                <span className="block mt-2 font-bold text-black">This company is a Draft and won&apos;t appear on the live site until Published.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {previewIndex !== null && companies[previewIndex] && <ExperienceCardPreview company={companies[previewIndex]} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
