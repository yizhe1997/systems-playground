import { readFile } from 'fs/promises';
import path from 'path';
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
      <main className="flex-1 w-full px-6 pt-20" style={{ backgroundColor: 'var(--ds-sage)' }}>
        <LegalDocument raw={raw} />
      </main>
  );
}
