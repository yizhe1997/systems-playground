'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, ChevronDown, User, UserX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getAIProviderConfig, saveAIProviderConfig } from '@/lib/dashboard/api';
import { AIProviderConfigState } from '../dashboard/types';
import { useToast } from '@/hooks/use-toast';

const CARD_OUTER_CHAMFER =
  '[clip-path:polygon(0_0,100%_0,100%_calc(100%-30px),calc(100%-30px)_100%,0_100%)]';
const CARD_INNER_CHAMFER =
  '[clip-path:polygon(0_0,100%_0,100%_calc(100%-29px),calc(100%-29px)_100%,0_100%)]';

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteInlineConfirm, setShowDeleteInlineConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteConfirmError, setDeleteConfirmError] = useState('');

  const [expandedCards, setExpandedCards] = useState({
    access: true,
    security: false,
    ai: false,
  });

  const [selectedFeatureKey, setSelectedFeatureKey] = useState('');
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
    modelPresets: {},
  });
  const [isAiConfigLoading, setIsAiConfigLoading] = useState(false);
  const [isAiConfigSaving, setIsAiConfigSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const role = (session?.user as unknown as { role?: string })?.role || 'ANON';
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    let cancelled = false;

    async function loadAIConfig() {
      if (!session || !isAdmin) return;
      setIsAiConfigLoading(true);
      try {
        const config = await getAIProviderConfig();
        if (cancelled) return;

        setAiConfig({
          features: config.features || [],
          timeoutMs: config.timeoutMs,
          availableProviders: (config.availableProviders || []).filter(p => p !== 'mock'),
          modelPresets: config.modelPresets || {},
        });

        if ((config.features || []).length > 0) {
          setSelectedFeatureKey(config.features[0].key);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          toast('Failed to load AI routing settings.', 'error');
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
  }, [session, isAdmin, toast]);

  useEffect(() => {
    if (aiConfig.features.length === 0) {
      if (selectedFeatureKey !== '') {
        setSelectedFeatureKey('');
      }
      return;
    }

    const exists = aiConfig.features.some(f => f.key === selectedFeatureKey);
    if (!exists) {
      setSelectedFeatureKey(aiConfig.features[0].key);
    }
  }, [aiConfig.features, selectedFeatureKey]);

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

  const userEmail = (session?.user?.email || '').trim();
  const createdAtRaw = (session?.user as unknown as { createdAt?: string })?.createdAt;
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : null;
  const createdAtDisplay =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
        })
      : 'N/A';
  const accountRoleLabel = role === 'ADMIN' ? 'ADMIN' : 'USER';
  const canConfirmDeletion =
    userEmail !== '' && deleteConfirmEmail.trim().toLowerCase() === userEmail.toLowerCase();

  const handleDisableUser = async () => {
    if (!canConfirmDeletion) {
      setDeleteConfirmError('Email does not match your account email.');
      setShowDeleteInlineConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      await fetch('/api/users/disable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      signOut({ callbackUrl: '/' });
    } catch (e) {
      console.error(e);
      toast('Failed to disable account.', 'error');
      setIsDeleting(false);
    }
  };

  const openDeleteInlineConfirm = () => {
    setDeleteConfirmEmail('');
    setDeleteConfirmError('');
    setShowDeleteInlineConfirm(true);
  };

  const closeDeleteInlineConfirm = () => {
    if (isDeleting) return;
    setShowDeleteInlineConfirm(false);
    setDeleteConfirmEmail('');
    setDeleteConfirmError('');
  };

  const providerLabel = (provider: string) => {
    switch (provider) {
      case 'openrouter':
        return 'OpenRouter';
      case 'google':
      case 'gemini':
        return 'Google AI Studio (Direct)';
      case 'anthropic':
        return 'Anthropic (Direct)';
      default:
        return provider;
    }
  };

  const handleSaveAIConfig = async () => {
    setIsAiConfigSaving(true);

    try {
      await saveAIProviderConfig({
        features: aiConfig.features,
        timeoutMs: aiConfig.timeoutMs,
      });

      toast('AI feature routing updated.', 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to save AI feature routing.', 'error');
    }

    setIsAiConfigSaving(false);
  };

  const selectedFeature = aiConfig.features.find(f => f.key === selectedFeatureKey);
  const selectedProvider = selectedFeature?.provider ?? '';
  const selectedModel = selectedFeature?.model ?? '';
  const modelPresets = aiConfig.modelPresets?.[selectedProvider] ?? [];
  const uniqueModelPresets = Array.from(new Set(modelPresets));
  const selectedFeatureTimeoutMs = selectedFeature?.timeoutMs ?? aiConfig.timeoutMs;

  const toggleCard = (card: keyof typeof expandedCards) => {
    setExpandedCards(prev => ({
      ...prev,
      [card]: !prev[card],
    }));
  };

  const toggleDeleteInlineConfirm = () => {
    if (isDeleting) return;
    if (showDeleteInlineConfirm) {
      closeDeleteInlineConfirm();
      return;
    }
    openDeleteInlineConfirm();
  };

  if (status === 'loading' || !session) return null;

  return (
    <div className="w-full relative min-h-screen">
      <main className="max-w-[800px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-12">Settings</h1>

        <div className="space-y-12">
          <section>
            <div className={`block bg-black dark:bg-white p-[1px] ${CARD_OUTER_CHAMFER}`}>
              <div className={`bg-white dark:bg-black h-full ${CARD_INNER_CHAMFER} p-8`}>
                <div className="pb-3 border-b border-black dark:border-white mb-6">
                  <button
                    type="button"
                    onClick={() => toggleCard('access')}
                    className="w-full p-2 flex justify-between items-center bg-black text-white dark:bg-white dark:text-black"
                  >
                    <div className="text-sm font-bold tracking-tighter uppercase leading-none flex items-center gap-2">
                      <User className="w-3 h-3" />
                      ACCOUNT DETAILS
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] leading-none font-mono">/01</div>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${expandedCards.access ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {expandedCards.access && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">Role</div>
                            <div className="font-mono text-xs tracking-widest">{accountRoleLabel}</div>
                          </div>

                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">
                              Email Address
                            </div>
                            <div className="font-mono text-xs tracking-widest break-all">
                              {userEmail || 'N/A'}
                            </div>
                          </div>

                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">
                              Member Since
                            </div>
                            <div className="font-mono text-xs tracking-widest">{createdAtDisplay}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          {!isAdmin && (
            <section>
              <div className={`block bg-black dark:bg-white p-[1px] ${CARD_OUTER_CHAMFER}`}>
                <div className={`bg-white dark:bg-black h-full ${CARD_INNER_CHAMFER} p-8`}>
                  <div className="pb-3 border-b border-black dark:border-white mb-6">
                    <button
                      type="button"
                      onClick={() => toggleCard('security')}
                      className="w-full p-2 flex justify-between items-center bg-black text-white dark:bg-white dark:text-black"
                    >
                      <div className="text-sm font-bold tracking-tighter uppercase leading-none flex items-center gap-2">
                        <UserX className="w-3 h-3" />
                        SECURITY
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] leading-none font-mono">/02</div>
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${expandedCards.security ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {expandedCards.security && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2">
                          <div className="flex flex-col md:flex-row items-start gap-4 mb-6 text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="w-6 h-6 shrink-0 mt-1" />
                            <div>
                              <h3 className="font-mono text-lg font-bold mb-2 uppercase tracking-widest">Delete Account</h3>
                              <p className="font-mono text-xs opacity-80 leading-relaxed max-w-xl">
                                Permanently delete your account, wiping your trade plans, history, and preferences from our
                                servers. This action cannot be undone.
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={toggleDeleteInlineConfirm}
                            disabled={isDeleting}
                            className="fc-btn flex items-center justify-center w-full md:w-auto gap-2 px-6 py-4 disabled:opacity-50"
                          >
                            <UserX className="w-4 h-4" />
                            {isDeleting
                              ? 'DELETING...'
                              : showDeleteInlineConfirm
                                ? 'CANCEL DELETION'
                                : 'PROCEED WITH DELETION'}
                          </button>

                          <AnimatePresence>
                            {showDeleteInlineConfirm && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                className="mt-6 pt-6 border-t border-black/20 dark:border-white/20"
                              >
                                <p className="font-mono text-xs uppercase tracking-widest opacity-70 leading-relaxed mb-4">
                                  This action is permanent. Type your account email exactly to continue.
                                </p>
                                <p className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-2">Account Email</p>
                                <p className="font-mono text-xs mb-4 break-all">{userEmail || 'No email available for this session.'}</p>

                                <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">
                                  Type your email to confirm
                                </label>
                                <input
                                  type="text"
                                  value={deleteConfirmEmail}
                                  onChange={e => {
                                    setDeleteConfirmEmail(e.target.value);
                                    if (deleteConfirmError) setDeleteConfirmError('');
                                  }}
                                  disabled={isDeleting}
                                  className="fc-card w-full py-3 px-4 font-mono text-xs tracking-widest focus:outline-none"
                                  placeholder="you@example.com"
                                />

                                {deleteConfirmError && (
                                  <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-rose-600 dark:text-rose-400">
                                    {deleteConfirmError}
                                  </p>
                                )}

                                <div className="mt-6 flex">
                                  <button
                                    type="button"
                                    onClick={handleDisableUser}
                                    disabled={isDeleting || !canConfirmDeletion}
                                    className="fc-btn-danger w-full md:w-auto px-6 py-4 disabled:opacity-40"
                                  >
                                    {isDeleting ? 'DELETING...' : 'CONFIRM DELETE'}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          )}

          {isAdmin && (
            <section>
              <div className={`block bg-black dark:bg-white p-[1px] ${CARD_OUTER_CHAMFER}`}>
                <div className={`bg-white dark:bg-black h-full ${CARD_INNER_CHAMFER} p-8`}>
                  <div className="pb-3 border-b border-black dark:border-white">
                    <button
                      type="button"
                      onClick={() => toggleCard('ai')}
                      className="w-full p-2 flex justify-between items-center bg-black text-white dark:bg-white dark:text-black"
                    >
                      <div className="text-sm font-bold tracking-tighter uppercase leading-none flex items-center gap-2">
                        <Bot className="w-3 h-3" />
                        AI FEATURE ROUTING
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] leading-none font-mono">/02</div>
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedCards.ai ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {expandedCards.ai && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-6 space-y-6">
                          {isAiConfigLoading ? (
                            <p className="font-mono text-xs uppercase tracking-widest opacity-60">Loading AI configuration...</p>
                          ) : (aiConfig.availableProviders ?? []).length === 0 ? (
                            <p className="font-mono text-xs uppercase tracking-widest opacity-60 leading-relaxed">
                              No AI providers are currently available. Add provider keys in backend/.env to enable AI feature routing.
                            </p>
                          ) : (
                            <>
                              <div ref={featureDropdownRef} className="relative">
                                <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Feature</label>
                                <button
                                  onClick={() => setFeatureDropdownOpen(prev => !prev)}
                                  className="fc-card w-full px-4 py-3 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                                >
                                  <span>{aiConfig.features.find(f => f.key === selectedFeatureKey)?.label ?? selectedFeatureKey ?? 'Select feature'}</span>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${featureDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                              </div>

                              <div ref={providerDropdownRef} className="relative">
                                <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Provider</label>
                                <button
                                  onClick={() => setProviderDropdownOpen(prev => !prev)}
                                  className="fc-card w-full px-4 py-3 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                                >
                                  <span>{providerLabel(aiConfig.features.find(f => f.key === selectedFeatureKey)?.provider ?? '') || 'Select provider'}</span>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${providerDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                              </div>

                              <div ref={modelDropdownRef} className="relative">
                                <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Model</label>
                                <button
                                  onClick={() => setModelDropdownOpen(prev => !prev)}
                                  className="fc-card w-full px-4 py-3 font-mono text-xs uppercase tracking-widest focus:outline-none flex justify-between items-center text-black dark:text-white"
                                >
                                  <span>{selectedModel || 'Select model'}</span>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                              </div>

                              <div className="max-w-xs">
                                <label className="block font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">Timeout (ms)</label>
                                <input
                                  type="number"
                                  min={1000}
                                  step={500}
                                  value={selectedFeatureTimeoutMs}
                                  onChange={e => {
                                    const timeoutMs = Number(e.target.value) || 15000;
                                    setAiConfig(cur => ({
                                      ...cur,
                                      timeoutMs,
                                      features: cur.features.map(f =>
                                        f.key === selectedFeatureKey ? { ...f, timeoutMs } : f,
                                      ),
                                    }));
                                  }}
                                  className="fc-card w-full py-3 px-4 font-mono text-xs tracking-widest focus:outline-none"
                                />
                              </div>

                              <button
                                onClick={handleSaveAIConfig}
                                disabled={isAiConfigSaving}
                                className="fc-btn px-6 py-4 disabled:opacity-40"
                              >
                                {isAiConfigSaving ? 'Saving...' : 'Save AI Routing'}
                              </button>

                              {featureDropdownOpen && (
                                <div className="mt-2 border border-black dark:border-white">
                                  {aiConfig.features.map(f => (
                                    <button
                                      key={f.key}
                                      onClick={() => {
                                        setSelectedFeatureKey(f.key);
                                        setFeatureDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-b border-black dark:border-white last:border-b-0 ${
                                        selectedFeatureKey === f.key
                                          ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                                          : 'hover:bg-black/5 dark:hover:bg-white/10'
                                      }`}
                                    >
                                      {f.label || f.key}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {providerDropdownOpen && (
                                <div className="mt-2 border border-black dark:border-white">
                                  {(aiConfig.availableProviders ?? []).map(p => (
                                    <button
                                      key={p}
                                      onClick={() => {
                                        setAiConfig(cur => ({
                                          ...cur,
                                          features: cur.features.map(f =>
                                            f.key === selectedFeatureKey ? { ...f, provider: p } : f,
                                          ),
                                        }));
                                        setProviderDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-b border-black dark:border-white last:border-b-0 ${
                                        aiConfig.features.find(f => f.key === selectedFeatureKey)?.provider === p
                                          ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                                          : 'hover:bg-black/5 dark:hover:bg-white/10'
                                      }`}
                                    >
                                      {providerLabel(p)}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {modelDropdownOpen && uniqueModelPresets.length > 0 && (
                                <div className="mt-2 border border-black dark:border-white">
                                  {uniqueModelPresets.map(model => (
                                    <button
                                      key={model}
                                      onClick={() => {
                                        setAiConfig(cur => ({
                                          ...cur,
                                          features: cur.features.map(f =>
                                            f.key === selectedFeatureKey ? { ...f, model } : f,
                                          ),
                                        }));
                                        setModelDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-b border-black dark:border-white last:border-b-0 ${
                                        selectedModel === model
                                          ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                                          : 'hover:bg-black/5 dark:hover:bg-white/10'
                                      }`}
                                    >
                                      {model}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
