'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

type Widget = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export default function Home() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumeUrl, setResumeUrl] = useState<string>('#');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('#');
  
  const [adrModalOpen, setAdrModalOpen] = useState(false);
  const [adrContent, setAdrContent] = useState<string>('');
  const [adrTitle, setAdrTitle] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

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
    // Fetch widget statuses from the Go backend
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/admin/widgets')
      .then((res) => res.json())
      .then((data) => {
        setWidgets(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching widgets:', err);
        setLoading(false);
      });

    // Fetch dynamic resume links
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.resumeUrl) setResumeUrl(data.resumeUrl);
        if (data.linkedinUrl) setLinkedinUrl(data.linkedinUrl);
      })
      .catch(console.error);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-200">
      {/* Navigation */}
      <nav className="w-full max-w-5xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="font-bold text-xl tracking-tight">Chin Yi Zhe.</div>
        <div className="flex gap-6 text-sm font-medium text-gray-600">
          <a href="#playground" className="hover:text-black transition">Playground</a>
          <a href="#adrs" className="hover:text-black transition">Architecture</a>
          <Link href="/admin" className="hover:text-blue-600 transition">Admin Dashboard</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="w-full max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
          Hi, I&apos;m Chin Yi Zhe.<br />
          <span className="text-blue-600">I build scalable cloud systems.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed">
          I&apos;m a Backend-focused Software Engineer with deep expertise in .NET and Golang, alongside full-stack experience with Blazor, Angular, and React. 
          I focus on architecting resilient distributed systems, automating complex cloud deployment pipelines, and modernizing enterprise applications.
        </p>
        <div className="flex gap-4">
          <a href={formatUrl(resumeUrl)} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition shadow-sm">
            Download Resume
          </a>
          <a href={formatUrl(linkedinUrl)} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition shadow-sm">
            View LinkedIn
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
                <div key={widget.id} className="border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition bg-gray-50/50">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold">{widget.name}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${widget.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {widget.status === 'running' ? '🟢 ONLINE' : '🔴 OFFLINE'}
                    </span>
                  </div>
                  
                  <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg mb-6 bg-white">
                    {widget.status === 'running' ? (
                      <span className="text-gray-500 font-medium">✨ Live Demo Active ✨</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Container is stopped (Scale-to-Zero)</span>
                    )}
                  </div>
                  
                  <button 
                    disabled={widget.status !== 'running'}
                    className={`w-full py-3 rounded-lg font-medium transition ${widget.status === 'running' ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                  >
                    {widget.status === 'running' ? 'Interact with Demo' : 'Turn on via Admin Dashboard to test'}
                  </button>
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

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 py-12 mt-12 text-center text-gray-500 text-sm">
        <p>© 2026 Chin Yi Zhe. Engineered with Golang & Next.js.</p>
      </footer>
    </main>
  );
}
