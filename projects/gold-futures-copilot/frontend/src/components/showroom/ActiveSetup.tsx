type ActivePreview = {
  entryLow: number;
  entryHigh: number;
  bias: 'long' | 'short' | 'neutral';
  isLive: boolean;
};

type ActiveSetupProps = {
  preview?: ActivePreview | null;
};

export function ActiveSetup({ preview }: ActiveSetupProps) {
  if (!preview) {
    return (
      <div className="py-12">
        <p className="font-mono text-xl text-secondary text-center tracking-widest">
          NO ACTIVE SETUP
        </p>
        <p className="text-sm text-secondary text-center mt-2">
          Check back when a new signal is published.
        </p>
      </div>
    );
  }

  const biasColor = {
    long: 'text-long',
    short: 'text-short',
    neutral: 'text-neutral-bias',
  }[preview.bias];

  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-12">
      {/* Left: Entry Zone */}
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <p className="kpi-label">ENTRY ZONE</p>
          <p className="font-mono text-3xl md:text-4xl lg:text-5xl text-primary tracking-wide">
            {preview.entryLow.toFixed(2)} — {preview.entryHigh.toFixed(2)}
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="kpi-label">STOPS &amp; TARGETS</p>
          <p className="redacted text-lg">
            [ENCRYPTED] ████████
          </p>
        </div>

        {/* Live Badge */}
        {preview.isLive && (
          <div className="inline-flex items-center gap-2 mt-4">
            <div className="live-dot pulse relative">
              <span className="sonar-ping" />
            </div>
            <span className="font-mono text-xs tracking-widest text-gold uppercase">
              SIGNALS LIVE
            </span>
          </div>
        )}
      </div>

      {/* Vertical divider */}
      <div className="hairline-h lg:hidden" />
      <div className="hairline-v hidden lg:block h-32" />

      {/* Right: Masked Direction */}
      <div className="lg:text-right space-y-2">
        <p className="kpi-label">DIRECTION</p>
        <p className={`font-mono text-4xl lg:text-5xl ${biasColor} tracking-wider`}>
          {preview.bias.toUpperCase()}
        </p>
      </div>
    </div>
  );
}
