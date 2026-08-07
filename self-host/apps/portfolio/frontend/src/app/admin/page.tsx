'use client';

import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Eye } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"
import ProjectsManager from "@/components/admin/ProjectsManager"
import BlogManager from "@/components/admin/BlogManager"
import ResumeRequests from "@/components/admin/ResumeRequests"
import StackManager from "@/components/admin/StackManager"
import ExperienceManager from "@/components/admin/ExperienceManager"
import EducationManager from "@/components/admin/EducationManager"
import CreditsManager from "@/components/admin/CreditsManager"
import ResumeFileUpload from "@/components/admin/ResumeFileUpload"
import HeroSection from "@/components/HeroSection"
import AboutPageBody, {
  type StackCategory,
  type CompanyExperience,
  type Education,
} from "@/components/AboutPageBody"
import AdminSidebar, { type AdminSection, sectionLabels, sectionCategories } from "@/components/admin/AdminSidebar"
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

  const [section, setSection] = useState<AdminSection>('homepage');

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
  const [heroDescription, setHeroDescription] = useState<string>('');
  const [configBaseline, setConfigBaseline] = useState({ resumeUrl: '', linkedinUrl: '', githubUrl: '', bio: '', heroDescription: '' });
  const [savingHomepage, setSavingHomepage] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);

  // Preview dialog - reuses the actual HeroSection/AboutPageBody components
  // (see those files) so this shows exactly what ships, not a hand-copied
  // mockup that can drift. About's stack/experience/education are fetched
  // lazily (only once, on first open) since the field being previewed here
  // is just the bio - the rest of that page's content isn't editable here.
  const [previewField, setPreviewField] = useState<'hero' | 'bio' | null>(null);
  const [aboutPreviewData, setAboutPreviewData] = useState<{ stack: StackCategory[]; experience: CompanyExperience[]; education: Education[] } | null>(null);
  const [loadingAboutPreview, setLoadingAboutPreview] = useState(false);

  const openBioPreview = async () => {
    setPreviewField('bio');
    if (aboutPreviewData) return;
    setLoadingAboutPreview(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const [stackData, experienceData, educationData] = await Promise.all([
        fetch(`${apiUrl}/api/stack`).then((r) => r.json()).catch(() => []),
        fetch(`${apiUrl}/api/experience`).then((r) => r.json()).catch(() => []),
        fetch(`${apiUrl}/api/education`).then((r) => r.json()).catch(() => []),
      ]);
      setAboutPreviewData({ stack: stackData || [], experience: experienceData || [], education: educationData || [] });
    } finally {
      setLoadingAboutPreview(false);
    }
  };

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
        heroDescription: data.heroDescription || '',
      };
      setResumeUrl(next.resumeUrl);
      setLinkedinUrl(next.linkedinUrl);
      setGithubUrl(next.githubUrl);
      setBio(next.bio);
      setHeroDescription(next.heroDescription);
      setConfigBaseline(next);
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Homepage and About each get their own dirty flag (and their own Save
  // button below) rather than sharing one - they're now separate tabs, so
  // editing one shouldn't block navigating to, or falsely flag, the other.
  // Resume's "active" file selection isn't tracked here at all: it
  // auto-saves on click (see setActiveResume) instead of needing a Save step.
  const homepageDirty =
    linkedinUrl !== configBaseline.linkedinUrl ||
    githubUrl !== configBaseline.githubUrl ||
    heroDescription !== configBaseline.heroDescription;

  const aboutDirty = bio !== configBaseline.bio;

  const isCurrentSectionDirty =
    section === 'homepage' ? homepageDirty :
    section === 'about' ? aboutDirty :
    sectionDirty;

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
    // Homepage/About don't remount on tab switch like the other managers do
    // (they're just top-level state in this component), so discarding here
    // has to explicitly roll the edited fields back to their last-saved
    // values - otherwise the flag clears but the stale draft stays in
    // memory and can get silently persisted by a later save on another tab.
    if (section === 'homepage') {
      setLinkedinUrl(configBaseline.linkedinUrl);
      setGithubUrl(configBaseline.githubUrl);
      setHeroDescription(configBaseline.heroDescription);
    } else if (section === 'about') {
      setBio(configBaseline.bio);
    }
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

  // Each of these three actions POSTs the full config object (the backend
  // overwrites all fields on every save, there's no partial-update route),
  // but only ever sends *its own* tab's live values - every other field goes
  // through as configBaseline (last-saved), never live state. That's what
  // stops, say, saving Homepage from accidentally persisting an unsaved,
  // still-in-progress edit sitting in the About tab.
  const saveHomepage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSavingHomepage(true);
    try {
      const res = await fetch('/api/proxy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeUrl: configBaseline.resumeUrl,
          bio: configBaseline.bio,
          linkedinUrl,
          githubUrl,
          heroDescription,
        }),
      });
      if (res.ok) {
        toast({ title: "Success", description: "Homepage settings saved!" });
        setConfigBaseline((prev) => ({ ...prev, linkedinUrl, githubUrl, heroDescription }));
      } else {
        toast({ title: "Error", description: "Failed to save homepage settings.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Network error while saving.", variant: "destructive" });
    } finally {
      setSavingHomepage(false);
    }
  };

  const saveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSavingAbout(true);
    try {
      const res = await fetch('/api/proxy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeUrl: configBaseline.resumeUrl,
          linkedinUrl: configBaseline.linkedinUrl,
          githubUrl: configBaseline.githubUrl,
          heroDescription: configBaseline.heroDescription,
          bio,
        }),
      });
      if (res.ok) {
        toast({ title: "Success", description: "About page bio saved!" });
        setConfigBaseline((prev) => ({ ...prev, bio }));
      } else {
        toast({ title: "Error", description: "Failed to save the bio.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Network error while saving.", variant: "destructive" });
    } finally {
      setSavingAbout(false);
    }
  };

  // Upload/delete in ResumeFileUpload already persist immediately - the
  // "active" pointer does the same here rather than needing its own Save
  // button and dirty-guard for a single field.
  const setActiveResume = async (path: string) => {
    if (!isAdmin) return;
    const previous = resumeUrl;
    setResumeUrl(path);
    try {
      const res = await fetch('/api/proxy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeUrl: path,
          linkedinUrl: configBaseline.linkedinUrl,
          githubUrl: configBaseline.githubUrl,
          heroDescription: configBaseline.heroDescription,
          bio: configBaseline.bio,
        }),
      });
      if (res.ok) {
        setConfigBaseline((prev) => ({ ...prev, resumeUrl: path }));
        toast({ title: "Success", description: path ? "Active resume updated." : "Active resume cleared." });
      } else {
        setResumeUrl(previous);
        toast({ title: "Error", description: "Failed to update the active resume.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      setResumeUrl(previous);
      toast({ title: "Error", description: "Network error while updating the active resume.", variant: "destructive" });
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
            {/* Tailwind's variant utilities (data-vertical:h-full on the
               Separator's own default styles) take cascade priority over a
               plain h-4 override regardless of class order, so an inline
               style is the only reliable way to shrink this to a small
               accent divider instead of the full header height. */}
            <Separator orientation="vertical" className="mr-2 bg-black/20" style={{ height: '1rem' }} />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block text-black/60 font-medium">
                  {sectionCategories[section]}
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
            {section === 'homepage' && (
              <div className="border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_#000]" style={{ borderRadius: '0.75rem' }}>
                <h2 className="text-xl font-extrabold mb-2">Homepage</h2>
                <p className="text-sm text-[var(--ds-charcoal)]/70 mb-8">
                  Copy and links shown on the homepage hero.
                </p>

                <form onSubmit={saveHomepage} className="space-y-6">
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
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider" htmlFor="heroDescription">Hero Description</label>
                      <button
                        type="button"
                        onClick={() => setPreviewField('hero')}
                        className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        Preview
                      </button>
                    </div>
                    <textarea
                      id="heroDescription"
                      value={heroDescription}
                      onChange={(e) => setHeroDescription(e.target.value)}
                      rows={2}
                      placeholder="Self-hosted infrastructure, actually running — with AI as a working collaborator, not a gimmick."
                      disabled={!isAdmin}
                      className={`${dsInput} disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                    <p className="text-xs text-[var(--ds-charcoal)]/70">The tagline under the headline on the homepage. Leave blank to use the default.</p>
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
                      disabled={!isAdmin || savingHomepage || !homepageDirty}
                      className={`px-6 py-2.5 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${pushBtnSm} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${
                        !isAdmin || savingHomepage || !homepageDirty ? 'bg-white text-[var(--ds-charcoal)]/50' : 'bg-black text-white'
                      }`}
                      style={{ borderRadius: '0.5rem' }}
                    >
                      {savingHomepage ? 'Saving to Redis...' : 'Save Homepage'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {section === 'about' && (
              <div className="border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_#000]" style={{ borderRadius: '0.75rem' }}>
                <h2 className="text-xl font-extrabold mb-2">About</h2>
                <p className="text-sm text-[var(--ds-charcoal)]/70 mb-8">
                  The intro paragraph on the About page. Stack, Experience, and Education have their own tabs.
                </p>

                <form onSubmit={saveAbout} className="space-y-6">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider" htmlFor="bio">Bio</label>
                      <button
                        type="button"
                        onClick={openBioPreview}
                        className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        Preview
                      </button>
                    </div>
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
                      disabled={!isAdmin || savingAbout || !aboutDirty}
                      className={`px-6 py-2.5 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${pushBtnSm} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${
                        !isAdmin || savingAbout || !aboutDirty ? 'bg-white text-[var(--ds-charcoal)]/50' : 'bg-black text-white'
                      }`}
                      style={{ borderRadius: '0.5rem' }}
                    >
                      {savingAbout ? 'Saving to Redis...' : 'Save Bio'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {section === 'projects' && <ProjectsManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}
            {section === 'blog' && <BlogManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}
            {section === 'stack' && <StackManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}
            {section === 'experience' && <ExperienceManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}
            {section === 'education' && <EducationManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}
            {section === 'credits' && <CreditsManager isAdmin={isAdmin} onDirtyChange={setSectionDirty} />}

            {section === 'resume' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-extrabold mb-2">Resume Requests</h2>
                  <p className="text-sm text-[var(--ds-charcoal)]/70">Manage incoming requests for your private resume PDF.</p>
                </div>

                <div className="border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_#000]" style={{ borderRadius: '0.75rem' }}>
                  <h3 className="text-lg font-extrabold mb-1">Resume / CV Files</h3>
                  <p className="text-sm text-[var(--ds-charcoal)]/70 mb-6">
                    Upload one or more resume/CV files, then mark one &quot;Active&quot; — that&apos;s the file a 24h expiring link is generated for when a request below is approved. Uploads, deletes, and setting the active file all save immediately.
                  </p>
                  <ResumeFileUpload isAdmin={isAdmin} activePath={resumeUrl} onActivePathChange={setActiveResume} />
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

      <Dialog open={previewField !== null} onOpenChange={(open) => !open && setPreviewField(null)}>
        <DialogContent
          className="sm:max-w-4xl max-h-[85vh] overflow-y-auto bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-black font-extrabold">
              {previewField === 'hero' ? 'Homepage hero preview' : 'About page preview'}
            </DialogTitle>
            <DialogDescription className="text-[var(--ds-charcoal)]/70">
              {previewField === 'hero'
                ? 'Unsaved changes — this is the actual homepage hero section.'
                : 'Unsaved changes to the bio - Stack, Experience, and Education below reflect what’s currently published.'}
            </DialogDescription>
          </DialogHeader>
          {previewField === 'hero' && (
            <div className="border-2 border-black overflow-hidden -mx-4 sm:mx-0" style={{ borderRadius: '0.5rem' }}>
              <HeroSection description={heroDescription} githubUrl={githubUrl} linkedinUrl={linkedinUrl} onRequestResume={() => {}} />
            </div>
          )}
          {previewField === 'bio' && (
            loadingAboutPreview ? (
              <p className="text-sm text-[var(--ds-charcoal)]/60">Loading Stack, Experience, and Education&hellip;</p>
            ) : (
              <div className="border-2 border-black bg-white p-8" style={{ borderRadius: '0.5rem' }}>
                <AboutPageBody
                  bio={bio}
                  stack={aboutPreviewData?.stack || []}
                  experience={aboutPreviewData?.experience || []}
                  education={aboutPreviewData?.education || []}
                />
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
