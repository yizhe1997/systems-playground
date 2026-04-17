'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Bell, Webhook, MessageCircle, Save } from 'lucide-react';
import { motion } from 'framer-motion';

import { useSession, signIn } from 'next-auth/react';

export default function AlertsPage() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role || 'USER'; // Default to USER if logged in but role is missing
  const isSubscribed = userRole === 'SUBSCRIBER' || userRole === 'ADMIN';
  const [mounted, setMounted] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'telegram' | 'discord' | 'webhook'>('telegram');

  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []);

  if (!mounted) return null;

  // We should wait until auth status is known before showing block screens
  const showBlocker = status !== 'loading' && !isSubscribed;

  return (
    <div className="w-full relative">
      <main className="max-w-[1200px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">

        {/* Hero Section */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-6">
            Alert Channels
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest opacity-60 max-w-2xl leading-relaxed">
            Configure where you want to receive real-time push notifications for new setups, fills, and stop-loss trailing updates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Side Menu */}
          <div className="md:col-span-4 flex flex-col gap-4 font-mono text-xs uppercase tracking-widest">
            <button 
              onClick={() => setActiveChannel('telegram')}
              className={`p-6 border border-black dark:border-white text-left transition-colors flex items-center gap-4 ${activeChannel === 'telegram' ? 'bg-black text-white dark:bg-white dark:text-black font-bold' : 'bg-white dark:bg-black hover:opacity-70'}`}
            >
              <MessageCircle className="w-4 h-4" /> Telegram
            </button>
            <button 
              onClick={() => setActiveChannel('discord')}
              className={`p-6 border border-black dark:border-white text-left transition-colors flex items-center gap-4 ${activeChannel === 'discord' ? 'bg-black text-white dark:bg-white dark:text-black font-bold' : 'bg-white dark:bg-black hover:opacity-70'}`}
            >
              <MessageCircle className="w-4 h-4" /> Discord
            </button>
            <button 
              onClick={() => setActiveChannel('webhook')}
              className={`p-6 border border-black dark:border-white text-left transition-colors flex items-center gap-4 ${activeChannel === 'webhook' ? 'bg-black text-white dark:bg-white dark:text-black font-bold' : 'bg-white dark:bg-black hover:opacity-70'}`}
            >
              <Webhook className="w-4 h-4" /> Webhook
            </button>
          </div>

          {/* Config Panel */}
          <div className="md:col-span-8 relative">
            {status === 'loading' ? (
              <div className="absolute inset-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center" />
            ) : showBlocker ? (
              <div className="absolute inset-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center [clip-path:polygon(30px_0,100%_0,100%_100%,0_100%,0_30px)]">
                <div className="border border-black dark:border-white bg-white dark:bg-black p-8 max-w-sm shadow-2xl">
                  {status === 'unauthenticated' ? (
                    <>
                      <h3 className="font-mono text-xl font-bold tracking-tighter uppercase mb-4">SIGN IN REQUIRED</h3>
                      <p className="font-mono text-[10px] uppercase opacity-60 mb-6 leading-relaxed">
                        You need to sign in and have an active subscription to access your alert channels.
                      </p>
                      <button 
                        onClick={() => signIn('google', { callbackUrl: '/alerts' })}
                        className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity"
                      >
                        SIGN IN VIA GOOGLE
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="font-mono text-xl font-bold tracking-tighter uppercase mb-4">SUBSCRIPTION REQUIRED</h3>
                      <p className="font-mono text-[10px] uppercase opacity-60 mb-6 leading-relaxed">
                        You need an active subscription to configure push notifications and webhook endpoints.
                      </p>
                      <button 
                        onClick={() => setIsPricingOpen(true)}
                        className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity"
                      >
                        UPGRADE NOW ($2/MO)
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : null}
            
            <motion.div 
              key={activeChannel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black dark:bg-white p-[1px] [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]"
            >
              <div className="bg-white dark:bg-black h-full flex flex-col [clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)] p-8 md:p-12">
                <h2 className="font-mono text-lg uppercase tracking-widest font-bold mb-8 flex items-center gap-3">
                  {activeChannel === 'webhook' ? <Webhook className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                  CONFIGURE {activeChannel}
                </h2>

                <div className="space-y-8">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">
                      {activeChannel === 'telegram' ? 'TELEGRAM CHAT ID' : activeChannel === 'discord' ? 'DISCORD WEBHOOK URL' : 'ENDPOINT URL'}
                    </label>
                    <input 
                      type="text" 
                      placeholder={activeChannel === 'telegram' ? 'e.g. 123456789' : 'https://...'} 
                      className="w-full bg-transparent border-b border-black dark:border-white py-3 font-mono text-lg focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30" 
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">EVENT TRIGGERS</label>
                    <div className="flex flex-col gap-4 font-mono text-xs uppercase">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-black dark:accent-white w-4 h-4" />
                        NEW DRAFT SETUPS
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-black dark:accent-white w-4 h-4" />
                        LIMIT ORDER FILLED
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-black dark:accent-white w-4 h-4" />
                        STOP LOSS / TAKE PROFIT HIT
                      </label>
                    </div>
                  </div>

                  <button className="w-full py-4 mt-8 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity flex justify-center items-center gap-2">
                    <Save className="w-4 h-4" />
                    SAVE CONFIGURATION
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

      </main>
    </div>
  );
}
