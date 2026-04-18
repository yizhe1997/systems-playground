'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, BrainCircuit, LineChart } from 'lucide-react';
import BrutalistImage from '@/components/BrutalistImage';

export default function HowItWorksPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []);

  if (!mounted) return null;

  return (
    <div className="w-full relative">
      <main className="max-w-[1000px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">

        {/* Hero */}
        <div className="text-center mb-24">
          <h1 className="text-4xl md:text-7xl font-bold tracking-tighter uppercase mb-6">
            How It Works
          </h1>
          <p className="font-mono text-xs md:text-sm uppercase tracking-widest opacity-60 max-w-2xl mx-auto leading-relaxed">
            Futures Copilot is an AI-assisted trading journal. It does not trade for you. It forces discipline, calculates risk deterministically, and remembers your mistakes so you don&apos;t have to.
          </p>
        </div>

        {/* Content Blocks */}
        <div className="space-y-24">
          
          <section className="flex flex-col gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-4">
                <ShieldAlert className="w-6 h-6" />
                <h2 className="font-mono text-xl uppercase tracking-widest font-bold">1. Deterministic Risk Gatekeeping</h2>
              </div>
              <p className="font-mono text-sm opacity-70 leading-relaxed">
                Before a trade is ever placed, the setup is logged in Draft mode. The system calculates exact dollar risk, R:R ratios, and checks it against the portfolio&apos;s Daily Loss Limit. If the math violates the strategy, the AI Copilot flags the trade before capital is risked.
              </p>
            </div>
            <div className="w-full bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] min-h-[300px] md:min-h-[400px]">
              <div className="bg-white dark:bg-black w-full h-full flex items-center justify-center [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] p-6">
                <BrutalistImage src="https://files.38569123.xyz/api/public/dl/lv1ljIyT?inline=true" alt="Deterministic Risk Gatekeeping" />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-8">
            <div className="max-w-3xl ml-auto text-right">
              <div className="flex items-center justify-end gap-4 mb-4">
                <h2 className="font-mono text-xl uppercase tracking-widest font-bold">2. Radical Transparency</h2>
                <LineChart className="w-6 h-6" />
              </div>
              <p className="font-mono text-sm opacity-70 leading-relaxed">
                We trade Institutional Supply & Demand zones using limit orders. When an order is approved and set, it becomes visible on the Live Radar. Subscribers receive instant webhooks to mirror the exact levels, seeing the reasoning before the market even arrives.
              </p>
            </div>
            <div className="w-full bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)] min-h-[300px] md:min-h-[400px]">
              <div className="bg-white dark:bg-black w-full h-full flex items-center justify-center [clip-path:polygon(0_0,100%_0,100%_calc(100%-60px),calc(100%-60px)_100%,0_100%)] p-6">
                <BrutalistImage src="https://files.38569123.xyz/api/public/dl/uiCI4pS6?inline=true" alt="Radical Transparency" />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-4">
                <BrainCircuit className="w-6 h-6" />
                <h2 className="font-mono text-xl uppercase tracking-widest font-bold">3. Post-Trade Evolution</h2>
              </div>
              <p className="font-mono text-sm opacity-70 leading-relaxed">
                After a trade closes, the outcome is logged. The AI analyzes the actual P&L against the initial plan and notes. It stores this reflection in a retrieval database, meaning the system gets smarter about your specific weaknesses with every single trade.
              </p>
            </div>
            <div className="w-full bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] min-h-[300px] md:min-h-[400px]">
              <div className="bg-white dark:bg-black w-full h-full flex items-center justify-center [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] p-6">
                <BrutalistImage src="https://files.38569123.xyz/api/public/dl/2oG6dnPV?inline=true" alt="Post-Trade Evolution" />
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}