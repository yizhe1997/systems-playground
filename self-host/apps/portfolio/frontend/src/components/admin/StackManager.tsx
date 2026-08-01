'use client';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SimpleIcon from '@/components/SimpleIcon';
import { lookupIcon } from '@/lib/simple-icons';

type StackSkill = { name: string; icon: string };
type StackCategory = { id: string; name: string; skills: StackSkill[] };

const fieldClass =
  'border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow h-9';

export default function StackManager({ isAdmin }: { isAdmin: boolean }) {
  const [categories, setCategories] = useState<StackCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
    fetch(`${url}/api/stack`)
      .then((r) => r.json())
      .then((data) => setCategories(data || []))
      .catch(console.error);
  }, []);

  const save = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stack', payload: categories }),
      });
      if (res.ok) toast({ title: 'Success', description: 'Saved Stack to Redis!' });
      else toast({ title: 'Error', description: 'Failed to save Stack.', variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const addCategory = () => {
    setCategories([...categories, { id: Math.random().toString(36).substring(2, 8), name: '', skills: [] }]);
  };

  const removeCategory = (ci: number) => setCategories(categories.filter((_, i) => i !== ci));

  const addSkill = (ci: number) => {
    const next = [...categories];
    next[ci].skills = [...next[ci].skills, { name: '', icon: '' }];
    setCategories(next);
  };

  const removeSkill = (ci: number, si: number) => {
    const next = [...categories];
    next[ci].skills = next[ci].skills.filter((_, i) => i !== si);
    setCategories(next);
  };

  return (
    <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '0.75rem' }}>
      <div className="p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b-2 border-black">
        <div>
          <h2 className="text-xl font-extrabold mb-1">Stack</h2>
          <p className="text-sm text-[var(--ds-charcoal)]/70">
            Categorized skills shown on the About page. Icon is an optional{' '}
            <a href="https://simpleicons.org" target="_blank" rel="noopener noreferrer" className="underline">
              simple-icons
            </a>{' '}
            slug (e.g. &quot;typescript&quot;) — leave blank for text-only.
          </p>
        </div>
        <Button
          onClick={addCategory}
          disabled={!isAdmin}
          variant="outline"
          className="border-2 border-black rounded-[0.5rem] font-bold hover:bg-black hover:text-white whitespace-nowrap"
        >
          + Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="p-12 text-sm text-[var(--ds-charcoal)]/60 text-center">
          No categories yet. Click &quot;Add Category&quot; to begin (e.g. &quot;Language&quot;, &quot;Frontend&quot;, &quot;Backend &amp; Database&quot;).
        </div>
      ) : (
        <div className="divide-y-2 divide-black">
          {categories.map((cat, ci) => (
            <div key={cat.id} className="p-6 space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`cat-name-${ci}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    Category name
                  </Label>
                  <Input
                    id={`cat-name-${ci}`}
                    value={cat.name}
                    onChange={(e) => { const n = [...categories]; n[ci].name = e.target.value; setCategories(n); }}
                    className={`font-bold ${fieldClass}`}
                    placeholder="e.g. Frontend"
                    disabled={!isAdmin}
                  />
                </div>
                <Button
                  onClick={() => removeCategory(ci)}
                  disabled={!isAdmin}
                  variant="destructive"
                  size="icon"
                  aria-label="Remove category"
                  className="shrink-0 border-2 border-black rounded-[0.5rem]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {cat.skills.length > 0 && (
                <div className="grid grid-cols-[2rem_1fr_10rem_2.5rem] gap-2 px-1">
                  <span />
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/50">Skill name</Label>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/50">Icon slug (optional)</Label>
                  <span />
                </div>
              )}
              <div className="space-y-2">
                {cat.skills.map((skill, si) => {
                  const resolved = lookupIcon(skill.icon);
                  return (
                    <div key={si} className="grid grid-cols-[2rem_1fr_10rem_2.5rem] gap-2 items-center">
                      <div className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white" style={{ borderRadius: '0.375rem' }}>
                        {skill.icon && !resolved ? (
                          <span className="text-[9px] text-red-600 font-bold">?</span>
                        ) : (
                          <SimpleIcon slug={skill.icon} className="w-4 h-4" />
                        )}
                      </div>
                      <Input
                        value={skill.name}
                        onChange={(e) => { const n = [...categories]; n[ci].skills[si].name = e.target.value; setCategories(n); }}
                        className={fieldClass}
                        placeholder="TypeScript"
                        disabled={!isAdmin}
                        aria-label="Skill name"
                      />
                      <Input
                        value={skill.icon}
                        onChange={(e) => { const n = [...categories]; n[ci].skills[si].icon = e.target.value; setCategories(n); }}
                        className={`font-mono text-xs ${fieldClass}`}
                        placeholder="typescript"
                        disabled={!isAdmin}
                        aria-label="Icon slug"
                      />
                      <Button
                        onClick={() => removeSkill(ci, si)}
                        disabled={!isAdmin}
                        variant="ghost"
                        size="icon"
                        aria-label="Remove skill"
                        className="shrink-0 border-2 border-transparent hover:border-black rounded-[0.5rem] text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={() => addSkill(ci)}
                disabled={!isAdmin}
                variant="ghost"
                className="text-xs font-bold underline px-0 hover:bg-transparent"
              >
                + Add skill
              </Button>
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
          {loading ? 'Saving...' : 'Save Stack'}
        </Button>
      </div>
    </div>
  );
}
