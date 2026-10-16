"use client";

import { signIn } from "next-auth/react";
import { Logo } from "@/components/Logo";

/** Screen A1: one button, and one plain refusal that never says why. No sidebar. */
export function SignInCard({ next, refused, ended, configured }: { next: string; refused: boolean; ended: boolean; configured: boolean }) {
  const go = () => {
    if (!configured) {
      // Google is not set up (no client id or secret): the same refusal as any other failure; the reason is in the log
      window.location.assign(`/sign-in?reason=refused&next=${encodeURIComponent(next)}`);
      return;
    }
    void signIn("google", { callbackUrl: next });
  };
  return (
    <div className="signin">
      <div className="signin-card card">
        <div className="signin-brand">
          <Logo className="logo" />
        </div>
        <h1 className="title">Sign in</h1>
        <p className="subtitle">Tradecraft is private to its owner.</p>
        {refused && (
          <div className="banner" role="alert">
            <span className="banner-title">! You can&apos;t sign in with that account.</span>
          </div>
        )}
        {ended && !refused && (
          <div className="banner" role="status">
            <span className="banner-title">Your session ended. Sign in again.</span>
          </div>
        )}
        <button type="button" className="btn signin-action" onClick={go}>
          Continue with Google
        </button>
        <p className="helper">You will be asked to choose a Google account.</p>
        <p className="helper">Only email addresses the owner has allowed can sign in.</p>
      </div>
    </div>
  );
}
