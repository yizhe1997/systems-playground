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
            Interested in the strategy, have questions about the copilot, or want to discuss the architecture? Reach out through any of the channels below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-24">
          
          <a href="#" className="group block bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_100%,30px_100%,0_calc(100%-30px))]">
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
                    <span className="font-bold">hello@systemsplayground.com</span>
                  </div>
                  <div className="overflow-hidden h-[1.2em] relative min-w-[120px] text-right">
                    <div className="absolute inset-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] group-hover:translate-y-0">
                      <span className="font-bold text-black dark:text-white">→ Get in touch</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>

          <a href="#" className="group block bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_100%,30px_100%,0_calc(100%-30px))]">
            <div className="bg-white dark:bg-black h-full [clip-path:polygon(0_0,100%_0,100%_100%,29px_100%,0_calc(100%-29px))] p-4 hover:bg-[#f8f8f8] dark:hover:bg-[#111] transition-colors flex flex-col h-[140px]">
              <div className="pb-3 border-b border-black dark:border-white">
                <div className="p-2 flex justify-between bg-black text-white dark:bg-white dark:text-black">
                  <div className="text-sm font-bold tracking-tighter uppercase leading-none flex items-center gap-2">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.936H5.059z" />
                    </svg>
                    TWITTER / X
                  </div>
                  <div className="text-[10px] leading-none font-mono">/02</div>
                </div>
              </div>
              <div className="mt-4 text-xs font-mono relative overflow-hidden flex-grow flex items-end">
                <div className="w-full flex justify-between items-end pb-1 relative z-10 bg-white dark:bg-black group-hover:bg-[#f8f8f8] dark:group-hover:bg-[#111] transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="opacity-60">Follow for updates</span>
                    <span className="font-bold">@yizhechin</span>
                  </div>
                  <div className="overflow-hidden h-[1.2em] relative min-w-[120px] text-right">
                    <div className="absolute inset-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] group-hover:translate-y-0">
                      <span className="font-bold text-black dark:text-white">→ Follow me</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>

          <a href="#" className="group block bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_100%,30px_100%,0_calc(100%-30px))]">
            <div className="bg-white dark:bg-black h-full [clip-path:polygon(0_0,100%_0,100%_100%,29px_100%,0_calc(100%-29px))] p-4 hover:bg-[#f8f8f8] dark:hover:bg-[#111] transition-colors flex flex-col h-[140px]">
              <div className="pb-3 border-b border-black dark:border-white">
                <div className="p-2 flex justify-between bg-black text-white dark:bg-white dark:text-black">
                  <div className="text-sm font-bold tracking-tighter uppercase leading-none flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    DISCORD
                  </div>
                  <div className="text-[10px] leading-none font-mono">/03</div>
                </div>
              </div>
              <div className="mt-4 text-xs font-mono relative overflow-hidden flex-grow flex items-end">
                <div className="w-full flex justify-between items-end pb-1 relative z-10 bg-white dark:bg-black group-hover:bg-[#f8f8f8] dark:group-hover:bg-[#111] transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="opacity-60">Join the community</span>
                    <span className="font-bold">Discuss architecture & trades</span>
                  </div>
                  <div className="overflow-hidden h-[1.2em] relative min-w-[120px] text-right">
                    <div className="absolute inset-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] group-hover:translate-y-0">
                      <span className="font-bold text-black dark:text-white">→ Join server</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>

          <a href="#" className="group block bg-black dark:bg-white p-[1px] [clip-path:polygon(0_0,100%_0,100%_100%,30px_100%,0_calc(100%-30px))]">
            <div className="bg-white dark:bg-black h-full [clip-path:polygon(0_0,100%_0,100%_100%,29px_100%,0_calc(100%-29px))] p-4 hover:bg-[#f8f8f8] dark:hover:bg-[#111] transition-colors flex flex-col h-[140px]">
              <div className="pb-3 border-b border-black dark:border-white">
                <div className="p-2 flex justify-between bg-black text-white dark:bg-white dark:text-black">
                  <div className="text-sm font-bold tracking-tighter uppercase leading-none flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    PORTFOLIO
                  </div>
                  <div className="text-[10px] leading-none font-mono">/04</div>
                </div>
              </div>
              <div className="mt-4 text-xs font-mono relative overflow-hidden flex-grow flex items-end">
                <div className="w-full flex justify-between items-end pb-1 relative z-10 bg-white dark:bg-black group-hover:bg-[#f8f8f8] dark:group-hover:bg-[#111] transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="opacity-60">View the main showcase</span>
                    <span className="font-bold">systemsplayground.com</span>
                  </div>
                  <div className="overflow-hidden h-[1.2em] relative min-w-[120px] text-right">
                    <div className="absolute inset-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] group-hover:translate-y-0">
                      <span className="font-bold text-black dark:text-white">→ View portfolio</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>

      </main>
    </div>
  );
}