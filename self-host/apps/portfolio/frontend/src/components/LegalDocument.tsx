import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Mail } from 'lucide-react';
import { slugify } from '@/lib/utils';

export default function LegalDocument({ raw, contactEmail }: { raw: string; contactEmail?: string }) {
  const body = raw.replace(/^# .+\n/, '').trim();

  const sections = Array.from(body.matchAll(/^## (.+)$/gm)).map((m) => ({
    text: m[1],
    slug: slugify(m[1]),
  }));

  return (
    <>
      {sections.length > 0 && (
        <nav
          aria-label="Sections"
          className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_#000] mb-12 max-w-md"
          style={{ borderRadius: '0.75rem' }}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4 text-[var(--ds-charcoal)]/70">
            On this page
          </h2>
          <ul className="space-y-2.5 text-sm">
            {sections.map((s) => (
              <li key={s.slug}>
                <a
                  href={`#${s.slug}`}
                  className="font-medium text-[var(--ds-charcoal)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
                >
                  {s.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="prose prose-headings:font-extrabold prose-a:text-black prose-a:underline max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ children, ...props }) => (
              <h2
                {...props}
                id={slugify(String(children))}
                className="scroll-mt-28 pb-2 border-b-2 border-black/10"
              >
                {children}
              </h2>
            ),
            blockquote: ({ children, ...props }) => (
              <blockquote
                {...props}
                className="not-italic border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000] bg-[var(--ds-sage)]/30"
                style={{ borderRadius: '0.75rem' }}
              >
                {children}
              </blockquote>
            ),
            hr: (props) => <hr {...props} className="border-t-2 border-black my-10" />,
          }}
        >
          {body}
        </ReactMarkdown>

        {contactEmail && (
          <a
            href={`mailto:${contactEmail}`}
            className="not-prose inline-flex items-center gap-2 px-6 py-3.5 mt-8 bg-black text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            style={{ borderRadius: '0.75rem' }}
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            Email {contactEmail}
          </a>
        )}
      </div>
    </>
  );
}
