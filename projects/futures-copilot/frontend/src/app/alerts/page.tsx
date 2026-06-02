'use client';

import { useEffect, useRef, useState } from 'react';
import { Webhook, Save, ChevronDown, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { useProtectedGoogleSignIn } from '@/hooks/use-protected-google-signin';

const PANEL_CHAMFER = '[clip-path:polygon(60px_0,100%_0,100%_100%,0_100%,0_60px)]';

type Channel = 'telegram' | 'discord' | 'webhook';

const CHANNELS: Channel[] = ['telegram', 'discord', 'webhook'];

const TEST_COOLDOWN_MS = 60_000;


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

function ChannelIcon({ channel, className }: { channel: Channel; className?: string }) {
  if (channel === 'telegram') return <TelegramIcon className={className} />;
  if (channel === 'discord') return <DiscordIcon className={className} />;
  return <Webhook className={className} />;
}

interface ChannelConfig {
  destination: string;
  enabled: boolean;
  notifyNewDraft: boolean;
  notifyLimitFilled: boolean;
  notifyClosed: boolean;
  notifyInvalidated: boolean;
}

const DEFAULT_CONFIG: ChannelConfig = {
  destination: '',
  enabled: true,
  notifyNewDraft: true,
  notifyLimitFilled: true,
  notifyClosed: true,
  notifyInvalidated: true,
};

export default function AlertsPage() {
  const { toast } = useToast();
  const { status } = useSession();
  const { signInWithRecaptcha, isVerifying } = useProtectedGoogleSignIn();
  const hasAlertsAccess = status === 'authenticated';

  const [activeChannel, setActiveChannel] = useState<Channel>('telegram');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [configs, setConfigs] = useState<Record<Channel, ChannelConfig>>({
    telegram: { ...DEFAULT_CONFIG },
    discord: { ...DEFAULT_CONFIG },
    webhook: { ...DEFAULT_CONFIG },
  });
  const [savedConfigs, setSavedConfigs] = useState<Record<Channel, ChannelConfig>>({
    telegram: { ...DEFAULT_CONFIG },
    discord: { ...DEFAULT_CONFIG },
    webhook: { ...DEFAULT_CONFIG },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<Channel, 'idle' | 'sent' | 'error'>>({
    telegram: 'idle',
    discord: 'idle',
    webhook: 'idle',
  });
  const [testCooldownEnd, setTestCooldownEnd] = useState<Record<Channel, number | null>>({
    telegram: null,
    discord: null,
    webhook: null,
  });
  const [testCooldownLeft, setTestCooldownLeft] = useState<Record<Channel, number>>({
    telegram: 0,
    discord: 0,
    webhook: 0,
  });

  const showBlocker = status !== 'loading' && !hasAlertsAccess;

  // Load saved configs on mount
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/alerts')
      .then(r => r.json())
      .then(data => {
        if (!data.channels) return;
        const updated: Record<Channel, ChannelConfig> = {
          telegram: { ...DEFAULT_CONFIG },
          discord: { ...DEFAULT_CONFIG },
          webhook: { ...DEFAULT_CONFIG },
        };
        for (const ch of data.channels as Array<{ channel: Channel; destination: string; enabled?: boolean; notifyNewDraft: boolean; notifyLimitFilled: boolean; notifyClosed?: boolean; notifyInvalidated?: boolean }>) {
          if (ch.channel in updated) {
            updated[ch.channel] = {
              destination: ch.destination,
              enabled: ch.enabled ?? true,
              notifyNewDraft: ch.notifyNewDraft,
              notifyLimitFilled: ch.notifyLimitFilled,
              notifyClosed: ch.notifyClosed ?? true,
              notifyInvalidated: ch.notifyInvalidated ?? true,
            };
          }
        }
        setConfigs(updated);
        setSavedConfigs(updated);
      })
      .catch(() => {/* silently ignore */});
  }, [status]);

  // Cooldown countdown ticker (per-channel)
  useEffect(() => {
    const activeCooldownEnd = testCooldownEnd[activeChannel];
    if (!activeCooldownEnd) return;
    
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((activeCooldownEnd - Date.now()) / 1000));
      setTestCooldownLeft(prev => ({ ...prev, [activeChannel]: left }));
      if (left === 0) {
        setTestCooldownEnd(prev => ({ ...prev, [activeChannel]: null }));
        setTestStatus(prev => ({ ...prev, [activeChannel]: 'idle' }));
      }
    }, 250);
    return () => clearInterval(interval);
  }, [testCooldownEnd, activeChannel]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function updateConfig(field: keyof ChannelConfig, value: string | boolean) {
    setConfigs(prev => ({
      ...prev,
      [activeChannel]: { ...prev[activeChannel], [field]: value },
    }));
    setSaveStatus('idle');
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const cfg = configs[activeChannel];
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: activeChannel,
          destination: cfg.destination,
          enabled: cfg.enabled,
          notifyNewDraft: cfg.notifyNewDraft,
          notifyLimitFilled: cfg.notifyLimitFilled,
          notifyClosed: cfg.notifyClosed,
          notifyInvalidated: cfg.notifyInvalidated,
        }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        setSavedConfigs(prev => ({ ...prev, [activeChannel]: { ...cfg } }));
        toast('Alert channel configuration saved.', 'success');
      } else {
        setSaveStatus('error');
        toast('Failed to save configuration.', 'error');
      }
    } catch {
      setSaveStatus('error');
      toast('Failed to save configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    if (isTesting || testCooldownEnd[activeChannel]) return;
    const cfg = configs[activeChannel];
    if (!cfg.destination.trim()) return;

    setIsTesting(true);
    setTestStatus(prev => ({ ...prev, [activeChannel]: 'idle' }));
    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: activeChannel, destination: cfg.destination }),
      });
      if (res.ok) {
        setTestStatus(prev => ({ ...prev, [activeChannel]: 'sent' }));
        setTestCooldownEnd(prev => ({ ...prev, [activeChannel]: Date.now() + TEST_COOLDOWN_MS }));
        setTestCooldownLeft(prev => ({ ...prev, [activeChannel]: 60 }));
        toast(`${activeChannel.toUpperCase()} test delivered.`, 'success');
      } else {
        setTestStatus(prev => ({ ...prev, [activeChannel]: 'error' }));
        toast(`Failed to deliver ${activeChannel.toUpperCase()} test.`, 'error');
        // On 429, still start cooldown
        if (res.status === 429) {
          setTestCooldownEnd(prev => ({ ...prev, [activeChannel]: Date.now() + TEST_COOLDOWN_MS }));
          setTestCooldownLeft(prev => ({ ...prev, [activeChannel]: 60 }));
        }
      }
    } catch {
      setTestStatus(prev => ({ ...prev, [activeChannel]: 'error' }));
      toast(`Failed to deliver ${activeChannel.toUpperCase()} test.`, 'error');
    } finally {
      setIsTesting(false);
    }
  }

  const currentCfg = configs[activeChannel];
  const savedCfg = savedConfigs[activeChannel];
  const isDirty = JSON.stringify(currentCfg) !== JSON.stringify(savedCfg);
  const canTest = currentCfg.destination.trim() !== '' && !testCooldownEnd[activeChannel] && !isTesting;

  return (
    <div className="w-full relative">
      <main className="max-w-[1200px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">

        {/* Hero Section */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-6">
            Alert Channels
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest opacity-60 max-w-2xl leading-relaxed">
            Configure where you want to receive real-time research notifications for draft setups, fills, invalidations, and closed trades.
          </p>
        </div>

        {/* Config Panel */}
        <motion.div
          key={activeChannel}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative bg-black dark:bg-white p-[1px] ${PANEL_CHAMFER}`}
        >
          <div className={`relative bg-white dark:bg-black h-full flex flex-col ${PANEL_CHAMFER} p-8 md:p-12`}>

            {/* Channel dropdown */}
            <div ref={dropdownRef} className="relative mb-10 self-start min-w-[220px]">
              <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">
                Channel
              </label>
              <button
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className="w-full bg-transparent border border-black dark:border-white px-4 py-3 font-mono text-sm uppercase tracking-widest focus:outline-none flex justify-between items-center gap-6 text-black dark:text-white"
              >
                <span className="flex items-center gap-3">
                  <ChannelIcon channel={activeChannel} className="w-4 h-4" />
                  {activeChannel}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col"
                  >
                    {CHANNELS.map(ch => (
                      <button
                        key={ch}
                        onClick={() => {
                          const previousChannel = activeChannel;
                          setConfigs(prev => ({
                            ...prev,
                            [previousChannel]: { ...savedConfigs[previousChannel] },
                            [ch]: { ...savedConfigs[ch] },
                          }));
                          setActiveChannel(ch);
                          setIsDropdownOpen(false);
                          setSaveStatus('idle');
                        }}
                        className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors border-b last:border-b-0 border-black dark:border-white flex items-center gap-3 ${
                          activeChannel === ch
                            ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                            : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black opacity-80 hover:opacity-100'
                        }`}
                      >
                        <ChannelIcon channel={ch} className="w-4 h-4" />
                        {ch}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">
                  {activeChannel === 'telegram' ? 'TELEGRAM DESTINATION URL' : activeChannel === 'discord' ? 'DISCORD WEBHOOK URL' : 'WEBHOOK ENDPOINT URL'}
                </label>
                <input
                  type="text"
                  value={currentCfg.destination}
                  onChange={e => updateConfig('destination', e.target.value)}
                  placeholder={
                    activeChannel === 'discord'
                      ? 'https://discord.com/api/webhooks/{the channel}/{token}'
                      : activeChannel === 'telegram'
                        ? 'https://api.telegram.org/bot{token}/setWebhook?url={channelid}'
                        : 'https://webhook.site/{your-endpoint-id}'
                  }
                  className="w-full bg-transparent border-b border-black dark:border-white py-3 font-mono text-lg focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30"
                />
                {activeChannel === 'webhook' && (
                  <p className="font-mono text-[9px] uppercase tracking-widest opacity-50 mt-3">
                    Tip: use webhook.site or requestbin.com to inspect test payloads instantly.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">CHANNEL STATUS</label>
                <div className="flex items-center gap-3 font-mono text-xs uppercase">
                  <input
                    type="checkbox"
                    checked={currentCfg.enabled}
                    onChange={e => updateConfig('enabled', e.target.checked)}
                    className="accent-black dark:accent-white w-4 h-4"
                  />
                  <span>ENABLE ALERTS</span>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-3">EVENT TRIGGERS</label>
                <div className="flex flex-col gap-4 font-mono text-xs uppercase">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={currentCfg.notifyNewDraft}
                      onChange={e => updateConfig('notifyNewDraft', e.target.checked)}
                      className="accent-black dark:accent-white w-4 h-4"
                    />
                    <span>NEW DRAFT CREATED</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={currentCfg.notifyLimitFilled}
                      onChange={e => updateConfig('notifyLimitFilled', e.target.checked)}
                      className="accent-black dark:accent-white w-4 h-4"
                    />
                    <span>LIMIT ORDER FILLED</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={currentCfg.notifyInvalidated}
                      onChange={e => updateConfig('notifyInvalidated', e.target.checked)}
                      className="accent-black dark:accent-white w-4 h-4"
                    />
                    <span>TRADE INVALIDATED</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={currentCfg.notifyClosed}
                      onChange={e => updateConfig('notifyClosed', e.target.checked)}
                      className="accent-black dark:accent-white w-4 h-4"
                    />
                    <span>TRADE CLOSED</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !isDirty}
                  className="flex-1 py-4 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex justify-center items-center gap-2 disabled:opacity-40"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'SAVING...' : saveStatus === 'saved' ? 'SAVED ✓' : saveStatus === 'error' ? 'ERROR — RETRY' : 'SAVE CONFIGURATION'}
                </button>

                <button
                  onClick={handleTest}
                  disabled={!canTest}
                  title={!currentCfg.destination.trim() ? 'Enter a destination first' : testCooldownEnd[activeChannel] ? `Wait ${testCooldownLeft[activeChannel]}s` : 'Send a test message'}
                  className="flex-1 py-4 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex justify-center items-center gap-2 disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  {isTesting
                    ? 'SENDING...'
                    : testCooldownEnd[activeChannel]
                      ? `TEST AGAIN IN ${testCooldownLeft[activeChannel]}S`
                      : testStatus[activeChannel] === 'sent'
                        ? 'SENT ✓'
                        : testStatus[activeChannel] === 'error'
                          ? 'DELIVERY FAILED'
                          : 'SEND TEST'}
                </button>
              </div>

              {testStatus[activeChannel] === 'error' && (
                <p className="font-mono text-[10px] uppercase tracking-widest text-red-500">
                  Could not deliver the test message. Check your {activeChannel === 'telegram' ? 'telegram destination URL' : 'webhook URL'} and try again.
                </p>
              )}
            </div>

            {status === 'loading' ? (
              <div className={`absolute inset-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center ${PANEL_CHAMFER}`} />
            ) : showBlocker ? (
              <div className={`absolute inset-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center ${PANEL_CHAMFER}`}>
                <div className="border border-black dark:border-white bg-white dark:bg-black p-8 max-w-sm shadow-2xl">
                  <>
                    <h3 className="font-mono text-xl font-bold tracking-tighter uppercase mb-4">SIGN IN REQUIRED</h3>
                    <p className="font-mono text-[10px] uppercase opacity-60 mb-6 leading-relaxed">
                      Sign in to configure alert channels.
                    </p>
                    <button
                      onClick={() => signInWithRecaptcha({ callbackUrl: '/alerts', action: 'sign_up' })}
                      disabled={isVerifying}
                      className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity inline-flex items-center justify-center gap-3 leading-none"
                    >
                      <span className="inline-flex size-4 items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className="block size-3.5 fill-current" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                      </span>
                      <span className="leading-none">{isVerifying ? 'VERIFYING...' : 'SIGN IN'}</span>
                    </button>
                  </>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>

      </main>
    </div>
  );
}
