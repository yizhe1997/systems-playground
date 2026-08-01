'use client';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MonthYearPicker from '@/components/admin/MonthYearPicker';

type Education = {
  id: string;
  school: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  highlights: string[];
};

const fieldClass =
  'border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow h-9';

export default function EducationManager({ isAdmin }: { isAdmin: boolean }) {
  const [schools, setSchools] = useState<Education[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
    fetch(`${url}/api/education`)
      .then((r) => r.json())
      .then((data) => setSchools(data || []))
      .catch(console.error);
  }, []);

  const save = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'education', payload: schools }),
      });
      if (res.ok) toast({ title: 'Success', description: 'Saved Education to Redis!' });
      else toast({ title: 'Error', description: 'Failed to save Education.', variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const addSchool = () => {
    setSchools([
      { id: Math.random().toString(36).substring(2, 8), school: '', degree: '', field_of_study: '', start_date: '', end_date: '', highlights: [] },
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
                    School name
                  </Label>
                  <Input
                    id={`school-${i}`}
                    value={s.school}
                    onChange={(e) => update(i, { school: e.target.value })}
                    className={`font-bold ${fieldClass}`}
                    placeholder="National University of Singapore"
                    disabled={!isAdmin}
                  />
                </div>
                <Button
                  onClick={() => removeSchool(i)}
                  disabled={!isAdmin}
                  variant="destructive"
                  size="icon"
                  aria-label="Remove school"
                  className="shrink-0 border-2 border-black rounded-[0.5rem]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
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
                  Highlights / coursework (comma separated)
                </Label>
                <Input
                  id={`highlights-${i}`}
                  value={s.highlights.join(', ')}
                  onChange={(e) => update(i, { highlights: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
                  className={`text-xs ${fieldClass}`}
                  placeholder="Distributed Systems, Software Engineering, DSA"
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
          disabled={!isAdmin || loading}
          className="px-5 h-10 text-sm font-bold border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-all bg-black text-white hover:bg-black"
        >
          {loading ? 'Saving...' : 'Save Education'}
        </Button>
      </div>
    </div>
  );
}
