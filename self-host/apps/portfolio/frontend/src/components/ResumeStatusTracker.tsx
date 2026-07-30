'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Bot,
  UserCheck,
  MailCheck,
  Loader2,
  CircleCheck,
  CircleAlert,
  ShieldQuestion,
  RefreshCw,
} from 'lucide-react';

type TriageStatus = 'queued' | 'processing' | 'complete' | 'failed';
type RequestStatus = 'pending' | 'approved' | 'rejected';

type StatusResponse = {
  id: string;
  status: RequestStatus;
  triage_status: TriageStatus;
  ai_model: string;
  legitimacy: 'legit' | 'suspicious' | 'spam' | '';
  legitimacy_reason: string;
  role_fit_summary: string;
};

const POLL_INTERVAL_MS = 2000;

const cardBase = 'bg-white border-2 border-black p-6' as const;
const cardShadow = { borderRadius: '0.75rem', boxShadow: 'var(--ds-shadow-sm)' };

function useStatusPolling(id: string) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<'not-found' | 'network' | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';

    const poll = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/resume/status/${id}`, { cache: 'no-store' });
        if (cancelled) return;
        if (res.status === 404) {
          setError('not-found');
          return;
        }
        if (!res.ok) {
          setError('network');
          return;
        }
        const json: StatusResponse = await res.json();
        setError(null);
        setData(json);

        // The AI triage step is the part worth watching live - once it
        // settles (complete or failed), human review happens on its own
        // time, so there's nothing left worth polling for.
        if (json.triage_status === 'queued' || json.triage_status === 'processing') {
          timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setError('network');
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [id]);

  return { data, error };
}

const legitimacyStyles: Record<string, { label: string; bg: string; icon: typeof CircleCheck }> = {
  legit: { label: 'Looks legit', bg: 'var(--ds-sage)', icon: CircleCheck },
  suspicious: { label: 'Flagged as suspicious', bg: 'var(--ds-yellow)', icon: ShieldQuestion },
  spam: { label: 'Flagged as spam', bg: 'var(--ds-charcoal)', icon: CircleAlert },
};

export default function ResumeStatusTracker({ id }: { id: string }) {
  const { data, error } = useStatusPolling(id);

  if (error === 'not-found') {
    return (
      <div className={cardBase} style={cardShadow}>
        <p className="font-extrabold mb-1">Can&apos;t find that request</p>
        <p className="text-sm text-[var(--ds-charcoal)]/70">
          This link may have expired, or the request ID is wrong.{' '}
          <Link href="/" className="underline hover:text-black">
            Back to the homepage
          </Link>
          .
        </p>
      </div>
    );
  }

  const triageStatus = data?.triage_status ?? 'queued';
  const requestStatus = data?.status ?? 'pending';
  const triageDone = triageStatus === 'complete' || triageStatus === 'failed';
  const legitStyle = data?.legitimacy ? legitimacyStyles[data.legitimacy] : null;

  const steps: {
    key: string;
    label: string;
    icon: typeof Send;
    state: 'done' | 'active' | 'pending' | 'error';
    detail: string;
  }[] = [
    {
      key: 'submitted',
      label: 'Request submitted',
      icon: Send,
      state: 'done',
      detail: 'Your name, email, company, and reason were received.',
    },
    {
      key: 'triage',
      label: 'AI triage',
      icon: Bot,
      state:
        triageStatus === 'failed' ? 'error' : triageDone ? 'done' : triageStatus === 'processing' ? 'active' : 'pending',
      detail:
        triageStatus === 'failed'
          ? "The model call hit a snag - this gets manually reviewed instead, nothing is blocked."
          : triageDone
            ? `Evaluated by Claude Haiku 4.5${data?.legitimacy_reason ? ` - ${data.legitimacy_reason}` : '.'}`
            : 'Claude Haiku 4.5 is reading the request now.',
    },
    {
      key: 'review',
      label: 'Human review',
      icon: UserCheck,
      state:
        requestStatus !== 'pending' ? 'done' : triageDone ? 'active' : 'pending',
      detail:
        requestStatus === 'approved'
          ? 'Approved.'
          : requestStatus === 'rejected'
            ? 'Not approved for this request.'
            : 'The AI verdict is advisory, not automatic - a human still makes the actual call.',
    },
    {
      key: 'delivered',
      label: 'Resume delivered',
      icon: MailCheck,
      state: requestStatus === 'approved' ? 'done' : 'pending',
      detail:
        requestStatus === 'approved'
          ? 'A time-limited download link was emailed.'
          : 'An expiring download link gets emailed once approved.',
    },
  ];

  return (
    <div className="space-y-10">
      <div className="relative">
        <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-black/15 hidden sm:block" aria-hidden="true" />
        <div className="space-y-4">
          {steps.map((step) => {
            const Icon = step.state === 'active' ? Loader2 : step.icon;
            return (
              <div key={step.key} className="relative sm:pl-16">
                <div
                  className="hidden sm:flex absolute left-0 top-0 w-10 h-10 items-center justify-center border-2 border-black"
                  style={{
                    borderRadius: '0.5rem',
                    backgroundColor: step.state === 'done' || step.state === 'active' ? 'black' : 'white',
                    color: step.state === 'done' || step.state === 'active' ? 'white' : 'black',
                  }}
                >
                  <Icon className={`w-5 h-5 ${step.state === 'active' ? 'animate-spin' : ''}`} aria-hidden="true" />
                </div>
                <div
                  className={cardBase}
                  style={{
                    ...cardShadow,
                    opacity: step.state === 'pending' ? 0.55 : 1,
                    backgroundColor: step.state === 'error' ? 'var(--ds-yellow)' : 'white',
                  }}
                >
                  <p className="font-extrabold">{step.label}</p>
                  <p className="text-sm text-[var(--ds-charcoal)]/70 mt-1">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {legitStyle && (
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--ds-charcoal)]/50 mb-2">
            AI triage verdict
          </p>
          <div
            className="border-2 border-black p-6 flex items-start gap-4"
            style={{ borderRadius: '0.75rem', backgroundColor: legitStyle.bg }}
          >
            <legitStyle.icon
              className={`w-6 h-6 shrink-0 mt-0.5 ${data?.legitimacy === 'spam' ? 'text-white' : 'text-black'}`}
              aria-hidden="true"
            />
            <div className={data?.legitimacy === 'spam' ? 'text-white' : 'text-black'}>
              <p className="font-extrabold">{legitStyle.label}</p>
              {data?.role_fit_summary && <p className="text-sm mt-1 opacity-90">{data.role_fit_summary}</p>}
            </div>
          </div>
        </div>
      )}

      {error === 'network' && (
        <div className="flex items-center gap-2 text-sm text-[var(--ds-charcoal)]/60">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Having trouble reaching the server - this page will keep trying.
        </div>
      )}
    </div>
  );
}
