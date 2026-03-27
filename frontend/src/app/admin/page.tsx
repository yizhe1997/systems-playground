'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

type Widget = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export default function AdminDashboard() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const userEmail = session?.user?.email || 'Unknown User';

  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchWidgets = async () => {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/admin/widgets');
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
    if (!isAdmin) return; // Client-side safeguard
    
    setToggling(id);
    try {
      const res = await fetch(`/api/proxy/widgets/${id}/toggle`, {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="text-indigo-500">⚙️</span> CONTROL PLANE
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
              {userEmail}
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${isAdmin ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
              Role: {isAdmin ? 'ADMIN' : 'READ ONLY'}
            </span>
          </div>
        </div>
        <div className="flex gap-4">
          <Link href="/" className="px-4 py-2 text-sm font-medium border border-slate-700 rounded hover:bg-slate-800 transition">
            ← Portfolio
          </Link>
          <button 
            onClick={() => signOut({ callbackUrl: '/' })} 
            className="px-4 py-2 text-sm font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded hover:bg-rose-500 hover:text-white transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 mt-8">
        {/* Status Banner */}
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-5 mb-10 flex gap-4 items-start shadow-inner">
          <div className="text-indigo-400 text-xl">ℹ️</div>
          <div>
            <h2 className="text-lg font-semibold text-indigo-100">Live Host Telemetry Active</h2>
            <p className="text-slate-400 mt-1 text-sm leading-relaxed">
              This dashboard provides real-time container status directly from the Docker daemon socket on the physical host machine.
              {isAdmin && <span className="block mt-1 text-emerald-400">✅ <strong>Admin Mode:</strong> You have full execution privileges to start and stop remote containers.</span>}
              {!isAdmin && <span className="block mt-1 text-amber-400">⚠️ <strong>Read-Only Mode:</strong> Container orchestration commands (`ContainerStart`, `ContainerStop`) are disabled for your account.</span>}
            </p>
          </div>
        </div>

        <h3 className="text-sm font-bold tracking-wider text-slate-500 mb-6 uppercase">Infrastructure Targets</h3>

        {/* Targets List */}
        <div className="space-y-4">
          {loading && widgets.length === 0 ? (
            <div className="animate-pulse flex gap-4 p-6 border border-slate-800 rounded-xl bg-slate-900">
              <div className="h-10 w-10 bg-slate-800 rounded-full"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 w-1/3 bg-slate-800 rounded"></div>
                <div className="h-3 w-1/4 bg-slate-800 rounded"></div>
              </div>
            </div>
          ) : widgets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl text-slate-500 bg-slate-900">
              No containers labeled with \`playground.widget\` found on the Docker host.
            </div>
          ) : (
            widgets.map((widget) => {
              const isRunning = widget.status === 'running';
              const isToggling = toggling === widget.id;

              return (
                <div key={widget.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-slate-800 rounded-xl bg-slate-900 shadow-sm hover:border-slate-700 transition gap-6 relative overflow-hidden">
                  
                  {/* Info */}
                  <div className="flex gap-4 items-center relative z-10">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl ${isRunning ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border border-slate-700 text-slate-500'}`}>
                      {widget.type === 'cache' ? '🗄️' : '📨'}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white tracking-tight">{widget.name}</h4>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="font-mono text-xs text-slate-500">ID: {widget.id}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span className={`font-medium ${isRunning ? 'text-emerald-400' : 'text-slate-500'}`}>
                          Status: {isRunning ? '🟢 Running' : '⚫ Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 relative z-10">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Host Usage</div>
                      <div className="text-sm text-slate-300 font-mono mt-1">
                        {isRunning ? 'Memory Locked' : 'Scaled to 0'}
                      </div>
                    </div>
                    
                    <div className="relative group">
                      <button
                        onClick={() => toggleWidget(widget.id)}
                        disabled={isToggling || !isAdmin}
                        className={`relative overflow-hidden min-w-[120px] px-5 py-2.5 rounded shadow-sm font-semibold transition-all duration-200 ${
                          !isAdmin 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            : isToggling 
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
                      
                      {/* Read-Only Tooltip */}
                      {!isAdmin && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 border border-slate-700 text-xs text-center text-amber-200 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          Orchestration is disabled in Read-Only mode.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Read-Only Background Hatching Overlay */}
                  {!isAdmin && (
                    <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #ffffff 10px, #ffffff 20px)' }}></div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
