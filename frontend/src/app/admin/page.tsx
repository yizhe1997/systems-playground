'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Widget = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export default function AdminDashboard() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchWidgets = async () => {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/admin/widgets');
      const data = await res.json();
      setWidgets(data);
    } catch (err) {
      console.error('Error fetching widgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
    const interval = setInterval(fetchWidgets, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const toggleWidget = async (id: string) => {
    setToggling(id);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + `/admin/widgets/${id}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchWidgets(); // Refresh state immediately
      }
    } catch (err) {
      console.error('Failed to toggle widget:', err);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10 p-6 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="text-indigo-500">⚙️</span> SYSTEMS PLAYGROUND
          </h1>
          <p className="text-sm text-slate-400 font-mono mt-1">Control Plane API</p>
        </div>
        <Link href="/" className="px-4 py-2 text-sm font-medium border border-slate-700 rounded hover:bg-slate-800 transition">
          ← Back to Site
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 mt-8">
        {/* Status Banner */}
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-5 mb-10 flex gap-4 items-start shadow-inner">
          <div className="text-indigo-400 text-xl">ℹ️</div>
          <div>
            <h2 className="text-lg font-semibold text-indigo-100">Scale-to-Zero Auto-Shutdown is Active</h2>
            <p className="text-slate-400 mt-1 text-sm leading-relaxed">
              To conserve host memory (RAM), active playground containers will be forcefully terminated 
              by the Golang daemon socket integration after <span className="text-white font-mono">10 minutes</span> of inactivity.
            </p>
          </div>
        </div>

        <h3 className="text-sm font-bold tracking-wider text-slate-500 mb-6 uppercase">Infrastructure Targets</h3>

        {/* Targets List */}
        <div className="space-y-4">
          {loading && widgets.length === 0 ? (
            <div className="animate-pulse flex gap-4 p-6 border border-slate-800 rounded-xl bg-slate-800/50">
              <div className="h-10 w-10 bg-slate-700 rounded-full"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 w-1/3 bg-slate-700 rounded"></div>
                <div className="h-3 w-1/4 bg-slate-700 rounded"></div>
              </div>
            </div>
          ) : widgets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl text-slate-500 bg-slate-800/20">
              No containers labeled with \`playground.widget\` found on the Docker host.
            </div>
          ) : (
            widgets.map((widget) => {
              const isRunning = widget.status === 'running';
              const isToggling = toggling === widget.id;

              return (
                <div key={widget.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-slate-800 rounded-xl bg-slate-800/30 shadow-sm hover:border-slate-700 transition gap-6">
                  
                  {/* Info */}
                  <div className="flex gap-4 items-center">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl ${isRunning ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                      {widget.type === 'cache' ? '🗄️' : '📨'}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white tracking-tight">{widget.name}</h4>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="font-mono text-xs text-slate-500">ID: {widget.id}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span className={`font-medium ${isRunning ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Status: {isRunning ? '🟢 Running' : '🔴 Exited'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Last Active</div>
                      <div className="text-sm text-slate-300 font-mono mt-1">
                        {isRunning ? 'Just now' : 'N/A'}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      disabled={isToggling}
                      className={`relative overflow-hidden group min-w-[120px] px-5 py-2.5 rounded shadow-sm font-semibold transition-all duration-200 ${
                        isToggling 
                          ? 'bg-slate-700 text-slate-400 cursor-wait' 
                          : isRunning 
                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30' 
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30'
                      }`}
                    >
                      <span className={`relative z-10 flex items-center justify-center gap-2 ${isToggling && 'opacity-0'}`}>
                        {isRunning ? (
                          <><span>■</span> STOP</>
                        ) : (
                          <><span>▶</span> START</>
                        )}
                      </span>
                      {isToggling && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
