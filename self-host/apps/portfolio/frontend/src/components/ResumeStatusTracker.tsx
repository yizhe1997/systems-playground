'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Bot,
  UserCheck,
  MailCheck,
  CircleCheck,
  ShieldQuestion,
  CircleAlert,
  RefreshCw,
  Workflow,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TriageStatus = 'queued' | 'processing' | 'complete' | 'failed';
// 'expired' - still-pending past the 30-day retention cutoff: PII is
// already anonymized and approval is blocked, so this is a distinct outcome
// from an explicit human 'rejected' decision, not a synonym for it.
type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

type StatusResponse = {
  id: string;
  status: RequestStatus;
  created_at: number;
  triage_status: TriageStatus;
  ai_model: string;
  legitimacy: 'legit' | 'suspicious' | 'spam' | '';
  legitimacy_reason: string;
  role_fit_summary: string;
  triage_completed_at: number;
  decided_at: number;
};

// Same 3-color language as the rest of this page's redesign: sage is the
// resting/default state, yellow is "actively happening right now", red is
// "failed or declined". No 4th color.
const RED = '#dc2626';

// Live push instead of polling - the data flow here is genuinely one-way
// (backend state -> viewer), so a long-lived SSE connection to
// GET /api/resume/status/:id/stream replaces what used to be a setTimeout
// loop re-fetching every 2s. The backend publishes a fresh snapshot on
// every save to this row (see backend/resume.go's saveResumeRequest), so
// updates arrive the moment they happen instead of up to 2s late.
function useStatusStream(id: string) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<'not-found' | 'network' | null>(null);

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';

    (async () => {
      // EventSource's error event can't tell "id doesn't exist" apart from
      // a transient network hiccup, and would otherwise retry a genuinely
      // missing id forever - one plain fetch up front settles that before
      // opening the long-lived stream.
      try {
        const check = await fetch(`${apiUrl}/api/resume/status/${id}`, { cache: 'no-store' });
        if (cancelled) return;
        if (check.status === 404) {
          setError('not-found');
          return;
        }
        if (!check.ok) {
          setError('network');
          return;
        }
      } catch {
        if (!cancelled) setError('network');
        return;
      }
      if (cancelled) return;

      es = new EventSource(`${apiUrl}/api/resume/status/${id}/stream`);
      es.onmessage = (evt) => {
        setError(null);
        setData(JSON.parse(evt.data));
      };
      // The browser retries this connection on its own after an error -
      // just surface a transient banner rather than treating it as final.
      es.onerror = () => {
        if (!cancelled) setError('network');
      };
    })();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [id]);

  return { data, error };
}

// Ticks while a step is actually in flight, at 100ms regardless of which
// step - triage and review both feed the same decimal-seconds display for
// the first minute (see fmtDuration), so they need the same tick rate or
// the slower one's tenths digit visibly stalls while only the whole-second
// digit advances. The cost of a 100ms tick past the first minute (once
// fmtDuration has already dropped to whole-second precision and a chunk of
// those ticks re-render an unchanged string) is a few extra cheap re-renders
// of a small text node, not something worth a more complex adaptive rate
// for. Stops once both steps have settled so this isn't a perpetual timer
// on a finished page.
function useLiveTick(active: boolean, intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => setTick((t) => t + 1);
    const id = setInterval(tick, intervalMs);
    // Chrome/Firefox throttle setInterval to roughly once a minute on a
    // backgrounded/unfocused tab (standard power-saving behavior) - without
    // this, coming back to a tab that sat in the background shows a stale,
    // seemingly-frozen elapsed time until the throttled timer eventually
    // catches up. Forcing one tick the moment the tab becomes visible again
    // fixes the "stuck" appearance without fighting the browser's own
    // throttling.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, intervalMs]);
}

function fmtClockTime(ms: number) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function fmtDateTime(ms: number) {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + fmtClockTime(ms);
}
// One duration formatter for both triage (usually seconds) and review
// (anywhere from seconds to, per the retention window, over a month) -
// breaks down into every unit down to seconds once it's over a minute, so
// something that sat for weeks reads as "27d 9h 12m 34s" instead of a
// meaningless three-digit hour count. Both callers tick at 100ms (see
// useLiveTick), so the tenths digit below animates smoothly for either one.
function fmtDuration(ms: number) {
  const totalSec = Math.max(0, ms / 1000);
  if (totalSec < 60) return totalSec.toFixed(1) + 's';
  const s = Math.floor(totalSec);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || hours > 0) parts.push(`${hours}h`);
  parts.push(days > 0 || hours > 0 ? `${String(mins).padStart(2, '0')}m` : `${mins}m`);
  parts.push(`${String(secs).padStart(2, '0')}s`);
  return parts.join(' ');
}

const legitimacyStyles: Record<string, { label: string; icon: typeof CircleCheck; tone: 'sage' | 'yellow' | 'red' }> = {
  legit: { label: 'Looks legit', icon: CircleCheck, tone: 'sage' },
  suspicious: { label: 'Flagged as suspicious', icon: ShieldQuestion, tone: 'yellow' },
  spam: { label: 'Flagged as spam', icon: CircleAlert, tone: 'red' },
};

type ViewMode = 'pipeline' | 'terminal';

export default function ResumeStatusTracker({ id }: { id: string }) {
  const { data, error } = useStatusStream(id);
  const [view, setView] = useState<ViewMode>('pipeline');

  const triageStatus = data?.triage_status ?? 'queued';
  const requestStatus = data?.status ?? 'pending';
  const triageDone = triageStatus === 'complete' || triageStatus === 'failed';
  const requestSettled = requestStatus !== 'pending';

  useLiveTick(!triageDone, 100);
  useLiveTick(triageDone && !requestSettled, 100);

  if (error === 'not-found') {
    return (
      <div className="bg-white border-2 border-black p-6" style={{ borderRadius: '0.75rem', boxShadow: 'var(--ds-shadow-sm)' }}>
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

  // data is only ever non-null after the client-side poll effect resolves -
  // never during SSR - so everything below (including Date.now() reads)
  // only ever runs client-side, post-hydration. Keeping this a plain,
  // time-free skeleton is what keeps the server-rendered HTML and the
  // client's first paint identical.
  if (!data) {
    return (
      <div className="bg-white border-2 border-black p-10 flex items-center justify-center" style={{ borderRadius: '0.75rem', boxShadow: 'var(--ds-shadow-md)' }}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--ds-charcoal)' }} />
      </div>
    );
  }

  const now = Date.now();
  const createdAt = data.created_at;
  const triageCompletedAt = data.triage_completed_at || 0;
  const decidedAt = data.decided_at || 0;

  // null means "can't compute a real duration" - either the step hasn't
  // happened yet, or (for a handful of requests triaged/decided before this
  // timestamp column existed) it settled without ever getting one stamped.
  // That second case is exactly what silently broke the old fallback: it
  // treated a missing timestamp as "still running" and kept measuring
  // against a live clock, producing a duration that grew forever. Showing
  // no number at all for that edge case beats showing a wrong one.
  const triageElapsedMs = !triageDone
    ? now - createdAt
    : triageCompletedAt > 0
      ? triageCompletedAt - createdAt
      : null;

  const reviewElapsedMs = !triageDone
    ? null
    : !requestSettled
      ? now - (triageCompletedAt || createdAt)
      : decidedAt > 0
        ? decidedAt - (triageCompletedAt || createdAt)
        : null;

  const trackProps: PipelineProps = {
    data,
    createdAt,
    triageStatus,
    requestStatus,
    triageDone,
    triageElapsedMs,
    reviewElapsedMs,
    decidedAt,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} aria-label="Status view">
          <TabsList className="border-2 border-black bg-[var(--ds-charcoal)] gap-0.5 p-0.5 w-auto rounded-[0.5rem]" style={{ height: 40 }}>
            <TabsTrigger
              value="pipeline"
              className="justify-center min-w-[6rem] rounded-[0.35rem] px-3.5 text-sm font-bold text-white/70 hover:text-white data-active:bg-[var(--ds-yellow)] data-active:text-[var(--ds-charcoal)] data-active:shadow-none focus-visible:border-black focus-visible:ring-black/30 focus-visible:outline-black"
              style={{ height: 32 }}
            >
              <Workflow className="w-4 h-4" aria-hidden="true" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger
              value="terminal"
              className="justify-center min-w-[6rem] rounded-[0.35rem] px-3.5 text-sm font-bold text-white/70 hover:text-white data-active:bg-[var(--ds-yellow)] data-active:text-[var(--ds-charcoal)] data-active:shadow-none focus-visible:border-black focus-visible:ring-black/30 focus-visible:outline-black"
              style={{ height: 32 }}
            >
              <TerminalIcon className="w-4 h-4" aria-hidden="true" />
              Terminal
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'pipeline' ? <PipelineTrack {...trackProps} /> : <TerminalLog {...trackProps} />}

      {error === 'network' && (
        <div className="flex items-center gap-2 text-sm text-[var(--ds-charcoal)]/60">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Having trouble reaching the server - this page will keep trying.
        </div>
      )}
    </div>
  );
}

// ============================= PIPELINE =============================

type PipelineProps = {
  data: StatusResponse;
  createdAt: number;
  triageStatus: TriageStatus;
  requestStatus: RequestStatus;
  triageDone: boolean;
  triageElapsedMs: number | null;
  reviewElapsedMs: number | null;
  decidedAt: number;
};

type NodeState = 'done' | 'active' | 'idle' | 'error';

const toneBg = { sage: 'var(--ds-sage)', yellow: 'var(--ds-yellow)', red: RED } as const;

// A straight connector line only means something if it actually starts and
// ends at each node's real icon center - hardcoded viewBox fractions drift
// out of sync with the grid's real column widths/gaps the moment either
// changes. Measuring the real DOM once (and on resize) is what keeps it
// correct instead of "close enough". Returns all 4 icon centers (not just
// the first/last) so the track between each adjacent pair can be drawn and
// colored as its own segment.
function useConnectorLine(trackRef: React.RefObject<HTMLDivElement | null>, iconRefs: React.RefObject<(HTMLDivElement | null)[]>) {
  const [line, setLine] = useState<{ xs: number[]; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    function measure() {
      const track = trackRef.current;
      const icons = iconRefs.current;
      if (!track || icons.length < 4 || icons.some((el) => !el)) return;
      const trackRect = track.getBoundingClientRect();
      const rects = icons.map((el) => el!.getBoundingClientRect());
      setLine({
        xs: rects.map((r) => r.left + r.width / 2 - trackRect.left),
        y: rects[0].top + rects[0].height / 2 - trackRect.top,
        w: trackRect.width,
        h: trackRect.height,
      });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [trackRef, iconRefs]);

  return line;
}

function PipelineTrack({ data, createdAt, triageStatus, requestStatus, triageDone, triageElapsedMs, reviewElapsedMs, decidedAt }: PipelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

  const line = useConnectorLine(trackRef, iconRefs);

  const legit = data.legitimacy ? legitimacyStyles[data.legitimacy] : null;

  const nodeState: Record<'submitted' | 'triage' | 'review' | 'delivered', NodeState> = {
    submitted: 'done',
    triage: triageStatus === 'failed' ? 'error' : triageDone ? 'done' : 'active',
    review: !triageDone ? 'idle' : requestStatus === 'rejected' || requestStatus === 'expired' ? 'error' : requestStatus === 'approved' ? 'done' : 'active',
    delivered: requestStatus === 'approved' ? 'done' : 'idle',
  };

  // Segment i sits between node i and node i+1 - it darkens once node i+1
  // has actually started (running or already settled), not just because
  // node i itself is done. An 'idle' next-node means nothing has reached
  // that stretch of the pipeline yet, so it stays faint.
  const nextNodeStates: NodeState[] = [nodeState.triage, nodeState.review, nodeState.delivered];

  return (
    <div className="space-y-6">
      <div ref={trackRef} className="relative py-1">
        {line && (
          <svg
            className="absolute inset-0 hidden sm:block"
            width={line.w}
            height={line.h}
            viewBox={`0 0 ${line.w} ${line.h}`}
            aria-hidden="true"
          >
            {nextNodeStates.map((state, i) => (
              <line
                key={i}
                x1={line.xs[i]}
                x2={line.xs[i + 1]}
                y1={line.y}
                y2={line.y}
                stroke="var(--ds-charcoal)"
                strokeOpacity={state === 'idle' ? 0.15 : 0.75}
                strokeWidth="3"
              />
            ))}
          </svg>
        )}

        <div className="relative grid grid-cols-1 sm:grid-cols-4 gap-5 sm:gap-3">
          <PipeNode
            iconRef={(el) => { iconRefs.current[0] = el; }}
            icon={Send}
            label="Submitted"
            state={nodeState.submitted}
            detail={fmtDateTime(createdAt)}
          />
          <PipeNode
            iconRef={(el) => { iconRefs.current[1] = el; }}
            icon={Bot}
            label="AI triage"
            state={nodeState.triage}
            detail={
              triageStatus === 'failed'
                ? triageElapsedMs !== null ? <>Failed after <span className="tabular-nums font-bold">{fmtDuration(triageElapsedMs)}</span></> : 'Failed'
                : triageDone
                  ? triageElapsedMs !== null ? <>Done in <span className="tabular-nums font-bold">{fmtDuration(triageElapsedMs)}</span></> : 'Done'
                  : <><span className="tabular-nums font-bold">{fmtDuration(triageElapsedMs ?? 0)}</span> elapsed</>
            }
          />
          <PipeNode
            iconRef={(el) => { iconRefs.current[2] = el; }}
            icon={UserCheck}
            label="Human review"
            state={nodeState.review}
            detail={
              !triageDone
                ? 'Waiting on triage'
                : requestStatus === 'approved'
                  ? reviewElapsedMs !== null ? <>Approved after <span className="tabular-nums font-bold">{fmtDuration(reviewElapsedMs)}</span></> : 'Approved'
                  : requestStatus === 'rejected'
                    ? reviewElapsedMs !== null ? <>Declined after <span className="tabular-nums font-bold">{fmtDuration(reviewElapsedMs)}</span></> : 'Declined'
                    : requestStatus === 'expired'
                      ? reviewElapsedMs !== null ? <>Expired after <span className="tabular-nums font-bold">{fmtDuration(reviewElapsedMs)}</span></> : 'Expired'
                      : reviewElapsedMs !== null ? <>In review <span className="tabular-nums font-bold">{fmtDuration(reviewElapsedMs)}</span></> : 'In review'
            }
          />
          <PipeNode
            iconRef={(el) => { iconRefs.current[3] = el; }}
            icon={MailCheck}
            label="Delivered"
            state={nodeState.delivered}
            detail={requestStatus === 'approved' ? `Sent ${fmtDateTime(decidedAt)}` : requestStatus === 'rejected' || requestStatus === 'expired' ? 'Not sent' : 'Not yet'}
          />
        </div>
      </div>

      {legit && (
        <div
          className="border-2 border-black p-4 sm:p-5 flex items-start gap-3"
          style={{ borderRadius: '0.75rem', backgroundColor: toneBg[legit.tone], boxShadow: 'var(--ds-shadow-sm)' }}
        >
          <legit.icon
            className={`w-5 h-5 shrink-0 mt-0.5 ${legit.tone === 'red' ? 'text-white' : ''}`}
            style={{ color: legit.tone === 'red' ? undefined : 'var(--ds-charcoal)' }}
            aria-hidden="true"
          />
          <div className={legit.tone === 'red' ? 'text-white' : ''} style={{ color: legit.tone === 'red' ? undefined : 'var(--ds-charcoal)' }}>
            <p className="font-extrabold text-sm">{legit.label}</p>
            {(data.role_fit_summary || data.legitimacy_reason) && (
              <p className="text-sm mt-0.5 opacity-90">{data.role_fit_summary || data.legitimacy_reason}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PipeNode({
  icon: Icon,
  label,
  state,
  detail,
  iconRef,
}: {
  icon: typeof Send;
  label: string;
  state: NodeState;
  detail: React.ReactNode;
  iconRef: (el: HTMLDivElement | null) => void;
}) {
  const bg = state === 'error' ? RED : state === 'active' ? 'var(--ds-yellow)' : 'var(--ds-sage)';
  const iconColor = state === 'error' ? '#fff' : 'var(--ds-charcoal)';
  return (
    <div className="flex sm:flex-col items-start sm:items-center sm:text-center gap-3 sm:gap-2">
      <div className="relative w-11 h-11 shrink-0">
        {state === 'active' && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ backgroundColor: 'var(--ds-charcoal)' }} aria-hidden="true" />
        )}
        <div
          ref={iconRef}
          className="relative w-11 h-11 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: 'var(--ds-charcoal)', backgroundColor: bg, opacity: state === 'idle' ? 0.45 : 1 }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} aria-hidden="true" />
        </div>
      </div>
      <div>
        <p className="font-extrabold text-sm" style={{ fontFamily: 'var(--ds-font-display)' }}>
          {label}
        </p>
        <div className="text-xs text-[var(--ds-charcoal)]/70 mt-0.5">{detail}</div>
      </div>
    </div>
  );
}

// ============================= TERMINAL =============================

type LogTone = 'sage' | 'yellow' | 'red';
type LogLine = { key: string; tag: string; tone: LogTone; msg: string; ts: number; delta: string | null; live?: boolean };

const logToneColor: Record<LogTone, string> = { sage: '#9fd9bd', yellow: '#ffe17c', red: '#ff8f79' };

// The alternate view to PipelineTrack - same props, same underlying data,
// read as a system log instead of a node graph. Self-contained: the
// legitimacy verdict is folded into the TRIAGE line here instead of
// rendering as PipelineTrack's separate card below it, so switching views
// swaps the whole thing rather than leaving a leftover card behind.
function TerminalLog({ data, createdAt, triageStatus, requestStatus, triageDone, triageElapsedMs, reviewElapsedMs, decidedAt }: PipelineProps) {
  const now = Date.now();

  const lines: LogLine[] = [{ key: 'submit', tag: 'SUBMIT', tone: 'sage', msg: 'request received', ts: createdAt, delta: null }];

  if (!triageDone) {
    lines.push({ key: 'triage', tag: 'TRIAGE', tone: 'yellow', msg: 'reading request', ts: now, delta: `+${fmtDuration(triageElapsedMs ?? 0)}`, live: true });
  } else if (triageStatus === 'failed') {
    lines.push({
      key: 'triage',
      tag: 'TRIAGE',
      tone: 'red',
      msg: 'model call failed — routed to manual review',
      ts: triageElapsedMs !== null ? createdAt + triageElapsedMs : createdAt,
      delta: triageElapsedMs !== null ? `+${fmtDuration(triageElapsedMs)}` : null,
    });
  } else {
    const legit = data.legitimacy;
    lines.push({
      key: 'triage',
      tag: 'TRIAGE',
      tone: legit === 'legit' ? 'sage' : legit === 'suspicious' ? 'yellow' : 'red',
      msg: `verdict: ${legit || 'unknown'}${(data.role_fit_summary || data.legitimacy_reason) ? ' — ' + (data.role_fit_summary || data.legitimacy_reason) : ''}`,
      ts: triageElapsedMs !== null ? createdAt + triageElapsedMs : createdAt,
      delta: triageElapsedMs !== null ? `+${fmtDuration(triageElapsedMs)}` : null,
    });

    if (requestStatus === 'pending') {
      lines.push({ key: 'review', tag: 'REVIEW', tone: 'yellow', msg: 'awaiting human decision', ts: now, delta: reviewElapsedMs !== null ? `+${fmtDuration(reviewElapsedMs)}` : null, live: true });
    } else if (requestStatus === 'approved') {
      lines.push({ key: 'review', tag: 'REVIEW', tone: 'sage', msg: 'approved by operator', ts: decidedAt, delta: reviewElapsedMs !== null ? `+${fmtDuration(reviewElapsedMs)}` : null });
      lines.push({ key: 'deliver', tag: 'DELIVER', tone: 'sage', msg: 'resume link emailed', ts: decidedAt, delta: null, live: true });
    } else if (requestStatus === 'rejected') {
      lines.push({ key: 'review', tag: 'REVIEW', tone: 'red', msg: 'declined', ts: decidedAt, delta: reviewElapsedMs !== null ? `+${fmtDuration(reviewElapsedMs)}` : null });
      lines.push({ key: 'deliver', tag: 'CLOSED', tone: 'red', msg: 'no resume sent', ts: decidedAt, delta: null, live: true });
    } else if (requestStatus === 'expired') {
      lines.push({ key: 'review', tag: 'REVIEW', tone: 'red', msg: 'expired — no response within 30 days', ts: decidedAt, delta: reviewElapsedMs !== null ? `+${fmtDuration(reviewElapsedMs)}` : null });
      lines.push({ key: 'deliver', tag: 'CLOSED', tone: 'red', msg: 'contact info anonymized, no resume sent', ts: decidedAt, delta: null, live: true });
    }
  }

  // Entrance animation for newly-appeared lines only - re-polling every 2s
  // while triage runs would otherwise replay the whole log's fade-in on
  // every tick instead of just the line that's actually new.
  const bodyRef = useRef<HTMLDivElement>(null);
  const animatedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!bodyRef.current) return;
    const fresh = Array.from(bodyRef.current.querySelectorAll<HTMLElement>('[data-line-key]')).filter(
      (el) => !animatedKeys.current.has(el.dataset.lineKey!)
    );
    if (fresh.length === 0) return;
    fresh.forEach((el) => animatedKeys.current.add(el.dataset.lineKey!));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fresh.forEach((el) => { el.style.opacity = '1'; });
      return;
    }
    import('animejs').then(({ animate, stagger }) => {
      animate(fresh, { opacity: [0, 1], translateY: [6, 0], delay: stagger(90), duration: 320, ease: 'outQuad' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.map((l) => l.key).join(',')]);

  return (
    <div className="border-2 border-black overflow-hidden" style={{ borderRadius: '0.75rem', boxShadow: 'var(--ds-shadow-md)', backgroundColor: '#10130f' }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: '#191d17', borderBottom: '1px solid #2a2f27' }}>
        {/* Same traffic-light colors as the homepage hero's fake browser mockup (HeroSection.tsx). */}
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#febc2e' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
        <span className="text-xs ml-1" style={{ color: '#7c8a7c', fontFamily: 'ui-monospace, monospace' }}>
          resume-pipeline
        </span>
      </div>
      <div ref={bodyRef} className="px-4 py-4 space-y-2.5" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '.8rem' }}>
        {lines.map((l) => (
          <div key={l.key} data-line-key={l.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1" style={{ opacity: 0 }}>
            <span style={{ color: '#5c6a5c' }} className="tabular-nums">[{fmtDateTime(l.ts)}]</span>
            <span style={{ color: logToneColor[l.tone], fontWeight: 700 }}>{l.tag}</span>
            <span style={{ color: '#d9dcd3', flex: 1, minWidth: '12rem' }}>
              {l.msg}
              {l.live && <LiveCursor />}
            </span>
            {l.delta && (
              <span style={{ color: '#5c6a5c' }} className="tabular-nums ml-auto">
                {l.delta}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveCursor() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '.5em',
        height: '1em',
        background: '#ffe17c',
        verticalAlign: 'text-bottom',
        marginLeft: 4,
        animation: 'resume-cursor-blink 1s steps(1) infinite',
      }}
    >
      <style>{`@keyframes resume-cursor-blink { 50% { opacity: 0; } }`}</style>
    </span>
  );
}
