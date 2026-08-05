'use client';

import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useToast } from "@/hooks/use-toast"
import ProjectsManager from "@/components/admin/ProjectsManager"
import BlogManager from "@/components/admin/BlogManager"
import ResumeRequests from "@/components/admin/ResumeRequests"
import StackManager from "@/components/admin/StackManager"
import ExperienceManager from "@/components/admin/ExperienceManager"
import EducationManager from "@/components/admin/EducationManager"
import CreditsManager from "@/components/admin/CreditsManager"
import AdminSidebar, { type AdminSection, sectionLabels } from "@/components/admin/AdminSidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const dsInput =
  "h-auto w-full px-3 py-2.5 bg-white border-2 border-black rounded-[0.5rem] text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] focus-visible:ring-0 transition-shadow";

const pushBtnSm =
  "transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-0.5 hover:translate-y-0.5";

export default function AdminDashboard() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const userEmail = session?.user?.email || 'Unknown User';

  const [section, setSection] = useState<AdminSection>('projects');

  // Unsaved-changes guard. Only one content manager is ever mounted at a
  // time (conditional rendering below), so a single shared flag - reported
  // up via each manager's onDirtyChange - is enough to know whether the
  // *currently active* tab has unsaved edits; switching sections remounts
  // a fresh manager whose own effect reports false once it has fetched its
  // baseline, so this resets itself naturally rather than needing a manual
  // reset per tab.
  const [sectionDirty, setSectionDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    { type: 'section'; value: AdminSection } | { type: 'signout' } | { type: 'browser-back' } | null
  >(null);

  // Configuration State
  const [resumeUrl, setResumeUrl] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [configBaseline, setConfigBaseline] = useState({ resumeUrl: '', linkedinUrl: '', githubUrl: '', bio: '' });
  const [savingConfig, setSavingConfig] = useState(false);

  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/api/config');
      const data = await res.json();
      const next = {
        resumeUrl: data.resumeUrl || '',
        linkedinUrl: data.linkedinUrl || '',
        githubUrl: data.githubUrl || '',
        bio: data.bio || '',
      };
      setResumeUrl(next.resumeUrl);
      setLinkedinUrl(next.linkedinUrl);
      setGithubUrl(next.githubUrl);
      setBio(next.bio);
      setConfigBaseline(next);
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const configDirty =
    resumeUrl !== configBaseline.resumeUrl ||
    linkedinUrl !== configBaseline.linkedinUrl ||
    githubUrl !== configBaseline.githubUrl ||
    bio !== configBaseline.bio;

  const isCurrentSectionDirty = section === 'settings' ? configDirty : sectionDirty;

  // beforeunload's handler closure is only refreshed when this effect
  // re-runs (on isCurrentSectionDirty changing), which happens on the next
  // render - too late for a synchronous "discard, then navigate away right
  // now" call in the same tick (see confirmDiscard). dirtyRef gives that
  // call somewhere to flip the flag instantly so the native prompt doesn't
  // fire a second time on top of our own dialog.
  const dirtyRef = useRef(isCurrentSectionDirty);
  useEffect(() => {
    dirtyRef.current = isCurrentSectionDirty;
  }, [isCurrentSectionDirty]);

  // Native browser prompt for actual page unloads (closing the tab,
  // refreshing, or the "View Portfolio" link - a real <a href> navigation)
  // that we can't intercept with our own UI - browsers deliberately don't
  // allow a page to customize or replace this dialog, as a phishing
  // safeguard. Registered once; reads dirtyRef so it always sees the
  // current value without needing to re-subscribe.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // In-app tab switches and Sign Out don't unload the page, so those are
  // guarded with our own confirm dialog below.
  //
  // The browser Back/Forward buttons *do* trigger a real unload once they
  // cross out of this document - which is exactly the native dialog above
  // firing, uncustomizable. What we *can* do is trap the first step of that
  // navigation: while dirty, push a duplicate history entry so a Back press
  // first lands on a same-document "popstate" we control instead of leaving
  // outright. We re-trap on every popstate and show our own dialog instead;
  // confirming replays the Back with the guard cleared (see confirmDiscard).
  useEffect(() => {
    if (!isCurrentSectionDirty) return;
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
      setPendingAction({ type: 'browser-back' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isCurrentSectionDirty]);

  const requestNavigate = (next: AdminSection) => {
    if (next === section) return;
    if (isCurrentSectionDirty) {
      setPendingAction({ type: 'section', value: next });
    } else {
      setSection(next);
    }
  };

  const requestSignOut = () => {
    if (isCurrentSectionDirty) {
      setPendingAction({ type: 'signout' });
    } else {
      signOut({ callbackUrl: '/' });
    }
  };

  const confirmDiscard = () => {
    if (!pendingAction) return;
    dirtyRef.current = false;
    setSectionDirty(false);
    if (pendingAction.type === 'section') {
      setSection(pendingAction.value);
    } else if (pendingAction.type === 'signout') {
      signOut({ callbackUrl: '/' });
    } else {
      // Two guard entries deep at this point (the initial trap push, plus
      // the re-trap from the popstate that opened this dialog) - go(-2)
      // lands back where the user's Back press was actually trying to go.
      window.history.go(-2);
    }
    setPendingAction(null);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSavingConfig(true);
    try {
      const res = await fetch('/api/proxy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeUrl, linkedinUrl, githubUrl, bio }),
      });
      if (res.ok) {
        toast({ title: "Success", description: "Settings saved successfully to Redis!" });
        setConfigBaseline({ resumeUrl, linkedinUrl, githubUrl, bio });
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

  return (
    <TooltipProvider>
      <SidebarProvider style={{ fontFamily: 'var(--ds-font-body)' } as React.CSSProperties}>
        <AdminSidebar
          active={section}
          onNavigate={requestNavigate}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onSignOut={requestSignOut}
        />
        <SidebarInset className="bg-white text-[var(--ds-charcoal)]">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b-2 border-black bg-[var(--ds-yellow)] px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-black/20" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block text-black/60 font-medium">
                  Control Plane
                </BreadcrumbItem>
                <BreadcrumbItem className="hidden md:block text-black/40">/</BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-extrabold text-black" style={{ fontFamily: 'var(--ds-font-display)' }}>
                    {sectionLabels[section]}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <main className="flex-1 p-6 w-full">
            {section === 'settings' && (
              <div className="space-y-8">
                <div className="border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_#000]" style={{ borderRadius: '0.75rem' }}>
                  <h2 className="text-xl font-extrabold mb-2">Portfolio Configuration</h2>
                  <p className="text-sm text-[var(--ds-charcoal)]/70 mb-8">
                    These settings are securely persisted in the Redis infrastructure cache via the Go API.
                  </p>

                  <form onSubmit={handleSaveConfig} className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider" htmlFor="resumeUrl">Filebrowser Resume Path</label>
                      <input
                        id="resumeUrl"
                        value={resumeUrl}
                        onChange={(e) => setResumeUrl(e.target.value)}
                        placeholder="/resume.pdf"
                        disabled={!isAdmin}
                        className={`${dsInput} disabled:opacity-50 disabled:cursor-not-allowed`}
                      />
                      <p className="text-xs text-[var(--ds-charcoal)]/70">The file path in Filebrowser to generate expiring links for (e.g. <code>/resume.pdf</code>).</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider" htmlFor="linkedinUrl">LinkedIn URL</label>
                      <input
                        id="linkedinUrl"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/chin-yi-zhe..."
                        disabled={!isAdmin}
                        className={`${dsInput} disabled:opacity-50 disabled:cursor-not-allowed`}
                      />
                      <p className="text-xs text-[var(--ds-charcoal)]/70">The link for the &quot;LinkedIn&quot; button.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider" htmlFor="githubUrl">GitHub Repository URL</label>
                      <input
                        id="githubUrl"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/yizhe1997/systems-playground"
                        disabled={!isAdmin}
                        className={`${dsInput} disabled:opacity-50 disabled:cursor-not-allowed`}
                      />
                      <p className="text-xs text-[var(--ds-charcoal)]/70">The link for the &quot;GitHub&quot; button.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider" htmlFor="bio">About Page Bio</label>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        placeholder="Chin Yi Zhe — Backend / Platform Engineer. Builds and operates real self-hosted infrastructure, with AI as a working collaborator rather than a novelty."
                        disabled={!isAdmin}
                        className={`${dsInput} disabled:opacity-50 disabled:cursor-not-allowed`}
                      />
                      <p className="text-xs text-[var(--ds-charcoal)]/70">The intro paragraph shown at the top of the <code>/about</code> page. Leave blank to use the default.</p>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t-2 border-black">
                      {!isAdmin ? (
                        <span className="text-sm font-bold text-[var(--ds-charcoal)]/70">
                          Configuration updates require Admin privileges
                        </span>
                      ) : (
                        <div />
                      )}

                      <button
                        type="submit"
                        disabled={!isAdmin || savingConfig || !configDirty}
                        className={`px-6 py-2.5 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${pushBtnSm} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${
                          !isAdmin || savingConfig || !configDirty ? 'bg-white text-[var(--ds-charcoal)]/50' : 'bg-black text-white'
                        }`}
                        style={{ borderRadius: '0.5rem' }}
                      >
                        {savingConfig ? 'Saving to Redis...' : 'Save Settings'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {section === 'projects' && <ProjectsManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}
            {section === 'blog' && <BlogManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}
            {section === 'stack' && <StackManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}
            {section === 'experience' && <ExperienceManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}
            {section === 'education' && <EducationManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}
            {section === 'credits' && <CreditsManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}

            {section === 'resume' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-extrabold mb-2">Resume Requests</h2>
                  <p className="text-sm text-[var(--ds-charcoal)]/70">Manage incoming requests for your private resume PDF.</p>
                </div>
                <ResumeRequests isAdmin={isAdmin} />
              </div>
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>

      <Dialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent
          className="sm:max-w-sm bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-black font-extrabold">Discard unsaved changes?</DialogTitle>
            <DialogDescription className="text-[var(--ds-charcoal)]/70">
              You have changes on this tab that haven&apos;t been saved. Leaving now will lose them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingAction(null)}
              className="border-2 border-black rounded-[0.5rem] font-bold"
            >
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDiscard}
              className="border-2 border-black rounded-[0.5rem] font-bold"
            >
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
