'use client';

import { createContext, useContext, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { copyText } from '@/lib/copy-text';

const MCP_URL = 'https://portfolio-api.38569123.xyz/mcp';
// A unique server key, not a generic "portfolio" - a visitor pasting this
// might already have their own entry named "portfolio" from somewhere else,
// and a generic key would silently clobber it.
const MCP_SERVER_KEY = 'portfolio-chin-yi-zhe';
const ADD_COMMAND = `claude mcp add --transport http ${MCP_SERVER_KEY} ${MCP_URL}`;
const REMOVE_COMMAND = `claude mcp remove ${MCP_SERVER_KEY}`;

const McpConnectModalContext = createContext<{ open: () => void } | null>(null);

export function useMcpConnect() {
  const ctx = useContext(McpConnectModalContext);
  if (!ctx) throw new Error('useMcpConnect must be used within McpConnectProvider');
  return ctx;
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (await copyText(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">{label}</div>
      <div className="relative">
        <pre className="text-xs font-mono bg-[var(--ds-charcoal)] text-white p-3 pr-11 overflow-x-auto whitespace-pre-wrap break-all" style={{ borderRadius: '0.5rem' }}>
          {value}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export function McpConnectProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <McpConnectModalContext.Provider value={{ open: () => setOpen(true) }}>
      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-black" style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800 }}>
              Talk to this portfolio
            </DialogTitle>
            <DialogDescription className="text-[var(--ds-charcoal)]/70 mt-2 text-sm">
              Point your own Claude (or any MCP client) at this portfolio&apos;s data — projects, blog posts,
              experience, stack, and education — read-only, no account needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2 text-sm">
            <CopyLine label="Server URL" value={MCP_URL} />
            <CopyLine label="Claude Code" value={ADD_COMMAND} />
            <CopyLine label="Done exploring? Remove it" value={REMOVE_COMMAND} />
          </div>
        </DialogContent>
      </Dialog>
    </McpConnectModalContext.Provider>
  );
}
