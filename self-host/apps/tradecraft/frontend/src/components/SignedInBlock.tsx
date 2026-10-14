"use client";

import { Menu } from "@base-ui/react/menu";
import { signOut } from "next-auth/react";
import { ChevronsUpDown, LogOut } from "lucide-react";

/**
 * Screen A5: the account menu at the foot of the sidebar: one line (the first letter of the address, the address,
 * a chevron) that opens a small menu with Sign out. Signing out ends every session of this identity at the API.
 */
export function SignedInBlock({ email }: { email: string }) {
  return (
    <div className="signed-in">
      <Menu.Root>
        <Menu.Trigger className="account-trigger" aria-label={`Signed in as ${email}`}>
          <span className="account-avatar" aria-hidden="true">{email.charAt(0).toUpperCase()}</span>
          <span className="account-email" title={email}>{email}</span>
          <ChevronsUpDown size={16} strokeWidth={1.75} aria-hidden="true" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="top" align="start" sideOffset={6} className="popup-positioner">
            <Menu.Popup className="popup row-menu account-menu" aria-label="Signed in">
              <Menu.Item className="row-menu-item" onClick={() => void signOut({ callbackUrl: "/sign-in" })}>
                <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                Sign out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
