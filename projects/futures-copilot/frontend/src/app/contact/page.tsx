'use client';

import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContactPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []);

  if (!mounted) return null;

  return (
    <div className="w-full relative">
      <main className="max-w-[800px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">
        
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-6">
            Contact
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest opacity-60 leading-relaxed">
            Interested in the strategy, want to collaborate on the architecture, or have questions about the copilot? Reach out through any of the channels below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-24">
          
          <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@systemsplayground.com'}`} className="group block bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_100%,30px_100%,0_calc(100%-30px))]">
            <div className="bg-white dark:bg-black h-full [clip-path:polygon(0_0,100%_0,100%_100%,29px_100%,0_calc(100%-29px))] p-4 hover:bg-[#f8f8f8] dark:hover:bg-[#111] transition-colors flex flex-col h-[140px]">
              <div className="pb-3 border-b border-black dark:border-white">
                <div className="p-2 flex justify-between bg-black text-white dark:bg-white dark:text-black">
                  <div className="text-sm font-bold tracking-tighter uppercase leading-none flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    EMAIL
                  </div>
                  <div className="text-[10px] leading-none font-mono">/01</div>
                </div>
              </div>
              <div className="mt-4 text-xs font-mono relative overflow-hidden flex-grow flex items-end">
                <div className="w-full flex justify-between items-end pb-1 relative z-10 bg-white dark:bg-black group-hover:bg-[#f8f8f8] dark:group-hover:bg-[#111] transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="opacity-60">Reach out directly</span>
                    <span className="font-bold">{process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@systemsplayground.com'}</span>
                  </div>
                  <div className="overflow-hidden h-[1.2em] relative min-w-[120px] text-right">
                    <div className="absolute inset-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] group-hover:translate-y-0">
                      <span className="font-bold text-black dark:text-white">→ Send email</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>

          <a href={process.env.NEXT_PUBLIC_DISCORD_URL || 'discord://-/channels/@me/153168055709466636'} className="group block bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_100%,30px_100%,0_calc(100%-30px))]">
            <div className="bg-white dark:bg-black h-full [clip-path:polygon(0_0,100%_0,100%_100%,29px_100%,0_calc(100%-29px))] p-4 hover:bg-[#f8f8f8] dark:hover:bg-[#111] transition-colors flex flex-col h-[140px]">
              <div className="pb-3 border-b border-black dark:border-white">
                <div className="p-2 flex justify-between bg-black text-white dark:bg-white dark:text-black">
                  <div className="text-sm font-bold tracking-tighter uppercase leading-none flex items-center gap-2">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 127.14 96.36">
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.68,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z"/>
                    </svg>
                    DISCORD
                  </div>
                  <div className="text-[10px] leading-none font-mono">/02</div>
                </div>
              </div>
              <div className="mt-4 text-xs font-mono relative overflow-hidden flex-grow flex items-end">
                <div className="w-full flex justify-between items-end pb-1 relative z-10 bg-white dark:bg-black group-hover:bg-[#f8f8f8] dark:group-hover:bg-[#111] transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="opacity-60">Send a direct message</span>
                    <span className="font-bold">Message on Discord app</span>
                  </div>
                  <div className="overflow-hidden h-[1.2em] relative min-w-[120px] text-right">
                    <div className="absolute inset-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] group-hover:translate-y-0">
                      <span className="font-bold text-black dark:text-white">→ Open app</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>

        <div className="mt-32 pt-16 border-t border-black dark:border-white text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-6">Ready to enforce discipline?</h2>
          <p className="font-mono text-sm uppercase tracking-widest opacity-60 max-w-xl mx-auto leading-relaxed mb-8">
            Start your trading day with a plan. Early alerts, real-time fills, and AI-enforced discipline — all built around one proven setup.
          </p>
          <a href="/pricing" className="inline-flex px-8 py-4 border border-black dark:border-white font-mono text-[10px] uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-bold">
            VIEW PRICING
          </a>
        </div>

      </main>
    </div>
  );
}