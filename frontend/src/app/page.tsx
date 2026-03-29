'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import RabbitMQDemo from '@/components/demos/RabbitMQDemo';

type Widget = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export default function Home() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>('#');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('#');
  const [githubUrl, setGithubUrl] = useState<string>('#');
  
  const [adrModalOpen, setAdrModalOpen] = useState(false);
  const [adrContent, setAdrContent] = useState<string>('');
  const [adrTitle, setAdrTitle] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  const [activeDemo, setActiveDemo] = useState<Widget | null>(null);

  const formatUrl = (url: string) => {
    if (!url || url === '#') return '#';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  const openAdr = async (slug: string, title: string) => {
    setAdrTitle(title);
    setAdrContent('Loading architecture logs...');
    setAdrModalOpen(true);
    try {
      const res = await fetch(`https://raw.githubusercontent.com/yizhe1997/systems-playground/main/docs/adrs/${slug}.md`);
      if (res.ok) {
        setAdrContent(await res.text());
      } else {
        setAdrContent('Failed to load ADR from GitHub repository.');
      }
    } catch(err) {
      console.error(err);
      setAdrContent('Network error while loading ADR.');
    }
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

    // Fetch dynamic resume links
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.resumeUrl) setResumeUrl(data.resumeUrl);
        if (data.linkedinUrl) setLinkedinUrl(data.linkedinUrl);
        if (data.githubUrl) setGithubUrl(data.githubUrl);
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
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#playground" className="hover:text-blue-600 transition-colors">Playground</a>
            <a href="#adrs" className="hover:text-blue-600 transition-colors">Architecture</a>
            <div className="w-px h-4 bg-gray-300 hidden sm:block"></div>
            <Link 
              href="/admin" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900 h-9 px-4 py-2"
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

      {/* Interactive Playground */}
      <section id="playground" className="w-full bg-white border-y border-gray-200 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">🚀 Interactive Systems Playground</h2>
            <p className="text-gray-600 max-w-2xl">
              These aren&apos;t simulated animations. Below are real infrastructure containers connected to a Golang control plane. 
              They are built using a <strong>Scale-to-Zero</strong> architecture—they shut down automatically when idle to conserve memory.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Widget Cards */}
            {loading ? (
              <div className="text-gray-500 animate-pulse">Checking infrastructure status...</div>
            ) : (
              widgets.length > 0 ? widgets.map((widget) => (
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
                <div className="col-span-2 text-gray-500 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                  ⚠️ No playground widgets found. Ensure Docker daemon is running and containers have the 'playground.widget' label.
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Architecture Logs */}
      <section id="adrs" className="w-full max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold mb-8">📚 Architecture Decision Records (ADRs)</h2>
        <div className="space-y-4">
          <div 
            onClick={() => openAdr('001-custom-go-control-plane', 'ADR 001: Custom Go Control Plane')}
            className="group block border border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition cursor-pointer bg-white"
          >
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">ADR 001: Custom Go Control Plane vs. Portainer</h3>
            <p className="text-gray-600 mt-2 text-sm leading-relaxed">
              Why I built a custom Golang daemon socket integration instead of using standard orchestration tools, 
              focusing on security isolation and implementing Scale-to-Zero memory optimization for the host machine.
            </p>
          </div>
          <div 
            onClick={() => openAdr('002-bff-proxy-security', 'ADR 002: Backend-For-Frontend (BFF) Pattern')}
            className="group block border border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition cursor-pointer bg-white"
          >
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">ADR 002: Backend-For-Frontend (BFF) API Security</h3>
            <p className="text-gray-600 mt-2 text-sm leading-relaxed">
              Securing the Golang control plane using a Next.js Node server API proxy to evaluate NextAuth JWTs 
              and assign Role-Based Access Control (RBAC) without exposing API keys to the browser.
            </p>
          </div>
          <div 
            onClick={() => openAdr('003-secure-resume-storage', 'ADR 003: Secure Local Storage vs Git Blobs')}
            className="group block border border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition cursor-pointer bg-white"
          >
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">ADR 003: Secure Local Storage over Git-Tracked Blobs</h3>
            <p className="text-gray-600 mt-2 text-sm leading-relaxed">
              Why we opted for a dedicated self-hosted file manager container over committing binary PDFs to the Next.js `public/` directory, introducing expiring share links and protecting the Git repository from bloat.
            </p>
          </div>
        </div>
      </section>
      
      {/* Markdown Modal */}
      <Dialog open={adrModalOpen} onOpenChange={setAdrModalOpen} disablePointerDismissal>
        <DialogContent 
          className="flex flex-col max-w-[90vw] md:max-w-[75vw] lg:max-w-[1200px] max-h-[85vh] resize overflow-auto transition-all duration-300 ease-in-out"
        >
          <DialogHeader className="flex flex-col items-start pr-8">
            <DialogTitle className="text-2xl">{adrTitle}</DialogTitle>
            <DialogDescription>
              Raw engineering log fetched dynamically from the GitHub repository.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex-1 overflow-y-auto">
            <div className="prose prose-slate prose-blue max-w-none pr-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {adrContent}
              </ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
