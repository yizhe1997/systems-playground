"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { Shield } from "lucide-react";

const pushBtn =
  "transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-1";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-white text-[var(--ds-charcoal)] flex flex-col justify-center py-12 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div
          className="w-16 h-16 bg-black flex items-center justify-center mb-6 border-2 border-black"
          style={{ borderRadius: '0.75rem' }}
        >
          <Shield className="w-8 h-8 text-[var(--ds-yellow)]" aria-hidden="true" />
        </div>
        <h1
          className="mt-2 text-center text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.02em' }}
        >
          Control Plane Access
        </h1>
        <p className="mt-4 text-center text-sm text-[var(--ds-charcoal)]/70 leading-relaxed px-4">
          This login portal is exposed so that anonymous visitors can experience the read-only view of the custom admin dashboard and container orchestration plane. It is not for public configuration.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_#000] py-8 px-4 sm:px-10" style={{ borderRadius: '0.75rem' }}>
          <button
            onClick={() => signIn("google", { callbackUrl: "/admin" })}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none ${pushBtn} text-sm font-bold bg-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2`}
            style={{ borderRadius: '0.5rem' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google SSO
          </button>

          <div className="mt-8 flex justify-center">
            <Link href="/" className="text-sm font-bold text-[var(--ds-charcoal)]/70 hover:text-black transition-colors">
              &larr; Back to Portfolio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
