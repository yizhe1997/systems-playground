import { readFile } from 'fs/promises';
import path from 'path';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import LegalDocument from '@/components/LegalDocument';

export const metadata = {
  title: 'Terms & Conditions',
};

export default async function TermsPage() {
  const raw = await readFile(
    path.join(process.cwd(), 'src/content/legal/terms.md'),
    'utf-8'
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 w-full">
        <h1
          className="mb-12 text-black"
          style={{
            fontFamily: 'var(--ds-font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
          }}
        >
          Terms &amp; Conditions
        </h1>

        <LegalDocument raw={raw} contactEmail="yzportal123@gmail.com" />
      </main>
      <SiteFooter />
    </div>
  );
}
