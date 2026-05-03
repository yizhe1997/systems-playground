'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Webhook, Save } from 'lucide-react';
import { motion } from 'framer-motion';

import { useSession, signIn } from 'next-auth/react';

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M9.78 18.65c-.39 0-.32-.15-.45-.52l-1.12-3.67 8.58-5.41" />
      <path d="M9.78 18.65c.3 0 .44-.14.62-.3l1.56-1.52-1.95-1.17" />
      <path d="M9.99 15.66 14.7 19.1c.54.3.93.15 1.06-.5L18.7 4.7c.2-.8-.3-1.15-.82-.92L3.05 9.5c-1 .4-1 .96-.18 1.2l3.8 1.18L15.45 6c.42-.25.8-.12.48.16" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369A19.791 19.791 0 0 0 15.885 3c-.191.328-.403.769-.554 1.116a18.27 18.27 0 0 0-5.487 0A11.655 11.655 0 0 0 9.29 3a19.736 19.736 0 0 0-4.433 1.369C2.05 8.55 1.285 12.629 1.668 16.65a19.9 19.9 0 0 0 5.43 2.755c.443-.613.836-1.262 1.174-1.941-.645-.247-1.26-.554-1.838-.914.154-.114.305-.231.452-.351a14.146 14.146 0 0 0 12.228 0c.148.12.299.237.452.351-.578.36-1.194.667-1.839.914.338.679.731 1.328 1.174 1.941a19.86 19.86 0 0 0 5.431-2.755c.449-4.66-.765-8.702-3.586-12.281zM8.02 14.37c-1.183 0-2.157-1.085-2.157-2.419 0-1.334.955-2.419 2.157-2.419 1.212 0 2.176 1.095 2.157 2.419 0 1.334-.955 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.334.955-2.419 2.157-2.419 1.212 0 2.176 1.095 2.157 2.419 0 1.334-.945 2.419-2.157 2.419z" />
    </svg>
  );
}

export default function AlertsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userRole = (session?.user as { role?: string })?.role || 'USER';
  const isSubscribed = userRole === 'SUBSCRIBER' || userRole === 'ADMIN';
  const [activeChannel, setActiveChannel] = useState<'telegram' | 'discord' | 'webhook'>('telegram');

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
              <TelegramIcon className="w-4 h-4" /> Telegram
            </button>
            <button 
              onClick={() => setActiveChannel('discord')}
              className={`p-6 border border-black dark:border-white text-left transition-colors flex items-center gap-4 ${activeChannel === 'discord' ? 'bg-black text-white dark:bg-white dark:text-black font-bold' : 'bg-white dark:bg-black hover:opacity-70'}`}
            >
              <DiscordIcon className="w-4 h-4" /> Discord
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
                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        SIGN IN
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="font-mono text-xl font-bold tracking-tighter uppercase mb-4">SUBSCRIPTION REQUIRED</h3>
                      <p className="font-mono text-[10px] uppercase opacity-60 mb-6 leading-relaxed">
                        You need an active subscription to configure push notifications and webhook endpoints.
                      </p>
                      <button 
                        onClick={() => router.push('/pricing')}
                        className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity"
                      >
                        UPGRADE NOW
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
                  {activeChannel === 'webhook' ? <Webhook className="w-5 h-5" /> : activeChannel === 'telegram' ? <TelegramIcon className="w-5 h-5" /> : <DiscordIcon className="w-5 h-5" />}
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

                  <button className="w-full py-4 mt-8 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex justify-center items-center gap-2">
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
