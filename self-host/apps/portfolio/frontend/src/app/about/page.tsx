'use client';

import { useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import AboutPageBody, { type StackCategory, type CompanyExperience, type Education } from '@/components/AboutPageBody';
import { fetchJson } from '@/lib/fetch-json';

// Thin data-fetching wrapper - the actual "menu card" markup lives in AboutPageBody, shared with
// the admin Settings preview dialog (see src/app/admin/page.tsx) so the two can't drift apart.
export default function AboutPage() {
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState<CompanyExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [stack, setStack] = useState<StackCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      // Same /api/config the admin's "About" tab writes to (the "bio" field, described there as
      // "The intro paragraph shown at the top of the /about page") and SiteFooter already reads
      // for its social links - this is the real content STARTERS shows, not invented facts.
      fetchJson<{ bio?: string }>('/api/config').catch((err) => { console.error('Failed to load config:', err); return { bio: '' }; }),
      fetchJson<CompanyExperience[]>('/api/experience').catch((err) => { console.error('Failed to load experience:', err); return []; }),
      fetchJson<Education[]>('/api/education').catch((err) => { console.error('Failed to load education:', err); return []; }),
      fetchJson<StackCategory[]>('/api/stack').catch((err) => { console.error('Failed to load stack:', err); return []; }),
    ]).then(([config, exp, edu, stk]) => {
      setBio(config.bio || '');
      setExperience(exp || []);
      setEducation(edu || []);
      setStack(stk || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <main className="flex-1 w-full" style={{ backgroundColor: 'var(--ds-sage)' }}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-10 py-10 sm:py-16">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ds-charcoal)' }} />
            </div>
          ) : (
            <AboutPageBody bio={bio} stack={stack} experience={experience} education={education} />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
