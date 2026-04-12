'use client';

import { useEffect } from 'react';
import { ActiveSetup } from '@/components/showroom/ActiveSetup';
import { LatestClosed } from '@/components/showroom/LatestClosed';
import { PerformanceStats } from '@/components/showroom/PerformanceStats';
import { EquitySparkline } from '@/components/showroom/EquitySparkline';

type Props = {
  performance: Record<string, unknown>;
  activePreview?: Record<string, unknown> | null;
  latestClosedSummary?: Record<string, unknown> | null;
};

export function ShowroomCharts({ performance, activePreview, latestClosedSummary }: Props) {
  const normalizedPerformance = {
    totalTrades: Number(performance.totalTrades ?? 0),
    winRate: Number(performance.winRate ?? 0),
    avgRiskReward: Number(performance.avgRiskReward ?? 0),
    maxDrawdown: Number(performance.maxDrawdown ?? 0),
  };

  const normalizedPreview = activePreview && typeof activePreview === 'object'
    ? {
        entryLow: Number(activePreview.entryLow ?? 0),
        entryHigh: Number(activePreview.entryHigh ?? 0),
        bias: (activePreview.bias === 'short' || activePreview.bias === 'neutral' ? activePreview.bias : 'long') as 'long' | 'short' | 'neutral',
        isLive: Boolean(activePreview.isLive ?? true),
      }
    : null;

  const normalizedLatest = latestClosedSummary && typeof latestClosedSummary === 'object'
    ? {
        entryPrice: Number(latestClosedSummary.entryPrice ?? 0),
        exitPrice: Number(latestClosedSummary.exitPrice ?? 0),
        outcome: (latestClosedSummary.outcome === 'loss' ? 'loss' : 'win') as 'win' | 'loss',
        rrAchieved: Number(latestClosedSummary.rrAchieved ?? 0),
        notes: String(latestClosedSummary.notes ?? 'No notes provided.'),
      }
    : null;

  const sparklineSeed = [
    100,
    99,
    101,
    104,
    103,
    107,
    111,
    110,
    114,
    118,
  ];

  useEffect(() => {
    console.info('telemetry:showroom_rendered', {
      hasActivePreview: Boolean(activePreview),
      hasLatestClosed: Boolean(latestClosedSummary),
      ts: Date.now(),
    });
  }, [activePreview, latestClosedSummary]);

  return (
    <section className="space-y-10">
      <PerformanceStats performance={normalizedPerformance} />
      <div>
        <span className="section-marker">[ ACTIVE SETUP ]</span>
        <div className="mt-4">
          <ActiveSetup preview={normalizedPreview} />
        </div>
      </div>
      <div>
        <span className="section-marker">[ LATEST CLOSED ]</span>
        <div className="mt-4">
          <LatestClosed summary={normalizedLatest} />
        </div>
      </div>
      <EquitySparkline data={sparklineSeed} />
    </section>
  );
}
