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

export const metadata: Metadata = {
  title: "Tradecraft",
  description: "A trading journal: accounts and closed trades.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NoticeProvider>
          <div className="shell">
            <aside className="sidebar">
              <div className="brand"><Logo className="logo" /></div>
              <Nav />
            </aside>
            <main className="main">{children}</main>
          </div>
        </NoticeProvider>
      </body>
    </html>
  );
}
