'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, CreditCard, UserX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getAIProviderConfig, saveAIProviderConfig } from '@/lib/dashboard/api';
import { AIProviderConfigState } from '../dashboard/types';

const AI_FEATURES: { key: string; label: string }[] = [
  { key: 'scrapeRules', label: 'Scrape From URLs' },
  { key: 'cleanupText', label: 'Cleanup Text' },
];

const MODEL_PRESETS: Record<string, string[]> = {
  openrouter: [
    'openrouter/free',
    'google/gemini-2.0-flash-001',
    'google/gemini-2.0-flash-lite-001',
  ],
  gemini: [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ],
  anthropic: [
    'claude-3-5-haiku-latest',
    'claude-3-5-sonnet-latest',
  ],
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState('scrapeRules');
  const [featureDropdownOpen, setFeatureDropdownOpen] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const featureDropdownRef = useRef<HTMLDivElement>(null);
  const providerDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [aiConfig, setAiConfig] = useState<AIProviderConfigState>({
    features: [],
    timeoutMs: 15000,
    availableProviders: [],
  });
  const [isAiConfigLoading, setIsAiConfigLoading] = useState(false);
  const [isAiConfigSaving, setIsAiConfigSaving] = useState(false);
  const [aiConfigMessage, setAiConfigMessage] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    if (status === 'unauthenticated') {
      router.push('/');
    }
    return () => clearTimeout(t);
  }, [status, router]);

  const role = (session?.user as unknown as { role?: string })?.role || 'ANON';
  const isSubscribed = role === 'SUBSCRIBER' || role === 'ADMIN';
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    let cancelled = false;

    async function loadAIConfig() {
      if (!mounted || !session || !isAdmin) return;
      setIsAiConfigLoading(true);
      setAiConfigMessage('');
      try {
        const config = await getAIProviderConfig();
        if (cancelled) return;
        setAiConfig({
          features: config.features || [],
          timeoutMs: config.timeoutMs,
          availableProviders: (config.availableProviders || []).filter(p => p !== 'mock'),
        });
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setAiConfigMessage('Failed to load AI routing settings.');
        }
      } finally {
        if (!cancelled) {
          setIsAiConfigLoading(false);
        }
      }
    }

    loadAIConfig();

    return () => {
      cancelled = true;
    };
  }, [mounted, session, isAdmin]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (featureDropdownRef.current && !featureDropdownRef.current.contains(e.target as Node)) {
        setFeatureDropdownOpen(false);
      }
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(e.target as Node)) {
        setProviderDropdownOpen(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted || status === 'loading' || !session) return null;

  const handleDisableUser = async () => {
    const confirm = window.confirm("Are you sure you want to delete your account? This will log you out and prevent future access.");
    if (!confirm) return;

    setIsDeleting(true);
    try {
      await fetch('/api/copilot/users/disable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user?.email })
      });
      signOut({ callbackUrl: '/' });
    } catch(e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  const providerLabel = (provider: string) => {
    switch (provider) {
      case 'openrouter':
        return 'OpenRouter';
      case 'gemini':
        return 'Gemini (Direct)';
      case 'anthropic':
        return 'Anthropic (Direct)';
      default:
        return provider;
    }
  };

  const handleSaveAIConfig = async () => {
    setIsAiConfigSaving(true);
    setAiConfigMessage('');

    try {
      await saveAIProviderConfig({
        features: aiConfig.features,
        timeoutMs: aiConfig.timeoutMs,
      });

      setAiConfigMessage('AI feature routing updated. New requests will use these assignments.');
    } catch (error) {
      console.error(error);
      setAiConfigMessage('Failed to save AI feature routing.');
    }

    setIsAiConfigSaving(false);
  };

  const selectedFeature = aiConfig.features.find(f => f.key === selectedFeatureKey);
  const selectedProvider = selectedFeature?.provider ?? '';
  const selectedModel = selectedFeature?.model ?? '';
  const modelPresets = MODEL_PRESETS[selectedProvider] ?? [];

  return (
    <div className="w-full relative min-h-screen">
      <main className="max-w-[800px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">

        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-12">
          Settings
        </h1>

        <div className="space-y-12">
          {/* Subscription Section */}
          <section>
            <h2 className="font-mono text-xl uppercase tracking-widest font-bold border-b border-black dark:border-white pb-4 mb-6">
              Subscription
            </h2>

            <div className="border border-black dark:border-white p-8 bg-white dark:bg-black">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-8 border-b border-black/20 dark:border-white/20 gap-6">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">STATUS</div>
                  <div className={`font-mono text-2xl font-bold ${isSubscribed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {role === 'ADMIN' ? 'LIFETIME ADMIN' : (role === 'SUBSCRIBER' ? 'ACTIVE' : 'NOT SUBSCRIBED')}
                  </div>
                </div>
                {role === 'SUBSCRIBER' && (
                  <div className="md:text-right">
                    <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">NEXT BILLING CYCLE</div>
                    <div className="font-mono text-lg">May 16, 2026</div>
                  </div>
                )}
              </div>

              {role === 'ADMIN' ? (
                <div className="font-mono text-sm opacity-60 leading-relaxed">
                  Admins automatically receive full platform access and real-time alerts. No active billing required.
                </div>
              ) : role === 'SUBSCRIBER' ? (
                <div className="flex flex-col gap-4 md:flex-row justify-between">
                  <button className="flex items-center justify-center gap-2 px-6 py-4 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                    <CreditCard className="w-4 h-4" /> UPDATE PAYMENT
                  </button>
                  <button className="px-6 py-4 border border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400 font-mono text-xs uppercase tracking-widest font-bold hover:bg-rose-600 hover:text-white dark:hover:bg-rose-400 dark:hover:text-black transition-colors">
                    CANCEL SUBSCRIPTION
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="font-mono text-sm opacity-60 mb-4 leading-relaxed">
                    You currently do not have an active subscription. Subscribe to receive instant real-time alerts and access the private trade log database.
                  </p>
                  <button className="w-full md:w-auto px-8 py-4 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity text-center self-start">
                    START SUBSCRIPTION ($2/MO)
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Security Section — hidden for admins */}
          {!isAdmin && (
            <section>
              <h2 className="font-mono text-xl uppercase tracking-widest font-bold border-b border-black dark:border-white pb-4 mb-6">
                Security
              </h2>

              <div className="border border-rose-600 dark:border-rose-400 p-8 bg-rose-500/5">
                <div className="flex flex-col md:flex-row items-start gap-4 mb-6 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-mono text-lg font-bold mb-2 uppercase tracking-widest">Delete Account</h3>
                    <p className="font-mono text-xs opacity-80 leading-relaxed max-w-xl">
                      Permanently delete your account, wiping all trade plans, history, and preferences from our servers. Active subscriptions will be canceled immediately. This action cannot be undone.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDisableUser}
                  disabled={isDeleting}
                  className="flex items-center justify-center w-full md:w-auto gap-2 px-6 py-4 bg-rose-600 text-white font-mono text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" /> {isDeleting ? 'DELETING...' : 'PROCEED WITH DELETION'}
                </button>
              </div>
            </section>
          )}

          {/* AI Feature Routing — admin only */}
          {isAdmin && (
            <section>
              <h2 className="font-mono text-xl uppercase tracking-widest font-bold border-b border-black dark:border-white pb-4 mb-6">
                AI Feature Routing
              </h2>

              <div className="border border-black dark:border-white p-8 bg-white dark:bg-black space-y-6">
                {isAiConfigLoading ? (
                  <p className="font-mono text-xs uppercase tracking-widest opacity-60">Loading AI configuration...</p>
                ) : (aiConfig.availableProviders ?? []).length === 0 ? (
                  <p className="font-mono text-xs uppercase tracking-widest opacity-60 leading-relaxed">
                    No AI providers are currently available. Add provider keys in backend/.env to enable AI feature routing.
                  </p>
                ) : (
                  <>
                    {/* Feature dropdown */}
                    <div ref={featureDropdownRef} className="relative">
                      <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Feature</label>
                      <button
                        onClick={() => setFeatureDropdownOpen(prev => !prev)}
                        className="w-full bg-transparent border border-black dark:border-white px-4 py-3 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                      >
                        <span>{AI_FEATURES.find(f => f.key === selectedFeatureKey)?.label ?? selectedFeatureKey}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${featureDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {featureDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col"
                          >
                            {AI_FEATURES.map(f => (
                              <button
                                key={f.key}
                                onClick={() => { setSelectedFeatureKey(f.key); setFeatureDropdownOpen(false); }}
                                className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors border-b last:border-b-0 border-black dark:border-white ${
                                  selectedFeatureKey === f.key
                                    ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Provider dropdown */}
                    <div ref={providerDropdownRef} className="relative">
                      <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Provider</label>
                      <button
                        onClick={() => setProviderDropdownOpen(prev => !prev)}
                        className="w-full bg-transparent border border-black dark:border-white px-4 py-3 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                      >
                        <span>{providerLabel(aiConfig.features.find(f => f.key === selectedFeatureKey)?.provider ?? '') || 'Select provider'}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${providerDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {providerDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col"
                          >
                            {(aiConfig.availableProviders ?? []).map(p => (
                              <button
                                key={p}
                                onClick={() => {
                                  setAiConfig(cur => ({
                                    ...cur,
                                    features: cur.features.map(f => f.key === selectedFeatureKey ? { ...f, provider: p } : f),
                                  }));
                                  setProviderDropdownOpen(false);
                                }}
                                className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors border-b last:border-b-0 border-black dark:border-white ${
                                  aiConfig.features.find(f => f.key === selectedFeatureKey)?.provider === p
                                    ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                                }`}
                              >
                                {providerLabel(p)}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Model */}
                    <div ref={modelDropdownRef} className="relative">
                      <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Model</label>
                      <button
                        onClick={() => setModelDropdownOpen(prev => !prev)}
                        className="w-full bg-transparent border border-black dark:border-white px-4 py-3 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                      >
                        <span>{selectedModel || 'Select model'}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {modelDropdownOpen && modelPresets.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-black border border-black dark:border-white shadow-xl z-50 flex flex-col"
                          >
                            {modelPresets.map(model => (
                              <button
                                key={model}
                                onClick={() => {
                                  setAiConfig(cur => ({
                                    ...cur,
                                    features: cur.features.map(f => f.key === selectedFeatureKey ? { ...f, model } : f),
                                  }));
                                  setModelDropdownOpen(false);
                                }}
                                className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors border-b last:border-b-0 border-black dark:border-white ${
                                  selectedModel === model
                                    ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                                }`}
                              >
                                {model}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Timeout */}
                    <div className="max-w-xs">
                      <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Timeout (ms)</label>
                      <input
                        type="number"
                        min={1000}
                        step={500}
                        value={aiConfig.timeoutMs}
                        onChange={e => setAiConfig(cur => ({ ...cur, timeoutMs: Number(e.target.value) || 15000 }))}
                        className="w-full bg-transparent border border-black dark:border-white py-3 px-4 font-mono text-xs tracking-widest focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={handleSaveAIConfig}
                      disabled={isAiConfigSaving}
                      className="px-6 py-4 border border-black dark:border-white font-mono text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-40"
                    >
                      {isAiConfigSaving ? 'Saving...' : 'Save AI Routing'}
                    </button>
                  </>
                )}
                {aiConfigMessage && (
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-70">{aiConfigMessage}</p>
                )}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
