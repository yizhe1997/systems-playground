import { readFile } from 'fs/promises';
import path from 'path';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import LegalDocument from '@/components/LegalDocument';

export const metadata = {
  title: 'Privacy Policy',
};

export default async function PrivacyPage() {
  const raw = await readFile(
    path.join(process.cwd(), 'src/content/legal/privacy-policy.md'),
    'utf-8'
  );

  return (
    <div className="min-h-screen flex flex-col text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <main className="flex-1 w-full px-6 pt-20" style={{ backgroundColor: 'var(--ds-sage)' }}>
        <LegalDocument raw={raw} />
      </main>
      <SiteFooter />
    </div>
  );
}
