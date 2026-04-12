type ClosedSummary = {
  entryPrice: number;
  exitPrice: number;
  outcome: 'win' | 'loss';
  rrAchieved: number;
  notes: string;
};

type LatestClosedProps = {
  summary?: ClosedSummary | null;
};

export function LatestClosed({ summary }: LatestClosedProps) {
  if (!summary) {
    return (
      <div className="py-12">
        <p className="font-mono text-xl text-secondary text-center tracking-widest">
          NO CLOSED SETUP SUMMARY
        </p>
      </div>
    );
  }

  const outcomeColor = summary.outcome === 'win' ? 'text-long' : 'text-short';
  const rrPrefix = summary.rrAchieved >= 0 ? '+' : '';

  return (
    <div className="space-y-6">
      {/* Entry -> Exit */}
      <div className="flex flex-wrap items-baseline gap-4">
        <span className="font-mono text-3xl md:text-4xl lg:text-5xl text-primary">
          {summary.entryPrice.toFixed(2)}
        </span>
        <span className="font-mono text-2xl text-secondary">
          →
        </span>
        <span className="font-mono text-3xl md:text-4xl lg:text-5xl text-primary">
          {summary.exitPrice.toFixed(2)}
        </span>
      </div>

      {/* Outcome Badge and RR */}
      <div className="flex items-center gap-6">
        <span className={`font-mono text-sm tracking-widest uppercase ${outcomeColor}`}>
          {summary.outcome.toUpperCase()}
        </span>
        <span className="hairline-v h-4" />
        <span className={`font-mono text-lg ${outcomeColor}`}>
          {rrPrefix}{summary.rrAchieved.toFixed(1)}R
        </span>
      </div>

      {/* Notes */}
      <p className="text-sm text-secondary leading-relaxed max-w-2xl">
        {summary.notes}
      </p>
    </div>
  );
}
