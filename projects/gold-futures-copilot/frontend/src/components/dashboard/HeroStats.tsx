type HeroStatsProps = {
  winRate: number;
  avgRiskReward: number;
  activePlans: number;
};

export function HeroStats({ winRate, avgRiskReward, activePlans }: HeroStatsProps) {
  return (
    <div className="hud-frame p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end">
        {/* Win Rate */}
        <div className="flex-1 py-4 md:py-0">
          <p className="kpi-number">{winRate}%</p>
          <p className="kpi-label">WIN RATE</p>
        </div>

        <div className="hairline-h md:hidden my-4" />
        <div className="hairline-v hidden md:block h-20 mx-8" />

        {/* Avg Risk-Reward */}
        <div className="flex-1 py-4 md:py-0">
          <p className="kpi-number">{avgRiskReward.toFixed(1)} : 1</p>
          <p className="kpi-label">AVG RISK-REWARD</p>
        </div>

        <div className="hairline-h md:hidden my-4" />
        <div className="hairline-v hidden md:block h-20 mx-8" />

        {/* Active Plans */}
        <div className="flex-1 py-4 md:py-0">
          <p className="kpi-number">{activePlans.toString().padStart(2, '0')}</p>
          <p className="kpi-label">ACTIVE PLANS</p>
        </div>
      </div>
    </div>
  );
}
