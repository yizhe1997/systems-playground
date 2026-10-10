"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

/** Screen A5: who is signed in, and Sign out. Signing out ends every session of this identity at the API. */
export function SignedInBlock({ email }: { email: string }) {
  return (
    <div className="signed-in">
      <span className="signed-in-label">Signed in as</span>
      <span className="signed-in-email" title={email}>{email}</span>
      <button type="button" className="btn-quiet signed-in-out" onClick={() => void signOut({ callbackUrl: "/sign-in" })}>
        <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
        Sign out
      </button>
    </div>
  );
}
