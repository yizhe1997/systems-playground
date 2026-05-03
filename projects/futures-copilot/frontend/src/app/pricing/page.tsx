'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-black/20 dark:border-white/20 pb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex justify-between items-center text-left py-4 hover:opacity-70 transition-opacity"
      >
        <h3 className="font-mono text-sm uppercase font-bold">{question}</h3>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="font-mono text-xs opacity-60 leading-relaxed uppercase pb-4 pt-2">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const features = [
    'Early Morning Trade Setups',
    'Real-Time Fill & Alert Notifications',
    'AI-Assisted Trade Journal & Context',
    'Post-Trade AI Retrospectives',
    'Daily Loss Limit Enforcement',
    'Access to All Past Trade Setups',
  ];

  return (
    <div className="w-full relative min-h-screen">
      <main className="max-w-[800px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-6">
            Pricing
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest opacity-60 leading-relaxed max-w-xl mx-auto">
            Unlock daily trade setups with full context, AI-assisted trade, and real-time alerts pushed directly to your preferred channel.
          </p>
        </div>

        <div className="mb-16 border border-black dark:border-white p-4 md:p-5 bg-[#f8f8f8] dark:bg-[#111] text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 mb-2">Pilot Promotion</div>
          <p className="font-mono text-xs uppercase leading-relaxed">
            A $0 promo code can be applied at checkout during the pilot, so you can still go through the normal paid flow without being charged.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-16">
          <div className="flex border border-black dark:border-white p-1">
            <button 
              onClick={() => setBilling('monthly')}
              className={`px-6 py-3 font-mono text-[10px] uppercase tracking-widest font-bold transition-colors ${billing === 'monthly' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:opacity-50'}`}
            >
              MONTHLY
            </button>
            <button
              disabled
              className="px-6 py-3 font-mono text-[10px] uppercase tracking-widest font-bold transition-colors opacity-40 line-through decoration-2 cursor-not-allowed"
            >
              ANNUAL <span className="ml-1">(SAVE 50%)</span>
            </button>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_100%,60px_100%,0_calc(100%-60px))] mx-auto max-w-lg">
          <div className="bg-white dark:bg-black h-full [clip-path:polygon(0_0,100%_0,100%_100%,59px_100%,0_calc(100%-59px))] p-8 md:p-12 flex flex-col">
            
            <div className="text-center mb-12">
              <h2 className="font-mono text-sm uppercase tracking-widest font-bold mb-4">PRO ACCESS</h2>
              <div className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-2">
                ${billing === 'monthly' ? '2' : '12'}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">
                {billing === 'monthly' ? 'PER MONTH' : 'PER MONTH, BILLED ANNUALLY AT $24'}
              </div>
            </div>

            <div className="space-y-6 flex-grow mb-12">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="text-black dark:text-white p-0.5 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs uppercase leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>

            <button className="w-full py-5 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors mt-auto">
              SECURE PAYMENT VIA STRIPE
            </button>

          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-32 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tighter uppercase mb-12 text-center">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <div className="space-y-2">
            <FAQItem 
              question="Can I cancel my subscription at any time?" 
              answer="Yes. You can manage and cancel your subscription directly from your settings page. Once canceled, you will retain Pro access until the end of your current billing cycle." 
            />
            <FAQItem 
              question="Do you offer refunds?" 
              answer="We do not offer refunds for partial months or unused time. You are responsible for the full subscription fee for any billing cycle during which your subscription is active." 
            />
            <FAQItem 
              question="Does this trade for me?" 
              answer="No. You will receive high-quality, pre-audited trade setups and real-time alerts. It is not an automated trading bot, but rather a transparent window into my own strictly risk-managed, AI-audited journal. You execute the trades yourself based on the setups." 
            />
            <FAQItem 
              question="How do alerts work?" 
              answer="Once subscribed, set up your alert channel directly from the dashboard. You'll get instant notifications every step of the way — when a trade is queued, modified, filled, or closed." 
            />
          </div>
        </div>

      </main>
    </div>
  );
}