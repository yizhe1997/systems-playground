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
// The shape Claude Desktop, Cursor, and Windsurf all converged on for a remote Streamable HTTP
// server - VS Code's MCP extension is the one holdout (`servers` + explicit `"type": "http"`
// instead of `mcpServers` + a bare `url`), called out separately in the description below rather
// than silently shipping a config that won't actually work there.
const JSON_CONFIG = `{
  "mcpServers": {
    "${MCP_SERVER_KEY}": {
      "url": "${MCP_URL}"
    }
  }
}`;

// Mirrors the tool set actually registered in backend/mcp.go's buildMCPServer() - keep this in
// sync with that file if a tool is added, renamed, or removed there.
const TOOLS: { name: string; description: string }[] = [
  { name: 'list_projects', description: 'All published projects - title, description, tech stack, dates, links.' },
  { name: 'get_project', description: 'A single project by id.' },
  { name: 'list_posts', description: 'All published blog posts - title, content, cover image, date, rating.' },
  { name: 'list_experience', description: 'Work experience - companies, positions, bullets, tech tags.' },
  { name: 'list_education', description: 'Education history - school, degree, field of study, dates, highlights.' },
  { name: 'list_stack', description: 'The tech stack, grouped by category.' },
  { name: 'search_by_tag', description: "Projects and work-experience positions that used a given tech tag, e.g. 'Redis'." },
];

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
          className="sm:max-w-lg bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-black" style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800 }}>
              Talk to this portfolio
            </DialogTitle>
            <DialogDescription className="text-[var(--ds-charcoal)]/70 mt-2 text-sm space-y-2">
              <span className="block">
                Instead of clicking through every page, point an AI assistant at this portfolio and just ask it -
                &ldquo;what&apos;s their experience with Kubernetes?&rdquo; or &ldquo;list every project that used
                Go.&rdquo; Useful if you&apos;re a recruiter or engineer running your own AI tooling and want a
                faster way to check fit than reading, or a developer curious what an MCP server this small
                actually looks like.
              </span>
              <span className="block">
                It talks over the Model Context Protocol&apos;s Streamable HTTP transport, which any MCP client can
                speak - not just Claude Code. Everything below is public, read-only data, no account or API key
                needed.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2 text-sm">
            <CopyLine label="Server URL" value={MCP_URL} />
            <CopyLine label="Claude Code" value={ADD_COMMAND} />
            <CopyLine label="Claude Desktop / Cursor / Windsurf (config JSON)" value={JSON_CONFIG} />
            <p className="text-xs text-[var(--ds-charcoal)]/60 -mt-2">
              VS Code&apos;s MCP extension wants this under a top-level <code className="bg-black/5 px-1 py-0.5 rounded">&quot;servers&quot;</code> key
              with an explicit <code className="bg-black/5 px-1 py-0.5 rounded">&quot;type&quot;: &quot;http&quot;</code> instead - anything else that
              speaks MCP over HTTP just needs the Server URL above.
            </p>

            <div className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">What it can answer</div>
              <div className="border-2 border-black overflow-hidden" style={{ borderRadius: '0.5rem' }}>
                <table className="w-full text-xs">
                  <tbody>
                    {TOOLS.map((tool, i) => (
                      <tr key={tool.name} className={i > 0 ? 'border-t-2 border-black/10' : ''}>
                        <td className="font-mono font-bold px-2.5 py-2 align-top whitespace-nowrap bg-black/[0.03]">{tool.name}</td>
                        <td className="px-2.5 py-2 text-[var(--ds-charcoal)]/80">{tool.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <CopyLine label="Done exploring? Remove it (Claude Code)" value={REMOVE_COMMAND} />
          </div>
        </DialogContent>
      </Dialog>
    </McpConnectModalContext.Provider>
  );
}
