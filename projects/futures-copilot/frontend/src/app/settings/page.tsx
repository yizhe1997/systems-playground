'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard, UserX } from 'lucide-react';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    if (status === 'unauthenticated') {
      router.push('/');
    }
    return () => clearTimeout(t);
  }, [status, router]);

  if (!mounted || status === 'loading' || !session) return null;

  const role = (session.user as unknown as { role: string })?.role || 'ANON';
  const isSubscribed = role === 'SUBSCRIBER' || role === 'ADMIN';

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
                    START SUBSCRIPTION ($49/MO)
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Security Section */}
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

        </div>
      </main>
    </div>
  );
}