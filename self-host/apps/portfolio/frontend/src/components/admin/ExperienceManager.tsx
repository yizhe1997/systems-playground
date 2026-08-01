'use client';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import MonthYearPicker from '@/components/admin/MonthYearPicker';

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
};

const fieldClass =
  'border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow h-9';

const selectClass =
  'border-2 border-black rounded-[0.375rem] px-2 h-9 text-sm bg-white text-[var(--ds-charcoal)] focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed';

const emptyPosition = (): Position => ({
  id: Math.random().toString(36).substring(2, 8),
  title: '', employment_type: 'Full-time', start_date: '', end_date: '', bullets: [], tech_tags: [],
});

export default function ExperienceManager({ isAdmin }: { isAdmin: boolean }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
    fetch(`${url}/api/experience`)
      .then((r) => r.json())
      .then((data) => setCompanies(data || []))
      .catch(console.error);
  }, []);

  const save = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'experience', payload: companies }),
      });
      if (res.ok) toast({ title: 'Success', description: 'Saved Experience to Redis!' });
      else toast({ title: 'Error', description: 'Failed to save Experience.', variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const addCompany = () => {
    setCompanies([
      { id: Math.random().toString(36).substring(2, 8), company: '', location: '', location_type: 'Remote', positions: [emptyPosition()] },
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
                      Company name
                    </Label>
                    <Input
                      id={`co-name-${ci}`}
                      value={co.company}
                      onChange={(e) => { const n = [...companies]; n[ci].company = e.target.value; setCompanies(n); }}
                      className={`font-bold ${fieldClass}`}
                      placeholder="Acme Corp"
                      disabled={!isAdmin}
                    />
                  </div>
                  <Button
                    onClick={() => removeCompany(ci)}
                    disabled={!isAdmin}
                    variant="destructive"
                    size="icon"
                    aria-label="Remove company"
                    className="shrink-0 border-2 border-black rounded-[0.5rem]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
                          Position title
                        </Label>
                        <Input
                          id={`pos-title-${ci}-${pi}`}
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
                        Tech tags (comma separated)
                      </Label>
                      <Input
                        id={`pos-tags-${ci}-${pi}`}
                        value={pos.tech_tags.join(', ')}
                        onChange={(e) => updatePosition(ci, pi, { tech_tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        className={`text-xs ${fieldClass}`}
                        placeholder="Go, PostgreSQL, Docker"
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
          disabled={!isAdmin || loading}
          className="px-5 h-10 text-sm font-bold border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-all bg-black text-white hover:bg-black"
        >
          {loading ? 'Saving...' : 'Save Experience'}
        </Button>
      </div>
    </div>
  );
}
