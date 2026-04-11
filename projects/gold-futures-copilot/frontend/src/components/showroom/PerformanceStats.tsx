type Performance = {
  totalTrades: number;
  winRate: number;
  avgRiskReward: number;
  maxDrawdown: number;
};

type PerformanceStatsProps = {
  performance: Performance;
};

export function PerformanceStats({ performance }: PerformanceStatsProps) {
  const stats = [
    { label: 'TOTAL TRADES', value: performance.totalTrades.toString() },
    { label: 'WIN RATE', value: `${performance.winRate}%` },
    { label: 'AVG R:R', value: `${performance.avgRiskReward.toFixed(1)}:1` },
    { label: 'MAX DRAWDOWN', value: `${performance.maxDrawdown}%` },
  ];

  return (
    <div className="hud-frame p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end">
        {stats.map((stat, index) => (
          <div key={stat.label} className="flex-1 flex flex-col md:flex-row md:items-end">
            <div className="py-4 md:py-0 flex-1">
              <p className="kpi-number">{stat.value}</p>
              <p className="kpi-label">{stat.label}</p>
            </div>
            
            {/* Dividers */}
            {index < stats.length - 1 && (
              <>
                <div className="hairline-h md:hidden" />
                <div className="hairline-v hidden md:block h-20 mx-6 lg:mx-8" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
