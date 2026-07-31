import { readFile } from 'fs/promises';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Privacy Policy',
};

export default async function PrivacyPage() {
  const raw = await readFile(
    path.join(process.cwd(), 'src/content/legal/privacy-policy.md'),
    'utf-8'
  );
  const body = raw.replace(/^# .+\n/, '').trim();

  return (
    <main className="min-h-screen flex flex-col bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <div className="flex-1 max-w-4xl mx-auto px-6 py-20 w-full">
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
          Privacy Policy
        </h1>

        <div className="prose prose-headings:font-extrabold prose-a:text-black prose-a:underline max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
