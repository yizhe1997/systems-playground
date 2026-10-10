"use client";

import { signIn } from "next-auth/react";
import { Dialog } from "@/components/Dialog";

/**
 * Screen A3. Changing who can sign in needs a Google confirmation within the last 10 minutes. Continue goes through
 * Google's account chooser again and back to Settings; it must be the same Google account as the one signed in.
 * Nothing has been changed when this is shown.
 */
export function ConfirmItsYouDialog({ open, failed, onCancel }: { open: boolean; failed: boolean; onCancel: () => void }) {
  return (
    <Dialog open={open} onClose={onCancel} title="Confirm it's you">
      <p>You signed in more than 10 minutes ago. Confirm with Google before you change who can sign in.</p>
      <p className="helper">Nothing has been changed yet.</p>
      {failed && (
        <p className="field-error" role="alert">
          ! That account is not the one signed in. Nothing was changed.
        </p>
      )}
      <div className="form-actions" style={{ marginTop: 0 }}>
        <button type="button" className="btn" autoFocus onClick={() => void signIn("google-confirm", { callbackUrl: "/settings" })}>
          Continue with Google
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
