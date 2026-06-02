'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useToast } from '@/hooks/use-toast';

type AuthRecaptchaAction = 'sign_in' | 'sign_up';

interface SignInOptions {
  callbackUrl: string;
  action?: AuthRecaptchaAction;
}

export function useProtectedGoogleSignIn() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);

  async function signInWithRecaptcha({ callbackUrl, action = 'sign_in' }: SignInOptions) {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!siteKey) {
      await signIn('google', { callbackUrl });
      return;
    }

    if (!executeRecaptcha) {
      toast('Security verification is still loading. Please try again in a moment.', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      const token = await executeRecaptcha(action);

      const preflightRes = await fetch('/api/auth/recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recaptchaToken: token, action }),
      });

      const preflightData: { error?: string } = await preflightRes.json().catch(() => ({}));

      if (!preflightRes.ok) {
        toast(preflightData.error || 'Security verification failed. Please try again.', 'error');
        return;
      }

      await signIn('google', { callbackUrl });
    } catch {
      toast('Could not complete security verification. Please try again.', 'error');
    } finally {
      setIsVerifying(false);
    }
  }

  return {
    signInWithRecaptcha,
    isVerifying,
  };
}
