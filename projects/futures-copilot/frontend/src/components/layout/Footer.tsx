'use client';

import { useSession } from "next-auth/react";

export default function Footer() {
  const { data: session } = useSession();

  return (
    <footer className="border-t border-black dark:border-white bg-white dark:bg-black mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row justify-between items-start gap-8">
        <div>
          <h3 className="font-mono text-sm uppercase tracking-widest font-bold mb-2">FUTURES COPILOT</h3>
          <p className="font-mono text-[10px] uppercase opacity-60 max-w-xs leading-relaxed mb-6">
            An AI-assisted probability engine for futures trading. Powered by dynamic trade logic and strict rubrics. Radical transparency. No black boxes. See every setup drafted, objectively scored for profitability by AI, and transparently logged from entry to the final close.
          </p>
          <div className="flex gap-4 text-[10px] font-mono uppercase tracking-widest opacity-60">
            <span>© {new Date().getFullYear()} FUTURES COPILOT</span>
          </div>
        </div>
        
        <div className="flex gap-12 font-mono text-xs uppercase tracking-widest">
          <div className="flex flex-col gap-3">
            <span className="opacity-60 mb-2">RESOURCES</span>
            <a href="/how-it-works" className="hover:opacity-50 transition-opacity">HOW IT WORKS</a>
            <a href="/contact" className="hover:opacity-50 transition-opacity">CONTACT</a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="opacity-60 mb-2">PLATFORM</span>
            <a href="/dashboard" className="hover:opacity-50 transition-opacity">DASHBOARD</a>
            <a href="/alerts" className="hover:opacity-50 transition-opacity">ALERTS</a>
            {session && (
              <a href="/settings" className="hover:opacity-50 transition-opacity">SETTINGS</a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
