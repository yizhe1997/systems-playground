import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@/styles/tokens.css";
import "@/styles/app.css";
import "@/styles/reviews.css";
import "@/styles/ui.css";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { NoticeProvider } from "@/components/Notice";
import { SignedInBlock } from "@/components/SignedInBlock";
import { cookies } from "next/headers";
import { readSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Tradecraft",
  description: "A trading journal: accounts and closed trades.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // with no session this is the sign-in screen, which has no sidebar (FR-022)
  const session = await readSession(await cookies());
  return (
    <html lang="en">
      <body>
        <div className="zoom-root">
        <NoticeProvider>
          {session ? (
            <div className="shell">
              <aside className="sidebar">
                <div className="brand"><Logo className="logo" /></div>
                <Nav />
                <SignedInBlock email={session.email} />
              </aside>
              <main className="main">{children}</main>
            </div>
          ) : (
            children
          )}
        </NoticeProvider>
        </div>
      </body>
    </html>
  );
}
