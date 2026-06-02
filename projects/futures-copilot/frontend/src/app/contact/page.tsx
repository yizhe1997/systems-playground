'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Send } from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { useProtectedGoogleSignIn } from '@/hooks/use-protected-google-signin';

const PANEL_CHAMFER = '[clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)]';
const MESSAGE_WORD_LIMIT = 300;

type ContactStatus = 'idle' | 'sending' | 'sent' | 'error';

interface ContactFormProps {
  recaptchaEnabled: boolean;
}

function ContactForm({ recaptchaEnabled }: ContactFormProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { status: authStatus } = useSession();
  const { toast } = useToast();
  const { signInWithRecaptcha, isVerifying } = useProtectedGoogleSignIn();
  const hasContactAccess = authStatus === 'authenticated';
  const showBlocker = authStatus !== 'loading' && !hasContactAccess;

  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // Honeypot field
  const [status, setStatus] = useState<ContactStatus>('idle');
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(!recaptchaEnabled);

  useEffect(() => {
    let cancelled = false;

    async function warmupRecaptcha() {
      if (!recaptchaEnabled) {
        if (!cancelled) setIsRecaptchaReady(true);
        return;
      }

      if (!executeRecaptcha) {
        if (!cancelled) setIsRecaptchaReady(false);
        return;
      }

      try {
        await executeRecaptcha('contact_submit');
        if (!cancelled) setIsRecaptchaReady(true);
      } catch {
        if (!cancelled) setIsRecaptchaReady(false);
      }
    }

    warmupRecaptcha();

    return () => {
      cancelled = true;
    };
  }, [recaptchaEnabled, executeRecaptcha]);

  const messageWordCount = useMemo(() => countWords(message), [message]);

  const canSubmit = useMemo(() => {
    return hasContactAccess
      && messageWordCount > 0
      && messageWordCount <= MESSAGE_WORD_LIMIT
        && isRecaptchaReady
      && status !== 'sending';
      }, [hasContactAccess, isRecaptchaReady, messageWordCount, status]);

  function updateMessage(nextValue: string) {
    if (status !== 'sending' && status !== 'idle') {
      setStatus('idle');
    }
    setMessage(limitMessageWords(nextValue, MESSAGE_WORD_LIMIT));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus('sending');

    try {
      const submitContact = async (recaptchaToken: string) => {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            company,
            recaptchaToken,
          }),
        });

        const data: { message?: string; error?: string } = await res.json().catch(() => ({}));
        return { res, data };
      };

      let recaptchaToken = '';
      if (recaptchaEnabled) {
        if (!executeRecaptcha) {
          setStatus('error');
          toast('Security verification is still loading. Please wait a moment and try again.', 'error');
          return;
        }
        recaptchaToken = await executeRecaptcha('contact_submit');
      }

      let { res, data } = await submitContact(recaptchaToken);

      if (!res.ok && recaptchaEnabled && executeRecaptcha && (data.error || '').toLowerCase().includes('recaptcha')) {
        const retryToken = await executeRecaptcha('contact_submit');
        ({ res, data } = await submitContact(retryToken));
      }

      if (!res.ok) {
        setStatus('error');
        toast(data.error || 'Unable to send your message right now. Please try again shortly.', 'error');
        return;
      }

      setStatus('sent');
      toast(data.message || 'Message sent successfully!', 'success');
      setMessage('');
      setCompany('');

      // Return button label/state to idle after success toast
      setTimeout(() => {
        setStatus((prev) => (prev === 'sent' ? 'idle' : prev));
      }, 1600);
    } catch {
      setStatus('error');
      toast('Network issue while sending your message. Please try again.', 'error');
    }
  }

  return (
    <div className="w-full relative">
      <main className="max-w-[800px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">

        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-6">
            Contact
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest opacity-60 leading-relaxed">
            Interested in the strategy, want to collaborate on the architecture, or have questions about the copilot? Reach out through the channel below.
          </p>
        </div>

        <div className={`relative bg-black dark:bg-white p-[1px] mt-14 ${PANEL_CHAMFER}`}>
          <div className={`relative bg-white dark:bg-black h-full ${PANEL_CHAMFER} p-6 md:p-10`}>
            <div className="pb-6 border-b border-black dark:border-white mb-8">
              <div className="p-3 flex justify-between bg-black text-white dark:bg-white dark:text-black">
                <div className="text-sm font-bold tracking-tighter uppercase leading-none flex items-center gap-2">
                  <MessageSquareText className="w-4 h-4" />
                  PRIVATE MESSAGE FORM
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7">
              <input
                type="text"
                name="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
                className="hidden"
                aria-hidden="true"
              />

              <div>
                <label htmlFor="message" className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => updateMessage(e.target.value)}
                  required
                  maxLength={3000}
                  aria-describedby="message-help"
                  rows={7}
                  className="w-full bg-transparent border border-black dark:border-white p-3 font-mono text-xs uppercase leading-relaxed focus:outline-none rounded-none placeholder:text-black/50 dark:placeholder:text-white/50 resize-y"
                />
                <div id="message-help" className="mt-3 font-mono text-[10px] uppercase tracking-widest opacity-60 text-right">
                  {messageWordCount}/{MESSAGE_WORD_LIMIT}
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-bold disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                {status === 'sending' ? 'Sending...' : 'Send message'}
              </button>
            </form>

            {authStatus === 'loading' ? (
              <div className={`absolute inset-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center ${PANEL_CHAMFER}`} />
            ) : showBlocker ? (
              <div className={`absolute inset-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center ${PANEL_CHAMFER}`}>
                <div className="border border-black dark:border-white bg-white dark:bg-black p-8 max-w-sm shadow-2xl">
                  <h3 className="font-mono text-xl font-bold tracking-tighter uppercase mb-4">SIGN IN REQUIRED</h3>
                  <p className="font-mono text-[10px] uppercase opacity-60 mb-6 leading-relaxed">
                    Sign in to contact the Futures Copilot team.
                  </p>
                  <button
                    onClick={() => signInWithRecaptcha({ callbackUrl: '/contact', action: 'sign_up' })}
                    disabled={isVerifying}
                    className="w-full py-4 border border-black dark:border-white bg-transparent text-black dark:text-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors inline-flex items-center justify-center gap-3 leading-none disabled:opacity-40"
                  >
                    <span className="inline-flex size-4 items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="block size-3.5 fill-current" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    </span>
                    <span className="leading-none">{isVerifying ? 'VERIFYING...' : 'SIGN IN'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-32 pt-16 border-t border-black dark:border-white text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-6">Want to stay alerted for trade ideas?</h2>
          <p className="font-mono text-sm uppercase tracking-widest opacity-60 max-w-xl mx-auto leading-relaxed mb-8">
            Stay alerted to the latest shifts. Set your notifications to get tapped on the shoulder the second the engine drafts and scores a new setup.
          </p>
          <Link href="/alerts" className="inline-flex px-8 py-4 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-bold">
            CONFIGURE ALERTS
          </Link>
        </div>

      </main>
    </div>
  );
}

function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function limitMessageWords(value: string, limit: number): string {
  const words = value.trim().split(/\s+/);
  if (words.length <= limit) return value;
  return words.slice(0, limit).join(' ');
}

export default function ContactPage() {
  return <ContactForm recaptchaEnabled={Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY)} />;
}