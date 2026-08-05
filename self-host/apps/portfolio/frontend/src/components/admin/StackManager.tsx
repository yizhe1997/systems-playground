'use client';
import { useState, useEffect, useRef } from 'react';
import { Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SimpleIcon from '@/components/SimpleIcon';
import { lookupIcon } from '@/lib/simple-icons';
import IconPicker from '@/components/admin/IconPicker';
import StatusToggle from '@/components/admin/StatusToggle';

type StackSkill = { name: string; icon: string };
type StackCategory = { id: string; name: string; skills: StackSkill[]; status: string };

const fieldClass =
  'border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow h-9';

const RequiredMark = () => <span className="text-red-600" aria-hidden="true"> *</span>;

function StackCardPreview({ category }: { category: StackCategory }) {
  return (
    <div className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white p-6 max-w-sm" style={{ borderRadius: '0.75rem' }}>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-[var(--ds-charcoal)]/70">
        {category.name || 'Untitled category'}
      </h3>
      <div className="flex flex-wrap gap-2">
        {category.skills.map((skill, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 border-2 border-black"
            style={{ borderRadius: '0.375rem' }}
          >
            <SimpleIcon slug={skill.icon} className="w-3.5 h-3.5" />
            {skill.name || 'Untitled skill'}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function StackManager({ isAdmin, onDirtyChange }: { isAdmin: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const [categories, setCategories] = useState<StackCategory[]>([]);
  const [baseline, setBaseline] = useState<StackCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    const url = isAdmin ? '/api/proxy/cms?type=stack' : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085'}/api/stack`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { const d = data || []; setCategories(d); setBaseline(d); })
      .catch(console.error);
  }, [isAdmin]);

  const isDirty = JSON.stringify(categories) !== JSON.stringify(baseline);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const validate = (): { message: string; key: string }[] => {
    const errors: { message: string; key: string }[] = [];
    categories.forEach((cat, i) => {
      if (cat.status !== 'published') return;
      if (!cat.name.trim()) errors.push({ message: `Category #${i + 1} needs a name.`, key: `cat-${i}` });
      cat.skills.forEach((s, si) => {
        if (!s.name.trim()) errors.push({ message: `"${cat.name || `Category #${i + 1}`}" skill #${si + 1} needs a name.`, key: `skill-${i}-${si}` });
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
        body: JSON.stringify({ type: 'stack', payload: categories }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Saved Stack to Redis!' });
        setBaseline(categories);
      } else {
        const body = await res.json().catch(() => null);
        toast({ title: 'Error', description: body?.error || 'Failed to save Stack.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const addCategory = () => {
    setCategories([...categories, { id: Math.random().toString(36).substring(2, 8), name: '', skills: [], status: 'draft' }]);
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
            Categorized skills shown on the About page. Icon is optional — search a brand name for a bundled icon, or leave blank for text-only.
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
                    Category name<RequiredMark />
                  </Label>
                  <Input
                    id={`cat-name-${ci}`}
                    ref={(el) => { fieldRefs.current[`cat-${ci}`] = el; }}
                    value={cat.name}
                    onChange={(e) => { const n = [...categories]; n[ci].name = e.target.value; setCategories(n); }}
                    className={`font-bold ${fieldClass}`}
                    placeholder="e.g. Frontend"
                    disabled={!isAdmin}
                  />
                </div>
                <StatusToggle value={cat.status} onChange={(v) => { const n = [...categories]; n[ci].status = v; setCategories(n); }} disabled={!isAdmin} />
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
                    onClick={() => removeCategory(ci)}
                    disabled={!isAdmin}
                    variant="destructive"
                    size="icon"
                    aria-label="Remove category"
                    className="border-2 border-black rounded-[0.5rem]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {cat.skills.length > 0 && (
                <div className="grid grid-cols-[2rem_1fr_10rem_2.5rem] gap-2 px-1">
                  <span />
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/50">Skill name<RequiredMark /></Label>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/50">Icon (optional)</Label>
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
                        ref={(el) => { fieldRefs.current[`skill-${ci}-${si}`] = el; }}
                        value={skill.name}
                        onChange={(e) => { const n = [...categories]; n[ci].skills[si].name = e.target.value; setCategories(n); }}
                        className={fieldClass}
                        placeholder="TypeScript"
                        disabled={!isAdmin}
                        aria-label="Skill name"
                      />
                      <IconPicker
                        value={skill.icon}
                        onChange={(v) => { const n = [...categories]; n[ci].skills[si].icon = v; setCategories(n); }}
                        className={`font-mono text-xs ${fieldClass}`}
                        placeholder="Search a brand..."
                        disabled={!isAdmin}
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
          disabled={!isAdmin || loading || !isDirty}
          className="px-5 h-10 text-sm font-bold border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-all bg-black text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? 'Saving...' : 'Save Stack'}
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
              {previewIndex !== null && categories[previewIndex]?.status !== 'published' && (
                <span className="block mt-2 font-bold text-black">This category is a Draft and won&apos;t appear on the live site until Published.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {previewIndex !== null && categories[previewIndex] && <StackCardPreview category={categories[previewIndex]} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
