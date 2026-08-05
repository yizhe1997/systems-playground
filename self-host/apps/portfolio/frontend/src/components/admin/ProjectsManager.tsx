'use client';
import { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ProjectRow, { type Project } from '@/components/ProjectRow';
import IconPicker from '@/components/admin/IconPicker';
import TagList from '@/components/admin/TagList';
import MonthYearPicker from '@/components/admin/MonthYearPicker';
import StatusToggle from '@/components/admin/StatusToggle';

const RequiredMark = () => <span className="text-red-600" aria-hidden="true"> *</span>;

type AdminProject = Project & { featured: boolean; status: string };

const fieldClass =
  'border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow h-9';

export default function ProjectsManager({ isAdmin, onDirtyChange }: { isAdmin: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [baseline, setBaseline] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const titleRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const { toast } = useToast();

  // Admins fetch through the authenticated proxy so drafts (excluded from
  // the public /api/projects response) still show up here to keep editing.
  useEffect(() => {
    const url = isAdmin ? '/api/proxy/cms?type=projects' : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085'}/api/projects`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { const d = data || []; setProjects(d); setBaseline(d); })
      .catch(console.error);
  }, [isAdmin]);

  const isDirty = JSON.stringify(projects) !== JSON.stringify(baseline);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  // Only Published items are validated - a Draft is explicitly a
  // work-in-progress save, so it must never be blocked by incomplete
  // fields (that's the whole point of drafts: don't lose progress). An
  // untitled *published* project still saves "successfully" but has
  // nothing for a homepage/projects-page card to display, so it's
  // effectively silent junk data rather than a real error anywhere else in
  // the stack. Caught here before the request even goes out; the backend
  // independently re-checks the same rule (cms.go). All offending items are
  // reported at once - flagging only the first meant a second (third,
  // fourth...) blank title only surfaced after fixing and resaving, one at
  // a time.
  const validate = (): { message: string; index: number }[] =>
    projects
      .map((p, i) => (p.status === 'published' && !p.title.trim() ? { message: `Project #${i + 1} needs a title.`, index: i } : null))
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
      const el = titleRefs.current[errors[0].index];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'projects', payload: projects }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Saved Projects to Redis!' });
        setBaseline(projects);
      } else {
        const body = await res.json().catch(() => null);
        toast({ title: 'Error', description: body?.error || 'Failed to save Projects.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const addProject = () => {
    setProjects([
      { id: Math.random().toString(36).substring(2, 8), title: '', description: '', tech_stack: [], live_url: '', start_date: '', end_date: '', icon: '', featured: false, status: 'draft' },
      ...projects,
    ]);
  };

  const removeProject = (i: number) => setProjects(projects.filter((_, idx) => idx !== i));

  const update = (i: number, patch: Partial<AdminProject>) => {
    const n = [...projects];
    n[i] = { ...n[i], ...patch };
    setProjects(n);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= projects.length) return;
    const n = [...projects];
    [n[i], n[j]] = [n[j], n[i]];
    setProjects(n);
  };

  return (
    <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '0.75rem' }}>
      <div className="p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b-2 border-black">
        <div>
          <h2 className="text-xl font-extrabold mb-1">Projects</h2>
          <p className="text-sm text-[var(--ds-charcoal)]/70">Standalone external applications. Toggle &quot;Featured&quot; to show on the homepage.</p>
        </div>
        <Button
          onClick={addProject}
          disabled={!isAdmin}
          variant="outline"
          className="border-2 border-black rounded-[0.5rem] font-bold hover:bg-black hover:text-white whitespace-nowrap"
        >
          + Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="p-12 text-sm text-[var(--ds-charcoal)]/60 text-center">
          No projects yet. Click &quot;Add Project&quot; to begin.
        </div>
      ) : (
        <div className="divide-y-2 divide-black">
          {projects.map((p, i) => (
            <div key={p.id} className="p-6 space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`proj-title-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    Project title<RequiredMark />
                  </Label>
                  <Input
                    id={`proj-title-${i}`}
                    ref={(el) => { titleRefs.current[i] = el; }}
                    value={p.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    className={`font-bold ${fieldClass}`}
                    placeholder="Systems Playground"
                    disabled={!isAdmin}
                  />
                </div>
                <StatusToggle value={p.status} onChange={(v) => update(i, { status: v })} disabled={!isAdmin} />
                <div className="flex gap-1 shrink-0">
                  <Button
                    onClick={() => move(i, -1)}
                    disabled={!isAdmin || i === 0}
                    variant="ghost"
                    size="icon"
                    aria-label="Move up"
                    className="border-2 border-transparent hover:border-black rounded-[0.5rem]"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => move(i, 1)}
                    disabled={!isAdmin || i === projects.length - 1}
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
                    onClick={() => removeProject(i)}
                    disabled={!isAdmin}
                    variant="destructive"
                    size="icon"
                    aria-label="Remove project"
                    className="border-2 border-black rounded-[0.5rem]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`proj-desc-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                  Description
                </Label>
                <Textarea
                  id={`proj-desc-${i}`}
                  value={p.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  className="border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow min-h-[100px] font-mono text-sm"
                  placeholder={'Shown when the project row is expanded.\n\n- Markdown supported\n- **bold**, [links](https://...)\n- bullet lists like this one'}
                  disabled={!isAdmin}
                />
                <p className="text-[10px] text-[var(--ds-charcoal)]/50">Markdown supported (bullet lists, bold, links).</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`proj-icon-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    Icon (optional)
                  </Label>
                  <IconPicker
                    id={`proj-icon-${i}`}
                    value={p.icon}
                    onChange={(v) => update(i, { icon: v })}
                    className={`text-xs ${fieldClass}`}
                    disabled={!isAdmin}
                  />
                  <p className="text-[10px] text-[var(--ds-charcoal)]/50">
                    Search a brand name for a bundled icon, or paste a direct image URL.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`proj-tags-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    Tech tags
                  </Label>
                  <TagList
                    id={`proj-tags-${i}`}
                    values={p.tech_stack}
                    onChange={(v) => update(i, { tech_stack: v })}
                    className={`text-xs ${fieldClass}`}
                    placeholder="Go, Next.js, Docker..."
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`proj-live-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    Live URL
                  </Label>
                  <Input
                    id={`proj-live-${i}`}
                    value={p.live_url}
                    onChange={(e) => update(i, { live_url: e.target.value })}
                    className={`text-xs ${fieldClass}`}
                    placeholder="https://..."
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <MonthYearPicker
                  label="Start"
                  value={p.start_date}
                  onChange={(v) => update(i, { start_date: v })}
                  disabled={!isAdmin}
                />
                <MonthYearPicker
                  label="End"
                  value={p.end_date}
                  onChange={(v) => update(i, { end_date: v })}
                  disabled={!isAdmin}
                  allowOngoing
                  ongoingLabel="Ongoing"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer select-none w-fit">
                  <input
                    type="checkbox"
                    checked={p.featured}
                    onChange={(e) => update(i, { featured: e.target.checked })}
                    disabled={!isAdmin}
                    className="accent-black w-4 h-4"
                  />
                  Featured on homepage
                </label>
                <p className="text-[10px] text-[var(--ds-charcoal)]/50 mt-1">
                  Every project appears on <code className="bg-black/5 px-1 rounded">/projects</code> regardless. Featured additionally shows it on the homepage (max 4).
                </p>
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
          {loading ? 'Saving...' : 'Save Projects'}
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
              Unsaved changes — this is exactly how the row renders (expanded) on the homepage and on <code className="bg-black/5 px-1 rounded text-[var(--ds-charcoal)]">/projects</code>.
              {previewIndex !== null && projects[previewIndex]?.status !== 'published' && (
                <span className="block mt-2 font-bold text-black">This project is a Draft and won&apos;t appear on the live site until Published.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {previewIndex !== null && projects[previewIndex] && <ProjectRow project={projects[previewIndex]} defaultOpen />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
