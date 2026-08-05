'use client';
import { useState, useEffect, useRef } from 'react';
import { Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import MonthYearPicker from '@/components/admin/MonthYearPicker';
import TagList from '@/components/admin/TagList';
import StatusToggle from '@/components/admin/StatusToggle';
import { formatDateRange } from '@/lib/date-range';

const RequiredMark = () => <span className="text-red-600" aria-hidden="true"> *</span>;

type Education = {
  id: string;
  school: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  highlights: string[];
  status: string;
};

const fieldClass =
  'border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow h-9';

function EducationCardPreview({ education }: { education: Education }) {
  return (
    <div className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white p-6 max-w-sm" style={{ borderRadius: '0.75rem' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-extrabold" style={{ fontFamily: 'var(--ds-font-display)' }}>
          {education.school || 'Untitled school'}
        </h3>
        <span className="text-xs font-mono text-[var(--ds-charcoal)]/60 whitespace-nowrap">
          {formatDateRange(education.start_date, education.end_date)}
        </span>
      </div>
      {(education.degree || education.field_of_study) && (
        <p className="text-sm text-[var(--ds-charcoal)]/80 mt-1">
          {[education.degree, education.field_of_study].filter(Boolean).join(' — ')}
        </p>
      )}
      {education.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {education.highlights.map((h) => (
            <span key={h} className="text-xs font-bold px-2.5 py-1 border-2 border-black" style={{ borderRadius: '0.375rem' }}>
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EducationManager({ isAdmin, onDirtyChange }: { isAdmin: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const [schools, setSchools] = useState<Education[]>([]);
  const [baseline, setBaseline] = useState<Education[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fieldRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    const url = isAdmin ? '/api/proxy/cms?type=education' : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085'}/api/education`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { const d = data || []; setSchools(d); setBaseline(d); })
      .catch(console.error);
  }, [isAdmin]);

  const isDirty = JSON.stringify(schools) !== JSON.stringify(baseline);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const validate = (): { message: string; index: number }[] =>
    schools
      .map((s, i) => (s.status === 'published' && !s.school.trim() ? { message: `Education #${i + 1} needs a school.`, index: i } : null))
      .filter((e): e is { message: string; index: number } => e !== null);

  const save = async () => {
    if (!isAdmin) return;
    const errors = validate();
    if (errors.length > 0) {
      toast({
        title: errors.length === 1 ? 'Missing required field' : `${errors.length} required fields missing`,
        description: errors.map((e) => e.message).join(' '),
        variant: 'destructive',
      });
      const el = fieldRefs.current[errors[0].index];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'education', payload: schools }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Saved Education to Redis!' });
        setBaseline(schools);
      } else {
        const body = await res.json().catch(() => null);
        toast({ title: 'Error', description: body?.error || 'Failed to save Education.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const addSchool = () => {
    setSchools([
      { id: Math.random().toString(36).substring(2, 8), school: '', degree: '', field_of_study: '', start_date: '', end_date: '', highlights: [], status: 'draft' },
      ...schools,
    ]);
  };

  const removeSchool = (i: number) => setSchools(schools.filter((_, idx) => idx !== i));

  const update = (i: number, patch: Partial<Education>) => {
    const n = [...schools];
    n[i] = { ...n[i], ...patch };
    setSchools(n);
  };

  return (
    <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '0.75rem' }}>
      <div className="p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b-2 border-black">
        <div>
          <h2 className="text-xl font-extrabold mb-1">Education</h2>
          <p className="text-sm text-[var(--ds-charcoal)]/70">Schools and degrees shown on the About page.</p>
        </div>
        <Button
          onClick={addSchool}
          disabled={!isAdmin}
          variant="outline"
          className="border-2 border-black rounded-[0.5rem] font-bold hover:bg-black hover:text-white whitespace-nowrap"
        >
          + Add School
        </Button>
      </div>

      {schools.length === 0 ? (
        <div className="p-12 text-sm text-[var(--ds-charcoal)]/60 text-center">
          No schools yet. Click &quot;Add School&quot; to begin.
        </div>
      ) : (
        <div className="divide-y-2 divide-black">
          {schools.map((s, i) => (
            <div key={s.id} className="p-6 space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`school-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    School name<RequiredMark />
                  </Label>
                  <Input
                    id={`school-${i}`}
                    ref={(el) => { fieldRefs.current[i] = el; }}
                    value={s.school}
                    onChange={(e) => update(i, { school: e.target.value })}
                    className={`font-bold ${fieldClass}`}
                    placeholder="National University of Singapore"
                    disabled={!isAdmin}
                  />
                </div>
                <StatusToggle value={s.status} onChange={(v) => update(i, { status: v })} disabled={!isAdmin} />
                <div className="flex gap-1 shrink-0">
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
                    onClick={() => removeSchool(i)}
                    disabled={!isAdmin}
                    variant="destructive"
                    size="icon"
                    aria-label="Remove school"
                    className="border-2 border-black rounded-[0.5rem]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`degree-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    Degree
                  </Label>
                  <Input
                    id={`degree-${i}`}
                    value={s.degree}
                    onChange={(e) => update(i, { degree: e.target.value })}
                    className={fieldClass}
                    placeholder="Bachelor's degree"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`field-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    Field of study
                  </Label>
                  <Input
                    id={`field-${i}`}
                    value={s.field_of_study}
                    onChange={(e) => update(i, { field_of_study: e.target.value })}
                    className={fieldClass}
                    placeholder="Computer Science"
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <MonthYearPicker
                  label="Start"
                  value={s.start_date}
                  onChange={(v) => update(i, { start_date: v })}
                  disabled={!isAdmin}
                />
                <MonthYearPicker
                  label="End"
                  value={s.end_date}
                  onChange={(v) => update(i, { end_date: v })}
                  disabled={!isAdmin}
                  allowOngoing
                  ongoingLabel="Currently studying"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`highlights-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                  Highlights / coursework
                </Label>
                <TagList
                  id={`highlights-${i}`}
                  values={s.highlights}
                  onChange={(v) => update(i, { highlights: v })}
                  className={`text-xs ${fieldClass}`}
                  placeholder="Distributed Systems, Software Engineering..."
                  disabled={!isAdmin}
                />
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
          {loading ? 'Saving...' : 'Save Education'}
        </Button>
      </div>

      <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <DialogContent
          className="sm:max-w-md bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-black font-extrabold">Card preview</DialogTitle>
            <DialogDescription className="text-[var(--ds-charcoal)]/70">
              Unsaved changes — this is exactly how the card renders on the <code className="bg-black/5 px-1 rounded text-[var(--ds-charcoal)]">/about</code> page.
              {previewIndex !== null && schools[previewIndex]?.status !== 'published' && (
                <span className="block mt-2 font-bold text-black">This entry is a Draft and won&apos;t appear on the live site until Published.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {previewIndex !== null && schools[previewIndex] && <EducationCardPreview education={schools[previewIndex]} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
