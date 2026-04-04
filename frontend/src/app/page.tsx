'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import RabbitMQDemo from '@/components/demos/RabbitMQDemo';

import ThemeToggle from '@/components/ThemeToggle';

type Widget = {
  id: string;
  name: string;
  type: string;
  status: string;
};

type Project = {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  live_url: string;
  github_url: string;
};

export default function Home() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<string[]>([]);
  const [featuredDemos, setFeaturedDemos] = useState<string[]>([]);
  const [featuredDocs, setFeaturedDocs] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>('#');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('#');
  const [githubUrl, setGithubUrl] = useState<string>('#');
  
  const [adrModalOpen, setAdrModalOpen] = useState(false);
  const [adrContent, setAdrContent] = useState<string>('');
  const [adrTitle, setAdrTitle] = useState<string>('');

  const [activeDemo, setActiveDemo] = useState<Widget | null>(null);

  const formatUrl = (url: string) => {
    if (!url || url === '#') return '#';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  useEffect(() => {
    const fetchWidgets = () => {
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/admin/widgets')
        .then((res) => res.json())
        .then((data) => {
          setWidgets(data);
          setLoading(false);
          // If we were waking a widget and it's now running, clear the waking state
          if (waking) {
            const wokenWidget = data.find((w: Widget) => w.id === waking);
            if (wokenWidget && wokenWidget.status === 'running') {
              setWaking(null);
            }
          }
        })
        .catch((err) => {
          console.error('Error fetching widgets:', err);
          setLoading(false);
        });
    };
    
    fetchWidgets();
    const interval = setInterval(fetchWidgets, 5000);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';

    // Fetch dynamic resume links
    fetch(apiUrl + '/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.resumeUrl) setResumeUrl(data.resumeUrl);
        if (data.linkedinUrl) setLinkedinUrl(data.linkedinUrl);
        if (data.githubUrl) setGithubUrl(data.githubUrl);
      })
      .catch(console.error);

    // Fetch CMS Projects & Homepage Visibility
    fetch(apiUrl + '/api/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data || []))
      .catch(console.error);

    fetch(apiUrl + '/api/documents')
      .then((res) => res.json())
      .then((data) => setDocs(data || []))
      .catch(console.error);

    fetch(apiUrl + '/api/homepage')
      .then((res) => res.json())
      .then((data) => {
        setFeaturedProjects(data.featured_projects || []);
        setFeaturedDemos(data.featured_demos || []);
        setFeaturedDocs(data.featured_docs || []);
      })
      .catch(console.error);

    return () => clearInterval(interval);
  }, [waking]);

  const wakeWidget = async (id: string) => {
    setWaking(id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      await fetch(`${apiUrl}/api/demo/widgets/${id}/wake`, { method: 'POST' });
      // The interval polling will catch the status change
    } catch (err) {
      console.error('Failed to wake widget:', err);
      setWaking(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-200">
      {/* Header/Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold font-mono text-sm shadow-sm">
              YZ
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900 hidden sm:inline-block">
              SYSTEMS_PLAYGROUND
            </span>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <ThemeToggle />
            <a href="#playground" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden sm:block">Playground</a>
            <a href="#adrs" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden sm:block">Architecture</a>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
            <Link 
              href="/admin" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white h-9 px-4 py-2"
            >
              Control Plane ⚙️
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-5xl mx-auto px-6 py-24 md:py-32">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
          Hi, I&apos;m Chin Yi Zhe.<br />
          <span className="text-blue-600">I build scalable cloud systems.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed">
          I&apos;m a Backend-focused Software Engineer with deep expertise in .NET and Golang, alongside full-stack experience with Blazor, Angular, and React. 
          I focus on architecting resilient distributed systems, automating complex cloud deployment pipelines, and modernizing enterprise applications.
        </p>
        <div className="flex flex-wrap gap-4">
          <a href={formatUrl(resumeUrl)} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition shadow-sm">
            Download Resume
          </a>
          <a href={formatUrl(linkedinUrl)} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition shadow-sm">
            View LinkedIn
          </a>
          <a href={formatUrl(githubUrl)} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition shadow-sm flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path>
            </svg>
            View GitHub
          </a>
        </div>
      </section>

      {/* Featured Projects */}
      <section id="projects" className="w-full bg-slate-50 border-t border-gray-200 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-12 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold mb-4">💼 Featured Projects</h2>
              <p className="text-gray-600 max-w-2xl">
                Standalone applications and cloud-native services currently in development or production.
              </p>
            </div>
            <Link href="/projects" className="hidden sm:inline-flex items-center text-blue-600 font-medium hover:underline">
              View All Projects →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {featuredProjects.length === 0 ? (
              <div className="col-span-2 text-slate-500 bg-white p-16 text-center rounded-xl border border-dashed border-slate-300">
                <span className="text-4xl mb-4 block opacity-50">📂</span>
                <p className="text-lg font-medium text-slate-700">It's empty at the moment...</p>
                <p className="text-sm mt-1">Real-world applications are currently in development.</p>
              </div>
            ) : (
              projects.filter(p => featuredProjects.includes(p.id)).slice(0, 4).map(project => (
                <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition flex flex-col h-full">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{project.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-6 flex-1">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {project.tech_stack.map(tech => (
                      <span key={tech} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-auto pt-6 border-t border-gray-100">
                    <a href={formatUrl(project.live_url)} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-sm">
                      Live App
                    </a>
                    <a href={formatUrl(project.github_url)} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition shadow-sm">
                      Source Code
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link href="/projects" className="inline-flex items-center text-blue-600 font-medium hover:underline">
              View All Projects →
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Playground */}
      <section id="playground" className="w-full bg-white border-y border-gray-200 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-12 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold mb-4">🚀 Interactive Systems Playground</h2>
              <p className="text-gray-600 max-w-2xl">
                These aren&apos;t simulated animations. Below are real infrastructure containers connected to a Golang control plane. 
                They are built using a <strong>Scale-to-Zero</strong> architecture—they shut down automatically when idle to conserve memory.
              </p>
            </div>
            <Link href="/playground" className="hidden sm:inline-flex items-center text-blue-600 font-medium hover:underline">
              View All Experiments →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Widget Cards */}
            {loading ? (
              <div className="text-gray-500 animate-pulse">Checking infrastructure status...</div>
            ) : (
              featuredDemos.length > 0 ? widgets.filter(w => featuredDemos.includes(w.id)).slice(0, 4).map((widget) => (
                <div key={widget.id} className="border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition bg-white flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{widget.name}</h3>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${widget.status === 'running' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {widget.status === 'running' ? '🟢 Online' : '🔴 Offline'}
                      </span>
                    </div>
                    
                    <div className="w-full sm:w-auto">
                      {widget.status === 'running' ? (
                        <button 
                          onClick={() => setActiveDemo(widget)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                          Launch Demo
                        </button>
                      ) : (
                        <button 
                          onClick={() => wakeWidget(widget.id)}
                          disabled={waking === widget.id}
                          className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                            waking === widget.id 
                              ? 'bg-blue-400 text-white cursor-wait' 
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'
                          }`}
                        >
                          {waking === widget.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Booting via Golang...
                            </>
                          ) : 'Wake Up Container'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 pt-4 border-t border-gray-100 leading-relaxed">
                    {widget.type === 'queue' && (
                      <div className="space-y-3">
                        <p>
                          <strong>Business Problem:</strong> Large enterprises use external Applicant Tracking Systems (ATS) to manage hiring, sending massive bursts of webhook data when jobs are created or updated. Synchronously processing these causes database locks and crashes APIs.
                        </p>
                        <p>
                          <strong>Solution:</strong> Demonstrates <strong>Event-Driven Architecture (EDA)</strong> by decoupling the API from the database. Webhooks are instantly acknowledged and dropped into a message queue, where background workers process them safely, preventing race conditions.
                        </p>
                      </div>
                    )}
                    {widget.type === 'cache' && (
                      <p>
                        Demonstrates the massive latency difference between querying a disk-based relational database versus a high-speed, in-memory key-value store. Prove the power of caching on hot-path endpoints.
                      </p>
                    )}
                  </div>
                </div>
              )) : (
              <div className="col-span-2 text-slate-500 bg-white p-16 text-center rounded-xl border border-dashed border-slate-300">
                <span className="text-4xl mb-4 block opacity-50">🕹️</span>
                <p className="text-lg font-medium text-slate-700">It's empty at the moment...</p>
                <p className="text-sm mt-1">Playground widgets will appear here when featured.</p>
              </div>
              )
            )}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link href="/playground" className="inline-flex items-center text-blue-600 font-medium hover:underline">
              View All Experiments →
            </Link>
          </div>
        </div>
      </section>

      {/* Architecture Logs */}
      <section id="adrs" className="w-full max-w-5xl mx-auto px-6 py-24">
        <div className="mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold mb-4">📚 Architecture Decision Records (ADRs)</h2>
            <p className="text-gray-600 max-w-2xl">
              Engineering logs, system designs, and technical writing.
            </p>
          </div>
          <Link href="/docs" className="hidden sm:inline-flex items-center text-blue-600 font-medium hover:underline">
            View All Docs →
          </Link>
        </div>
        <div className="space-y-4">
          {featuredDocs.length === 0 ? (
            <div className="text-slate-500 bg-white p-16 text-center rounded-xl border border-dashed border-slate-300">
              <span className="text-4xl mb-4 block opacity-50">📄</span>
              <p className="text-lg font-medium text-slate-700">It's empty at the moment...</p>
              <p className="text-sm mt-1">Documentation will appear here when featured.</p>
            </div>
          ) : (
            docs.filter(d => featuredDocs.includes(d.id)).slice(0, 4).map(doc => (
              <Link 
                key={doc.id}
                href={`/docs/${doc.id}`}
                className="group block border border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">{doc.title}</h3>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                    doc.source_type === 'external_url' 
                      ? 'bg-amber-50 text-amber-600 border-amber-200' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    {doc.source_type === 'external_url' ? 'External' : 'Native'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {doc.description}
                </p>
              </Link>
            ))
          )}
          
          <div className="mt-8 text-center sm:hidden">
            <Link href="/docs" className="inline-flex items-center text-blue-600 font-medium hover:underline">
              View All Docs →
            </Link>
          </div>
        </div>
      </section>

      {/* Active Demo Modal */}
      <Dialog open={activeDemo !== null} onOpenChange={(open) => !open && setActiveDemo(null)} disablePointerDismissal>
        <DialogContent className="flex flex-col max-w-[95vw] md:max-w-[85vw] lg:max-w-[1400px] max-h-[85vh] p-0 overflow-auto bg-slate-50 border border-slate-200 resize transition-all duration-300 ease-in-out">
          {activeDemo?.type === 'queue' && <RabbitMQDemo widgetId={activeDemo.id} />}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 py-12 mt-12 text-center text-gray-500 text-sm">
        <p>© 2026 Chin Yi Zhe. Engineered with Golang & Next.js.</p>
      </footer>
    </main>
  );
}
