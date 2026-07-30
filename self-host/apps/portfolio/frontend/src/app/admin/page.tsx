'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useToast } from "@/hooks/use-toast"
import CmsManager from "@/components/admin/CmsManager"
import ResumeRequests from "@/components/admin/ResumeRequests"
import AdminTabBar, { tabId, tabPanelId } from "@/components/admin/AdminTabBar"

const dsInput =
  "h-auto w-full px-3 py-2.5 bg-white border-2 border-black rounded-[0.5rem] text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] focus-visible:ring-0 transition-shadow";

const pushBtnSm =
  "transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-0.5 hover:translate-y-0.5";

export default function AdminDashboard() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const userEmail = session?.user?.email || 'Unknown User';

  const [tab, setTab] = useState<'cms' | 'resume' | 'settings'>('cms');

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

  return (
    <div className="min-h-screen bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      {/* Header */}
      <header className="border-b-2 border-black bg-[var(--ds-yellow)] sticky top-0 z-10 px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1
            className="text-2xl text-black"
            style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            Control Plane
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-xs font-bold bg-white px-2.5 py-1 border-2 border-black" style={{ borderRadius: '0.375rem' }}>
              {userEmail}
            </div>
            <span
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-2 border-black"
              style={{ borderRadius: '999px', backgroundColor: isAdmin ? 'var(--ds-charcoal)' : 'var(--ds-white)', color: isAdmin ? 'var(--ds-white)' : 'var(--ds-charcoal)' }}
            >
              Role: {isAdmin ? 'ADMIN' : 'READ ONLY'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-bold border-2 border-black bg-white hover:bg-black hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            style={{ borderRadius: '0.5rem' }}
          >
            &larr; Portfolio
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2 text-sm font-bold text-[var(--ds-charcoal)]/70 hover:text-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 mt-8">
        <div className="mb-8">
          <AdminTabBar
            idPrefix="admin"
            tabs={[
              { value: 'cms', label: 'CMS & Portfolio' },
              { value: 'resume', label: 'Resume Requests' },
              { value: 'settings', label: 'Global Settings' },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {tab === 'settings' && (
          <div id={tabPanelId('admin', 'settings')} role="tabpanel" aria-labelledby={tabId('admin', 'settings')} className="space-y-8">
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
                  <p className="text-xs text-[var(--ds-charcoal)]/60">The file path in Filebrowser to generate expiring links for (e.g. <code>/resume.pdf</code>).</p>
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
                  <p className="text-xs text-[var(--ds-charcoal)]/60">The link for the &quot;LinkedIn&quot; button.</p>
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
                  <p className="text-xs text-[var(--ds-charcoal)]/60">The link for the &quot;GitHub&quot; button.</p>
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

        {tab === 'cms' && (
          <div id={tabPanelId('admin', 'cms')} role="tabpanel" aria-labelledby={tabId('admin', 'cms')}>
            <div className="mb-6">
              <h2 className="text-xl font-extrabold mb-2">CMS &amp; Portfolio Manager</h2>
              <p className="text-sm text-[var(--ds-charcoal)]/70">Configure your homepage layout, dynamic projects, and markdown documentation.</p>
            </div>
            <CmsManager isAdmin={isAdmin} />
          </div>
        )}

        {tab === 'resume' && (
          <div id={tabPanelId('admin', 'resume')} role="tabpanel" aria-labelledby={tabId('admin', 'resume')}>
            <div className="mb-6">
              <h2 className="text-xl font-extrabold mb-2">Resume Requests</h2>
              <p className="text-sm text-[var(--ds-charcoal)]/70">Manage incoming requests for your private resume PDF.</p>
            </div>
            <ResumeRequests isAdmin={isAdmin} />
          </div>
        )}
      </main>
    </div>
  );
}
