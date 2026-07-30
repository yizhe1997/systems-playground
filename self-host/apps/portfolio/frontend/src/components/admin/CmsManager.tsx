'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminTabBar, { tabId, tabPanelId } from '@/components/admin/AdminTabBar';

type Project = { id: string; title: string; description: string; tech_stack: string[]; live_url: string; github_url: string; };
type Document = { id: string; title: string; description: string; folder_path: string; source_type: string; content_target: string; };
type HomepageVisibility = { featured_projects: string[]; featured_docs: string[]; };

const dsInput =
  "px-3 py-2 text-sm bg-white border-2 border-black rounded-[0.375rem] text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed";

const pushBtnSm =
  "transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-0.5 hover:translate-y-0.5";

export default function CmsManager({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<'home' | 'projects' | 'docs'>('home');
  const [loading, setLoading] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [homepage, setHomepage] = useState<HomepageVisibility>({ featured_projects: [], featured_docs: [] });

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
      setHomepage(resH || { featured_projects: [], featured_docs: [] });
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
    <div className="mt-8 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '0.75rem' }}>
      <div className="p-4 border-b-2 border-black bg-white">
        <AdminTabBar
          idPrefix="cms"
          tabs={[
            { value: 'home', label: 'Homepage Layout' },
            { value: 'projects', label: 'Projects Registry' },
            { value: 'docs', label: 'Docs & CMS' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="p-6">
        {tab === 'home' && (
          <div id={tabPanelId('cms', 'home')} role="tabpanel" aria-labelledby={tabId('cms', 'home')} className="space-y-6">
            <h3 className="text-lg font-extrabold">Homepage Visibility Manager</h3>
            <p className="text-sm text-[var(--ds-charcoal)]/70 mb-2">Select which items appear on the main landing page.</p>

            <div className="space-y-3">
              <h4 className="font-bold text-sm border-b-2 border-black pb-2">Featured Projects</h4>
              <div className="flex flex-wrap gap-3">
                {projects.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm bg-white px-3 py-2 border-2 border-black cursor-pointer" style={{ borderRadius: '0.375rem' }}>
                    <input type="checkbox" checked={homepage.featured_projects?.includes(p.id)} onChange={e => {
                      const nu = e.target.checked ? [...(homepage.featured_projects||[]), p.id] : homepage.featured_projects.filter(id => id !== p.id);
                      setHomepage({ ...homepage, featured_projects: nu });
                    }} disabled={!isAdmin} className="accent-black" />
                    {p.title || 'Untitled'}
                  </label>
                ))}
                {projects.length === 0 && <span className="text-sm text-[var(--ds-charcoal)]/50 italic">No projects created yet.</span>}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-sm border-b-2 border-black pb-2 mt-6">Featured Docs</h4>
              <div className="flex flex-wrap gap-3">
                {docs.map(d => (
                  <label key={d.id} className="flex items-center gap-2 text-sm bg-white px-3 py-2 border-2 border-black cursor-pointer" style={{ borderRadius: '0.375rem' }}>
                    <input type="checkbox" checked={homepage.featured_docs?.includes(d.id)} onChange={e => {
                      const nu = e.target.checked ? [...(homepage.featured_docs||[]), d.id] : homepage.featured_docs.filter(id => id !== d.id);
                      setHomepage({ ...homepage, featured_docs: nu });
                    }} disabled={!isAdmin} className="accent-black" />
                    {d.title || 'Untitled'}
                  </label>
                ))}
                {docs.length === 0 && <span className="text-sm text-[var(--ds-charcoal)]/50 italic">No documents created yet.</span>}
              </div>
            </div>

            <div className="pt-4 border-t-2 border-black">
              <button
                onClick={() => saveCms('homepage', homepage)}
                disabled={!isAdmin || loading}
                className={`px-5 py-2.5 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${pushBtnSm} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0 bg-black text-white`}
                style={{ borderRadius: '0.5rem' }}
              >
                Save Homepage Layout
              </button>
            </div>
          </div>
        )}

        {tab === 'projects' && (
          <div id={tabPanelId('cms', 'projects')} role="tabpanel" aria-labelledby={tabId('cms', 'projects')} className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold">Project Registry</h3>
                <p className="text-sm text-[var(--ds-charcoal)]/70">Metadata for standalone external applications.</p>
              </div>
              <button
                onClick={() => setProjects([{ id: Math.random().toString(36).substring(2,8), title: '', description: '', tech_stack: [], live_url: '', github_url: '' }, ...projects])}
                className="px-4 py-2 text-sm font-bold border-2 border-black bg-white hover:bg-black hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '0.5rem' }}
                disabled={!isAdmin}
              >
                + Add Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-sm text-[var(--ds-charcoal)]/60 text-center py-12 border-2 border-dashed border-black/30" style={{ borderRadius: '0.75rem' }}>
                No projects in registry. Click &quot;Add Project&quot; to begin.
              </div>
            ) : (
              <div className="border-2 border-black divide-y-2 divide-black" style={{ borderRadius: '0.75rem' }}>
                {projects.map((p, i) => (
                  <div key={i} className="p-5 space-y-4 relative group">
                    <button
                      onClick={() => { const n = [...projects]; n.splice(i, 1); setProjects(n); }}
                      className="absolute top-4 right-4 px-2 py-1 text-xs font-bold text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:pointer-events-none disabled:group-hover:opacity-0 disabled:focus:opacity-0"
                      disabled={!isAdmin}
                    >
                      Remove
                    </button>
                    <div className="flex flex-col sm:flex-row gap-3 pr-16">
                      <input value={p.title} onChange={e => { const n = [...projects]; n[i].title = e.target.value; setProjects(n); }} className={`flex-1 font-bold ${dsInput}`} placeholder="Project Title" disabled={!isAdmin} />
                      <input value={p.id} onChange={e => { const n = [...projects]; n[i].id = e.target.value; setProjects(n); }} className={`w-full sm:w-32 text-xs font-mono ${dsInput}`} placeholder="Slug ID" disabled={!isAdmin} />
                    </div>
                    <textarea value={p.description} onChange={e => { const n = [...projects]; n[i].description = e.target.value; setProjects(n); }} className={`w-full min-h-[80px] ${dsInput}`} placeholder="Short description..." disabled={!isAdmin} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input value={p.tech_stack.join(', ')} onChange={e => { const n = [...projects]; n[i].tech_stack = e.target.value.split(',').map(s=>s.trim()).filter(Boolean); setProjects(n); }} className={`text-xs ${dsInput}`} placeholder="Tags (comma separated)" disabled={!isAdmin} />
                      <input value={p.live_url} onChange={e => { const n = [...projects]; n[i].live_url = e.target.value; setProjects(n); }} className={`text-xs ${dsInput}`} placeholder="Live URL (https://...)" disabled={!isAdmin} />
                      <input value={p.github_url} onChange={e => { const n = [...projects]; n[i].github_url = e.target.value; setProjects(n); }} className={`text-xs ${dsInput}`} placeholder="GitHub URL (https://...)" disabled={!isAdmin} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t-2 border-black">
              <button
                onClick={() => saveCms('projects', projects)}
                disabled={!isAdmin || loading}
                className={`px-5 py-2.5 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${pushBtnSm} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0 bg-black text-white`}
                style={{ borderRadius: '0.5rem' }}
              >
                Save Projects Registry
              </button>
            </div>
          </div>
        )}

        {tab === 'docs' && (
          <div id={tabPanelId('cms', 'docs')} role="tabpanel" aria-labelledby={tabId('cms', 'docs')} className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold">Document &amp; Folder Registry</h3>
                <p className="text-sm text-[var(--ds-charcoal)]/70">Virtual tree pointing to read-only repos or native CMS files.</p>
              </div>
              <button
                onClick={() => setDocs([{ id: Math.random().toString(36).substring(2,8), title: '', description: '', folder_path: '/blogs', source_type: 'native', content_target: '' }, ...docs])}
                className="px-4 py-2 text-sm font-bold border-2 border-black bg-white hover:bg-black hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '0.5rem' }}
                disabled={!isAdmin}
              >
                + Add Document
              </button>
            </div>

            {docs.length === 0 ? (
              <div className="text-sm text-[var(--ds-charcoal)]/60 text-center py-12 border-2 border-dashed border-black/30" style={{ borderRadius: '0.75rem' }}>
                No documents in registry.
              </div>
            ) : (
              <div className="border-2 border-black divide-y-2 divide-black" style={{ borderRadius: '0.75rem' }}>
                {docs.map((d, i) => (
                  <div key={i} className="p-5 space-y-4 relative group">
                    <button
                      onClick={() => { const n = [...docs]; n.splice(i, 1); setDocs(n); }}
                      className="absolute top-4 right-4 px-2 py-1 text-xs font-bold text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:pointer-events-none disabled:group-hover:opacity-0 disabled:focus:opacity-0"
                      disabled={!isAdmin}
                    >
                      Remove
                    </button>
                    <div className="flex flex-col sm:flex-row gap-3 pr-16">
                      <input value={d.title} onChange={e => { const n = [...docs]; n[i].title = e.target.value; setDocs(n); }} className={`flex-1 font-bold ${dsInput}`} placeholder="Document Title" disabled={!isAdmin} />
                      <input value={d.id} onChange={e => { const n = [...docs]; n[i].id = e.target.value; setDocs(n); }} className={`w-full sm:w-32 text-xs font-mono ${dsInput}`} placeholder="Slug ID" disabled={!isAdmin} />
                    </div>
                    <input value={d.description} onChange={e => { const n = [...docs]; n[i].description = e.target.value; setDocs(n); }} className={`w-full ${dsInput}`} placeholder="Short description..." disabled={!isAdmin} />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input value={d.folder_path} onChange={e => { const n = [...docs]; n[i].folder_path = e.target.value; setDocs(n); }} className={`sm:w-1/4 text-xs ${dsInput}`} placeholder="Folder (e.g. /adrs)" disabled={!isAdmin} />
                      <select value={d.source_type} onChange={e => { const n = [...docs]; n[i].source_type = e.target.value; setDocs(n); }} className={`sm:w-1/4 text-xs ${dsInput}`} disabled={!isAdmin}>
                        <option value="external_url">External (GitHub)</option>
                        <option value="native">Native (Filebrowser)</option>
                      </select>
                      <div className="flex-1 flex gap-2">
                        <input value={d.content_target} onChange={e => { const n = [...docs]; n[i].content_target = e.target.value; setDocs(n); }} className={`flex-1 text-xs ${dsInput}`} placeholder={d.source_type === 'native' ? "/blogs/post.md" : "https://raw.github..."} disabled={!isAdmin} />
                        {d.source_type === 'native' && d.content_target && (
                          <button
                            onClick={() => loadNativeFile(d.content_target)}
                            className="px-4 py-2 border-2 border-black bg-[var(--ds-sage)] hover:bg-black hover:text-white text-xs font-bold transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                            style={{ borderRadius: '0.375rem' }}
                          >
                            Open Editor
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t-2 border-black">
              <button
                onClick={() => saveCms('documents', docs)}
                disabled={!isAdmin || loading}
                className={`px-5 py-2.5 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${pushBtnSm} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0 bg-black text-white`}
                style={{ borderRadius: '0.5rem' }}
              >
                Save Docs Registry
              </button>
            </div>
          </div>
        )}

        {/* Markdown Editor Modal Overlay */}
        {editingFile && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-8">
            <div className="bg-white border-2 border-black shadow-[12px_12px_0px_0px_#000] w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden" style={{ borderRadius: '0.75rem' }}>
              <div className="px-6 py-4 border-b-2 border-black flex flex-col sm:flex-row sm:items-center justify-between bg-white gap-4">
                <div>
                  <h3 className="font-extrabold text-lg">Native Markdown Editor</h3>
                  <span className="text-xs text-[var(--ds-charcoal)]/70 font-mono">{editingFile.path}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingFile(null)}
                    className="px-5 py-2.5 text-sm font-bold text-[var(--ds-charcoal)]/70 hover:text-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={saveNativeFile}
                    disabled={loading}
                    className={`px-5 py-2.5 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${pushBtnSm} bg-black text-white flex items-center gap-2`}
                    style={{ borderRadius: '0.5rem' }}
                  >
                    Save to Storage
                  </button>
                </div>
              </div>
              <div className="flex-1" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
                <textarea
                  value={editingFile.content}
                  onChange={e => setEditingFile({...editingFile, content: e.target.value})}
                  className="w-full h-full p-8 font-mono text-[13px] leading-relaxed resize-none outline-none bg-transparent text-white"
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
