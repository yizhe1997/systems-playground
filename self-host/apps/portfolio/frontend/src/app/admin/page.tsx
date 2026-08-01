'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useToast } from "@/hooks/use-toast"
import CmsManager from "@/components/admin/CmsManager"
import ResumeRequests from "@/components/admin/ResumeRequests"
import StackManager from "@/components/admin/StackManager"
import ExperienceManager from "@/components/admin/ExperienceManager"
import EducationManager from "@/components/admin/EducationManager"
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

const dsInput =
  "h-auto w-full px-3 py-2.5 bg-white border-2 border-black rounded-[0.5rem] text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] focus-visible:ring-0 transition-shadow";

const pushBtnSm =
  "transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-0.5 hover:translate-y-0.5";

export default function AdminDashboard() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const userEmail = session?.user?.email || 'Unknown User';

  const [section, setSection] = useState<AdminSection>('homepage');

  // Configuration State
  const [resumeUrl, setResumeUrl] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState(false);

  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/api/config');
      const data = await res.json();
      setResumeUrl(data.resumeUrl || '');
      setLinkedinUrl(data.linkedinUrl || '');
      setGithubUrl(data.githubUrl || '');
      setBio(data.bio || '');
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

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
          onNavigate={setSection}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onSignOut={() => signOut({ callbackUrl: '/' })}
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

          <main className="flex-1 p-6 max-w-4xl w-full">
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
                        disabled={!isAdmin || savingConfig}
                        className={`px-6 py-2.5 text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${pushBtnSm} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${
                          !isAdmin || savingConfig ? 'bg-white text-[var(--ds-charcoal)]/50' : 'bg-black text-white'
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

            {(section === 'homepage' || section === 'projects' || section === 'docs') && (
              <CmsManager section={section} isAdmin={isAdmin} />
            )}

            {section === 'stack' && <StackManager isAdmin={isAdmin} />}
            {section === 'experience' && <ExperienceManager isAdmin={isAdmin} />}
            {section === 'education' && <EducationManager isAdmin={isAdmin} />}

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
    </TooltipProvider>
  );
}
