'use client';
import { FileDown } from 'lucide-react';
import ReactiveGrid from '@/components/originkit/reactivegrid';
import { GithubIcon, LinkedinIcon } from '@/components/icons/social';

const pushBtn =
  'transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-1';

const isConfigured = (url: string) => !!url && url !== '#';

const formatUrl = (url: string) => {
  if (!url || url === '#') return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

// Shared between the live homepage and the admin Settings preview dialog -
// a hand-copied mockup drifts from the real thing the moment either side
// changes, so this is the actual hero markup, parameterized on the fields
// Settings can edit.
export default function HeroSection({
  description,
  githubUrl,
  linkedinUrl,
  onRequestResume,
}: {
  description: string;
  githubUrl: string;
  linkedinUrl: string;
  onRequestResume: () => void;
}) {
  return (
    <section className="relative border-b-2 border-black overflow-hidden" style={{ backgroundColor: 'var(--ds-yellow)' }}>
      <ReactiveGrid
        shape="circle"
        fill="solid"
        particleColor="rgba(0,0,0,0.25)"
        backgroundColor="#ffe17c"
        minSize={4}
        maxSize={10}
        gap={25}
        influence={75}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 sm:py-28 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <span
            className="inline-flex items-center px-4 py-1.5 bg-white border-2 border-black text-xs font-bold mb-6"
            style={{ borderRadius: '0.75rem' }}
          >
            BACKEND / PLATFORM ENGINEER
          </span>

          <h1
            className="text-black mb-6"
            style={{
              fontFamily: 'var(--ds-font-display)',
              fontSize: 'clamp(2.5rem, 7vw, 6rem)',
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
            }}
          >
            Chin Yi Zhe
            <br />
            builds{' '}
            <span
              className="text-white drop-shadow-[4px_4px_0px_#000]"
              style={{
                WebkitTextStroke: '4px black',
              }}
            >
              REAL
            </span>{' '}
            systems.
          </h1>

          <p className="text-lg font-medium max-w-md mb-8">
            {description}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={onRequestResume}
              className={`inline-flex items-center gap-2 px-6 py-3.5 bg-black text-white font-bold border-2 border-black shadow-[8px_8px_0px_0px_#000] hover:shadow-none ${pushBtn} focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2`}
              style={{ borderRadius: '0.75rem' }}
            >
              <FileDown className="w-4 h-4" aria-hidden="true" />
              Request resume
            </button>
            {isConfigured(githubUrl) && (
              <a
                href={formatUrl(githubUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-black font-bold border-2 border-black shadow-[4px_8px_0px_0px_#000] hover:shadow-none transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                style={{ borderRadius: '0.75rem' }}
              >
                <GithubIcon />
                GitHub
              </a>
            )}
            {isConfigured(linkedinUrl) && (
              <a
                href={formatUrl(linkedinUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-black font-bold border-2 border-black shadow-[4px_8px_0px_0px_#000] hover:shadow-none transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                style={{ borderRadius: '0.75rem' }}
              >
                <LinkedinIcon />
                LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Browser mockup - real stack info, not fabricated charts/revenue */}
        <div className="hidden lg:block bg-white border-2 border-black shadow-[12px_12px_0px_0px_#000]" style={{ borderRadius: '0.75rem' }}>
          <div className="h-9 bg-black flex items-center gap-1.5 px-3" style={{ borderRadius: '0.6rem 0.6rem 0 0' }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#febc2e' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
          </div>
          <div className="p-6 space-y-3">
            <div className="border-2 border-black p-4" style={{ backgroundColor: 'var(--ds-sage)', borderRadius: '0.5rem' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1">Stack</p>
              <p className="text-sm font-medium">Go &middot; Next.js &middot; Docker</p>
            </div>
            <div className="border-2 border-black p-4" style={{ backgroundColor: 'var(--ds-yellow)', borderRadius: '0.5rem' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1">Hosting</p>
              <p className="text-sm font-medium">Self-hosted, own hardware</p>
            </div>
            <div className="border-2 border-black p-4 bg-white" style={{ borderRadius: '0.5rem' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1">Build process</p>
              <p className="text-sm font-medium">AI-assisted, documented end to end</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
