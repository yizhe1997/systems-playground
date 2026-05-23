'use client';

import { ShieldAlert, BrainCircuit, LineChart } from 'lucide-react';
import BrutalistImage from '@/components/BrutalistImage';

export default function HowItWorksPage() {
  return (
    <div className="w-full relative">
      <main className="max-w-[1000px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">

        {/* Hero */}
        <div className="text-center mb-24">
          <h1 className="text-4xl md:text-7xl font-bold tracking-tighter uppercase mb-6">
            How It Works
          </h1>
          <p className="font-mono text-xs md:text-sm uppercase tracking-widest opacity-60 max-w-2xl mx-auto leading-relaxed">
            Futures Copilot is a strategy-agnostic AI probability engine and lifecycle tracker. It does not execute trades or issue financial advice. Instead, it enforces discipline, calculates risk deterministically, and archives historical performance so the engine continuously evolves.
          </p>
        </div>

        {/* Content Blocks */}
        <div className="space-y-24">
          
          <section className="flex flex-col gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-4">
                <ShieldAlert className="w-6 h-6" />
                <h2 className="font-mono text-xl uppercase tracking-widest font-bold">1. Pre-Trade Risk Auditing</h2>
              </div>
              <p className="font-mono text-sm opacity-70 leading-relaxed">
                Every setup starts in Draft mode. The system can analyze the trade&apos;s risk parameters and cross-reference them against the active strategy rules. The AI then assigns a grade to the setup, equipping the trader with a clear understanding of the odds to ensure every final decision is objective and calculated.
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
                The platform demonstrates dynamic trade-planning workflows using transparent, rule-based setups. When a drafted setup passes the AI&apos;s logic checks and the order is officially filled, it appears on the Live Radar. Users can subscribe to webhook notifications to receive instant alerts on trade status changes, tracking the system&apos;s reasoning, probability scores, and behavior as the setup unfolds in real time.
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
                After a trade closes, the outcome is logged. The AI analyzes the actual P&L against the initial plan and notes. It stores this reflection in a retrieval database, meaning the engine gets smarter about a strategy&apos;s specific weaknesses and blind spots with every single iteration.
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