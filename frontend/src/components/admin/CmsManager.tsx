'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

type Project = { id: string; title: string; description: string; tech_stack: string[]; live_url: string; github_url: string; };
type Document = { id: string; title: string; description: string; folder_path: string; source_type: string; content_target: string; };
type HomepageVisibility = { featured_projects: string[]; featured_demos: string[]; featured_docs: string[]; };

export default function CmsManager({ isAdmin, widgets }: { isAdmin: boolean; widgets: any[] }) {
  const [tab, setTab] = useState<'home' | 'projects' | 'docs'>('home');
  const [loading, setLoading] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [homepage, setHomepage] = useState<HomepageVisibility>({ featured_projects: [], featured_demos: [], featured_docs: [] });

  const [editingFile, setEditingFile] = useState<{ path: string, content: string } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const fetchAll = async () => {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const [resP, resD, resH] = await Promise.all([
        fetch(`${url}/api/projects`).then(r => r.json()),
        fetch(`${url}/api/documents`).then(r => r.json()),
        fetch(`${url}/api/homepage`).then(r => r.json())
      ]);
      setProjects(resP || []);
      setDocs(resD || []);
      setHomepage(resH || { featured_projects: [], featured_demos: [], featured_docs: [] });
    };
    fetchAll().catch(console.error);
  }, []);

  const saveCms = async (type: string, payload: any) => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      if (res.ok) toast({ title: "Success", description: `Saved ${type} to Redis!` });
      else toast({ title: "Error", description: `Failed to save ${type}.`, variant: "destructive" });
    } catch (e) {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    }
    setLoading(false);
  };

  const loadNativeFile = async (path: string) => {
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const res = await fetch(`${url}/api/docs/raw${path.startsWith('/') ? path : '/'+path}`);
      if (res.ok) setEditingFile({ path, content: await res.text() });
      else toast({ title: "Notice", description: "Failed to load file from storage. It may not exist yet." });
    } catch (e) {
      toast({ title: "Error", description: "Network error loading file.", variant: "destructive" });
    }
  };

  const saveNativeFile = async () => {
    if (!editingFile) return;
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFile)
      });
      if (res.ok) {
        toast({ title: "Success", description: "File saved to Filebrowser storage!" });
        setEditingFile(null);
      } else {
        toast({ title: "Error", description: "Failed to save file.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error saving file.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="mt-12 bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="flex border-b border-border bg-muted/50 overflow-x-auto">
        <button onClick={() => setTab('home')} className={`flex-1 py-3 px-4 text-sm font-semibold transition whitespace-nowrap ${tab === 'home' ? 'bg-card text-primary border-b-2 border-indigo-600' : 'text-muted-foreground hover:bg-muted'}`}>Homepage Layout</button>
        <button onClick={() => setTab('projects')} className={`flex-1 py-3 px-4 text-sm font-semibold transition whitespace-nowrap ${tab === 'projects' ? 'bg-card text-primary border-b-2 border-indigo-600' : 'text-muted-foreground hover:bg-muted'}`}>Projects Registry</button>
        <button onClick={() => setTab('docs')} className={`flex-1 py-3 px-4 text-sm font-semibold transition whitespace-nowrap ${tab === 'docs' ? 'bg-card text-primary border-b-2 border-indigo-600' : 'text-muted-foreground hover:bg-muted'}`}>Docs & CMS</button>
      </div>

      <div className="p-6">
        {tab === 'home' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold">Homepage Visibility Manager</h3>
            <p className="text-sm text-muted-foreground mb-6">Select which items appear on the main landing page.</p>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground/80 border-b pb-2">Featured Demos</h4>
              <div className="flex flex-wrap gap-3">
                {widgets.map(w => (
                  <label key={w.id} className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md border border-border cursor-pointer">
                    <input type="checkbox" checked={homepage.featured_demos?.includes(w.type)} onChange={e => {
                      const nu = e.target.checked ? [...(homepage.featured_demos||[]), w.type] : homepage.featured_demos.filter(id => id !== w.type);
                      setHomepage({ ...homepage, featured_demos: nu });
                    }} disabled={!isAdmin} className="rounded" />
                    {w.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground/80 border-b pb-2 mt-6">Featured Projects</h4>
              <div className="flex flex-wrap gap-3">
                {projects.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md border border-border cursor-pointer">
                    <input type="checkbox" checked={homepage.featured_projects?.includes(p.id)} onChange={e => {
                      const nu = e.target.checked ? [...(homepage.featured_projects||[]), p.id] : homepage.featured_projects.filter(id => id !== p.id);
                      setHomepage({ ...homepage, featured_projects: nu });
                    }} disabled={!isAdmin} className="rounded" />
                    {p.title || 'Untitled'}
                  </label>
                ))}
                {projects.length === 0 && <span className="text-sm text-muted-foreground/70 italic">No projects created yet.</span>}
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground/80 border-b pb-2 mt-6">Featured Docs</h4>
              <div className="flex flex-wrap gap-3">
                {docs.map(d => (
                  <label key={d.id} className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md border border-border cursor-pointer">
                    <input type="checkbox" checked={homepage.featured_docs?.includes(d.id)} onChange={e => {
                      const nu = e.target.checked ? [...(homepage.featured_docs||[]), d.id] : homepage.featured_docs.filter(id => id !== d.id);
                      setHomepage({ ...homepage, featured_docs: nu });
                    }} disabled={!isAdmin} className="rounded" />
                    {d.title || 'Untitled'}
                  </label>
                ))}
                {docs.length === 0 && <span className="text-sm text-muted-foreground/70 italic">No documents created yet.</span>}
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <button onClick={() => saveCms('homepage', homepage)} disabled={!isAdmin || loading} className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-50 transition shadow-sm">Save Homepage Layout</button>
            </div>
          </div>
        )}

        {tab === 'projects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Project Registry</h3>
                <p className="text-sm text-muted-foreground">Metadata for standalone external applications.</p>
              </div>
              <button onClick={() => setProjects([{ id: Math.random().toString(36).substring(2,8), title: '', description: '', tech_stack: [], live_url: '', github_url: '' }, ...projects])} className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm font-bold transition" disabled={!isAdmin}>+ Add Project</button>
            </div>
            
            <div className="space-y-4">
              {projects.map((p, i) => (
                <div key={i} className="p-5 border border-border rounded-xl bg-muted/50 space-y-4 relative group">
                  <button onClick={() => { const n = [...projects]; n.splice(i, 1); setProjects(n); }} className="absolute top-4 right-4 px-2 py-1 bg-rose-500/10 text-rose-500 rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition" disabled={!isAdmin}>Remove</button>
                  <div className="flex flex-col sm:flex-row gap-3 pr-16">
                    <input value={p.title} onChange={e => { const n = [...projects]; n[i].title = e.target.value; setProjects(n); }} className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md font-bold focus:ring-2 outline-none" placeholder="Project Title" disabled={!isAdmin} />
                    <input value={p.id} onChange={e => { const n = [...projects]; n[i].id = e.target.value; setProjects(n); }} className="w-full sm:w-32 px-3 py-2 text-xs border border-slate-300 rounded-md font-mono text-muted-foreground focus:ring-2 outline-none bg-muted" placeholder="Slug ID" disabled={!isAdmin} />
                  </div>
                  <textarea value={p.description} onChange={e => { const n = [...projects]; n[i].description = e.target.value; setProjects(n); }} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md min-h-[80px] focus:ring-2 outline-none" placeholder="Short description..." disabled={!isAdmin} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input value={p.tech_stack.join(', ')} onChange={e => { const n = [...projects]; n[i].tech_stack = e.target.value.split(',').map(s=>s.trim()).filter(Boolean); setProjects(n); }} className="px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 outline-none" placeholder="Tags (comma separated)" disabled={!isAdmin} />
                    <input value={p.live_url} onChange={e => { const n = [...projects]; n[i].live_url = e.target.value; setProjects(n); }} className="px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 outline-none" placeholder="Live URL (https://...)" disabled={!isAdmin} />
                    <input value={p.github_url} onChange={e => { const n = [...projects]; n[i].github_url = e.target.value; setProjects(n); }} className="px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 outline-none" placeholder="GitHub URL (https://...)" disabled={!isAdmin} />
                  </div>
                </div>
              ))}
              {projects.length === 0 && <div className="text-sm text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-xl">No projects in registry. Click "Add Project" to begin.</div>}
            </div>

            <div className="pt-4 border-t border-border/50">
              <button onClick={() => saveCms('projects', projects)} disabled={!isAdmin || loading} className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-50 transition shadow-sm">Save Projects Registry</button>
            </div>
          </div>
        )}

        {tab === 'docs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Document & Folder Registry</h3>
                <p className="text-sm text-muted-foreground">Virtual tree pointing to read-only repos or native CMS files.</p>
              </div>
              <button onClick={() => setDocs([{ id: Math.random().toString(36).substring(2,8), title: '', description: '', folder_path: '/blogs', source_type: 'native', content_target: '' }, ...docs])} className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm font-bold transition" disabled={!isAdmin}>+ Add Document</button>
            </div>

            <div className="space-y-4">
              {docs.map((d, i) => (
                <div key={i} className="p-5 border border-border rounded-xl bg-muted/50 space-y-4 relative group">
                  <button onClick={() => { const n = [...docs]; n.splice(i, 1); setDocs(n); }} className="absolute top-4 right-4 px-2 py-1 bg-rose-500/10 text-rose-500 rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition" disabled={!isAdmin}>Remove</button>
                  <div className="flex flex-col sm:flex-row gap-3 pr-16">
                    <input value={d.title} onChange={e => { const n = [...docs]; n[i].title = e.target.value; setDocs(n); }} className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md font-bold focus:ring-2 outline-none" placeholder="Document Title" disabled={!isAdmin} />
                    <input value={d.id} onChange={e => { const n = [...docs]; n[i].id = e.target.value; setDocs(n); }} className="w-full sm:w-32 px-3 py-2 text-xs border border-slate-300 rounded-md font-mono text-muted-foreground bg-muted focus:ring-2 outline-none" placeholder="Slug ID" disabled={!isAdmin} />
                  </div>
                  <input value={d.description} onChange={e => { const n = [...docs]; n[i].description = e.target.value; setDocs(n); }} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 outline-none" placeholder="Short description..." disabled={!isAdmin} />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input value={d.folder_path} onChange={e => { const n = [...docs]; n[i].folder_path = e.target.value; setDocs(n); }} className="sm:w-1/4 px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 outline-none" placeholder="Folder (e.g. /adrs)" disabled={!isAdmin} />
                    <select value={d.source_type} onChange={e => { const n = [...docs]; n[i].source_type = e.target.value; setDocs(n); }} className="sm:w-1/4 px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 outline-none bg-card" disabled={!isAdmin}>
                      <option value="external_url">External (GitHub)</option>
                      <option value="native">Native (Filebrowser)</option>
                    </select>
                    <div className="flex-1 flex gap-2">
                      <input value={d.content_target} onChange={e => { const n = [...docs]; n[i].content_target = e.target.value; setDocs(n); }} className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 outline-none" placeholder={d.source_type === 'native' ? "/blogs/post.md" : "https://raw.github..."} disabled={!isAdmin} />
                      {d.source_type === 'native' && d.content_target && (
                        <button onClick={() => loadNativeFile(d.content_target)} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md text-xs font-bold transition shadow-sm whitespace-nowrap">Open Editor</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {docs.length === 0 && <div className="text-sm text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-xl">No documents in registry.</div>}
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <button onClick={() => saveCms('documents', docs)} disabled={!isAdmin || loading} className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-50 transition shadow-sm">Save Docs Registry</button>
            </div>
          </div>
        )}

        {/* Markdown Editor Modal Overlay */}
        {editingFile && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between bg-muted/50 gap-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Native Markdown Editor</h3>
                  <span className="text-xs text-muted-foreground font-mono flex items-center gap-2 mt-1">
                    <svg className="w-4 h-4 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    {editingFile.path}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditingFile(null)} className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition">Discard Changes</button>
                  <button onClick={saveNativeFile} disabled={loading} className="px-5 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    Save to Storage
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-900 text-slate-50">
                <textarea 
                  value={editingFile.content} 
                  onChange={e => setEditingFile({...editingFile, content: e.target.value})}
                  className="w-full h-full p-8 font-mono text-[13px] leading-relaxed resize-none outline-none bg-transparent"
                  spellCheck={false}
                  placeholder="# Write your markdown here..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}