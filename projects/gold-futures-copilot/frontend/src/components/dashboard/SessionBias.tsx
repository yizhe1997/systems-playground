type SessionBiasProps = {
  direction: 'long' | 'short' | 'neutral';
  entryLow: number;
  entryHigh: number;
  note: string;
  nextSessionCountdown: string;
};

export function SessionBias({ direction, entryLow, entryHigh, note, nextSessionCountdown }: SessionBiasProps) {
  const directionColor = {
    long: 'text-long',
    short: 'text-short',
    neutral: 'text-neutral-bias',
  }[direction];

  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-12">
      {/* Left: Bias Display */}
      <div className="flex-1 space-y-4">
        <div className="flex items-baseline gap-6">
          <h2 className={`font-mono text-6xl md:text-7xl lg:text-8xl font-light tracking-tight ${directionColor}`}>
            {direction.toUpperCase()}
          </h2>
        </div>
        
        <div className="space-y-2">
          <p className="font-mono text-xl md:text-2xl text-secondary">
            {entryLow.toFixed(2)} — {entryHigh.toFixed(2)}
          </p>
          <p className="text-sm text-secondary leading-relaxed max-w-xl">
            {note}
          </p>
        </div>
      </div>

      {/* Vertical divider */}
      <div className="hairline-h lg:hidden" />
      <div className="hairline-v hidden lg:block h-32" />

      {/* Right: Next Session Countdown */}
      <div className="lg:text-right">
        <p className="kpi-label mb-2">NEXT SESSION</p>
        <p className="font-mono text-3xl md:text-4xl text-gold tracking-wider">
          {nextSessionCountdown}
        </p>
      </div>
    </div>
  );
}
