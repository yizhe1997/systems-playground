'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import CmsManager from "@/components/admin/CmsManager"
import ResumeRequests from "@/components/admin/ResumeRequests"
import ThemeToggle from "@/components/ThemeToggle"

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

  // Configuration State
  const [resumeUrl, setResumeUrl] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState(false);

  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/api/config');
      const data = await res.json();
      setResumeUrl(data.resumeUrl || '');
      setLinkedinUrl(data.linkedinUrl || '');
      setGithubUrl(data.githubUrl || '');
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

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
    fetchConfig();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/demo';
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'WIDGETS_UPDATED') {
            fetchWidgets();
          }
        } catch (e) {}
      };
      ws.onclose = () => {
        reconnectTimer = setTimeout(connectWs, 3000);
      };
    };
    connectWs();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setSavingConfig(true);
    try {
      const res = await fetch('/api/proxy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeUrl, linkedinUrl, githubUrl }),
      });
      if (res.ok) {
        toast({ title: "Success", description: "Settings saved successfully to Redis!" });
      } else {
        toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Network error while saving settings.", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span className="text-primary">⚙️</span> CONTROL PLANE
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="text-xs font-mono text-muted-foreground bg-accent px-2.5 py-1 rounded-md border border-border">
              {userEmail}
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${isAdmin ? 'bg-primary/10 text-primary border-primary/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
              Role: {isAdmin ? 'ADMIN' : 'READ ONLY'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="w-px h-5 bg-border hidden sm:block" />
          <Link href="/" className="px-4 py-2 text-sm font-medium border border-border bg-card rounded-xl hover:bg-accent hover:border-primary/50 transition">
            ← Portfolio
          </Link>
          <button 
            onClick={() => signOut({ callbackUrl: '/' })} 
            className="px-4 py-2 text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20 rounded-xl hover:bg-destructive hover:text-destructive-foreground transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 mt-8">
        <Tabs defaultValue="orchestration" className="w-full">
          <div className="flex justify-between items-center mb-8">
            <TabsList className="bg-card border border-border/50 shadow-sm flex flex-wrap h-auto">
              <TabsTrigger value="orchestration" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground py-2.5 transition-colors">
                Container Orchestration
              </TabsTrigger>
              <TabsTrigger value="cms" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground py-2.5 transition-colors">
                CMS & Portfolio
              </TabsTrigger>
              <TabsTrigger value="resume" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground py-2.5 transition-colors">
                Resume Requests
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground py-2.5 transition-colors">
                Global Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="orchestration" className="space-y-8 animate-in fade-in-50 duration-500">
            {/* Status Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex gap-4 items-start shadow-inner">
              <div className="text-primary text-xl">ℹ️</div>
              <div>
                <h2 className="text-lg font-semibold text-primary">Live Host Telemetry Active</h2>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  This dashboard provides real-time container status directly from the Docker daemon socket on the physical host machine.
                  {isAdmin && <span className="block mt-2 text-emerald-500 font-medium">✅ Admin Mode: You have full execution privileges to start and stop remote containers.</span>}
                  {!isAdmin && <span className="block mt-2 text-amber-500 font-medium">⚠️ Read-Only Mode: Container orchestration commands (`ContainerStart`, `ContainerStop`) are disabled for your account.</span>}
                </p>
              </div>
            </div>

            <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Infrastructure Targets</h3>

            {/* Targets List */}
            <div className="space-y-4">
              {loading && widgets.length === 0 ? (
                <div className="animate-pulse flex gap-4 p-6 border border-border/50 rounded-xl bg-card">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-1/3 bg-muted rounded"></div>
                    <div className="h-3 w-1/4 bg-muted rounded"></div>
                  </div>
                </div>
              ) : widgets.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground bg-card">
                  No containers labeled with `playground.widget` found on the Docker host.
                </div>
              ) : (
                widgets.map((widget) => {
                  const isRunning = widget.status === 'running';
                  const isToggling = toggling === widget.id;

                  return (
                    <div key={widget.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-border/50 rounded-xl bg-card shadow-sm hover:border-border transition gap-6 relative overflow-hidden">
                      
                      {/* Info */}
                      <div className="flex gap-4 items-center relative z-10">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl ${isRunning ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-muted border border-border text-muted-foreground'}`}>
                          {widget.type === 'cache' ? '🗄️' : '📨'}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground tracking-tight">{widget.name}</h4>
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="font-mono text-xs text-muted-foreground">ID: {widget.id}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                            <span className={`font-medium ${isRunning ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                              Status: {isRunning ? '🟢 Running' : '⚫ Offline'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions & Metrics */}
                      <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6 relative z-10">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Host Usage</div>
                          <div className="text-sm text-foreground font-mono mt-1">
                            {isRunning ? 'Memory Locked' : 'Scaled to 0'}
                          </div>
                        </div>
                        
                        <div className="relative group">
                          <button
                            onClick={() => toggleWidget(widget.id)}
                            disabled={isToggling || !isAdmin}
                            className={`relative overflow-hidden min-w-[120px] px-5 py-2.5 rounded shadow-sm font-semibold transition-all duration-200 ${
                              !isAdmin 
                                ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                                : isToggling 
                                  ? 'bg-muted text-muted-foreground cursor-wait' 
                                  : isRunning 
                                    ? 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/30' 
                                    : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/30'
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
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-center text-amber-200 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
          </TabsContent>

          <TabsContent value="settings" className="space-y-8 animate-in fade-in-50 duration-500">
            <div className="border border-border /50 rounded-xl bg-card  p-8 shadow-sm">
              <h2 className="text-xl font-bold text-foreground  mb-2">Portfolio Configurations</h2>
              <p className="text-muted-foreground dark:text-muted-foreground/70 text-sm mb-8">
                These settings are securely persisted in the <strong>Redis Infrastructure Cache</strong> via the Golang API.
              </p>
              
              <form onSubmit={handleSaveConfig} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="resumeUrl" className="text-slate-300 font-medium">Filebrowser Resume Path</Label>
                  <Input 
                    id="resumeUrl" 
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                    placeholder="/resume.pdf"
                    disabled={!isAdmin}
                    className="bg-card dark:bg-black/90 border-slate-300 dark:border-slate-700 text-foreground  placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">The file path in Filebrowser to generate expiring links for (e.g. <code>/resume.pdf</code>).</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl" className="text-slate-300 font-medium">LinkedIn URL</Label>
                  <Input 
                    id="linkedinUrl" 
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/chin-yi-zhe..."
                    disabled={!isAdmin}
                    className="bg-card dark:bg-black/90 border-slate-300 dark:border-slate-700 text-foreground  placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">The link for the "View LinkedIn" button.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="githubUrl" className="text-slate-300 font-medium">GitHub Repository URL</Label>
                  <Input 
                    id="githubUrl" 
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/yizhe1997/systems-playground"
                    disabled={!isAdmin}
                    className="bg-card dark:bg-black/90 border-slate-300 dark:border-slate-700 text-foreground  placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">The link for the "View GitHub" button.</p>
                </div>
                
                <div className="pt-4 flex items-center justify-between border-t border-border /50">
                  {!isAdmin ? (
                    <span className="text-amber-500 text-sm font-medium flex items-center gap-2">
                      ⚠️ Configuration updates require Admin privileges
                    </span>
                  ) : (
                    <div />
                  )}
                  
                  <button 
                    type="submit"
                    disabled={!isAdmin || savingConfig}
                    className={`px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors ${
                      !isAdmin || savingConfig
                        ? 'bg-slate-800 text-muted-foreground cursor-not-allowed border border-slate-300 dark:border-slate-700'
                        : 'bg-primary hover:bg-primary text-white border border-indigo-500'
                    }`}
                  >
                    {savingConfig ? 'Saving to Redis...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="cms" className="animate-in fade-in-50 duration-500">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground  mb-2">CMS & Portfolio Manager</h2>
              <p className="text-muted-foreground dark:text-muted-foreground/70">Configure your homepage layout, dynamic projects, and markdown documentation.</p>
            </div>
            <CmsManager isAdmin={isAdmin} widgets={widgets} />
          </TabsContent>

          <TabsContent value="resume" className="animate-in fade-in-50 duration-500">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground  mb-2">Resume Requests</h2>
              <p className="text-muted-foreground dark:text-muted-foreground/70">Manage incoming requests for your private resume PDF.</p>
            </div>
            <ResumeRequests isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
