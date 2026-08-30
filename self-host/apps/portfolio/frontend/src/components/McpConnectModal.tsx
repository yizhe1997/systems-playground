'use client';

import { createContext, useContext, useState } from 'react';
import { Copy, Check, ExternalLink, Terminal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import SimpleIcon from '@/components/SimpleIcon';
import { copyText } from '@/lib/copy-text';

const MCP_URL = 'https://portfolio-api.38569123.xyz/mcp';
const MCP_SERVER_KEY = 'portfolio-chin-yi-zhe';

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

// Verbatim, sourced from each client's own current docs rather than guessed - a wrong command is
// worse than no command. Only clients popular enough that most visitors will recognize one; the
// inline "Model Context Protocol" link in the description covers everything else.
const CODEX_TOML = `[mcp_servers.${MCP_SERVER_KEY}]\nurl = "${MCP_URL}"`;
const CURSOR_JSON = `{\n  "mcpServers": {\n    "${MCP_SERVER_KEY}": {\n      "url": "${MCP_URL}"\n    }\n  }\n}`;
const CLAUDE_CODE_ADD = `claude mcp add --transport http ${MCP_SERVER_KEY} ${MCP_URL}`;
const CLAUDE_CODE_REMOVE = `claude mcp remove ${MCP_SERVER_KEY}`;

type ClientKey = 'claude-code' | 'claude' | 'codex' | 'cursor';

// simple-icons ships a real "claude" and "cursor" mark but no OpenAI/Codex one in the installed
// version - iconSlug left undefined falls back to a generic terminal glyph rather than a wrong or
// missing icon.
const CLIENTS: { key: ClientKey; label: string; iconSlug?: string }[] = [
  { key: 'claude-code', label: 'Claude Code', iconSlug: 'claude' },
  { key: 'claude', label: 'Claude (Desktop / claude.ai)', iconSlug: 'claude' },
  { key: 'codex', label: 'Codex', iconSlug: undefined },
  { key: 'cursor', label: 'Cursor', iconSlug: 'cursor' },
];

function ClientIcon({ slug }: { slug?: string }) {
  if (slug) return <SimpleIcon slug={slug} className="w-4 h-4 shrink-0" />;
  return <Terminal className="w-4 h-4 shrink-0" aria-hidden="true" />;
}

// `open` takes an optional container element - passed by callers rendered inside a device frame
// (e.g. ProjectsCrtFrame) so the dialog confines itself to that frame's own screen instead of
// covering the whole page. Omitted (or null), it behaves exactly as before - centered over the
// full viewport.
const McpConnectModalContext = createContext<{ open: (container?: HTMLElement | null) => void } | null>(null);

export function useMcpConnect() {
  const ctx = useContext(McpConnectModalContext);
  if (!ctx) throw new Error('useMcpConnect must be used within McpConnectProvider');
  return ctx;
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (value: string) => {
    if (await copyText(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return { copied, copy };
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopy();

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">{label}</div>
      <div className="relative">
        <pre className="text-xs font-mono bg-[var(--ds-charcoal)] text-white p-3 pr-11 overflow-x-auto whitespace-pre-wrap break-all" style={{ borderRadius: '0.5rem' }}>
          {value}
        </pre>
        <button
          type="button"
          onClick={() => copy(value)}
          aria-label={`Copy ${label}`}
          className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function DocsLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor-label="Open"
      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--ds-charcoal)]/60 hover:text-black transition-colors"
    >
      {children}
      <ExternalLink className="w-3 h-3" aria-hidden="true" />
    </a>
  );
}

// Everything a visitor would need to hand to their own AI assistant and say "set this up for me" -
// assembled from the same TOOLS/config constants the dialog itself renders, so the two can't drift
// apart from each other.
function buildMarkdown(): string {
  const toolRows = TOOLS.map((t) => `| \`${t.name}\` | ${t.description} |`).join('\n');
  return `# Talk to this portfolio

Instead of clicking through every page, point an AI assistant at this portfolio and just ask it - "what's their experience with Kubernetes?" or "list every project that used Go." Useful if you're a recruiter or engineer running your own AI tooling and want a faster way to check fit than reading, or a developer curious what an MCP server this small actually looks like.

It talks over the [Model Context Protocol](https://modelcontextprotocol.io)'s Streamable HTTP transport. Everything below is public, read-only data - no account or API key needed.

## What it can answer

| Tool | Description |
| --- | --- |
${toolRows}

## Server URL

\`\`\`
${MCP_URL}
\`\`\`

## Claude Code

\`\`\`
${CLAUDE_CODE_ADD}
\`\`\`

Remove it when done: \`${CLAUDE_CODE_REMOVE}\`

## Claude (Desktop / claude.ai)

Go to **Customize → Connectors** (claude.ai/customize/connectors) and add the Server URL above as a custom connector.

## Codex CLI

Add to \`~/.codex/config.toml\`:

\`\`\`toml
${CODEX_TOML}
\`\`\`

## Cursor

Add to \`.cursor/mcp.json\` (project) or \`~/.cursor/mcp.json\` (global):

\`\`\`json
${CURSOR_JSON}
\`\`\`
`;
}

function CopyMarkdownButton() {
  const { copied, copy } = useCopy();

  return (
    <button
      type="button"
      onClick={() => copy(buildMarkdown())}
      aria-label="Copy this dialog as Markdown"
      data-cursor-label={copied ? 'Copied' : 'Copy as Markdown'}
      title="Copy as Markdown"
      className="inline-flex items-center justify-center w-7 h-7 shrink-0 self-center text-[var(--ds-charcoal)]/50 hover:text-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-md"
    >
      {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
    </button>
  );
}

function ClientSetup({ client }: { client: ClientKey }) {
  if (client === 'claude-code') {
    return (
      <div className="space-y-2">
        <CopyLine label="Add" value={CLAUDE_CODE_ADD} />
        <CopyLine label="Done exploring? Remove it" value={CLAUDE_CODE_REMOVE} />
        <DocsLink href="https://code.claude.com/docs/en/mcp-quickstart">Claude Code MCP docs</DocsLink>
      </div>
    );
  }
  if (client === 'claude') {
    return (
      <div className="space-y-2">
        <p className="text-[var(--ds-charcoal)]/80">
          Claude Desktop and claude.ai add remote servers through a settings page, not a config file. Go to{' '}
          <strong>Customize → Connectors</strong>, add a custom connector, and paste the Server URL above.
        </p>
        <DocsLink href="https://claude.ai/customize/connectors">Open Connectors settings</DocsLink>
      </div>
    );
  }
  if (client === 'codex') {
    return (
      <div className="space-y-2">
        <CopyLine label="Add to ~/.codex/config.toml" value={CODEX_TOML} />
        <DocsLink href="https://developers.openai.com/codex/mcp">Codex MCP docs</DocsLink>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <CopyLine label="Add to .cursor/mcp.json" value={CURSOR_JSON} />
      <DocsLink href="https://cursor.com/docs/context/mcp">Cursor MCP docs</DocsLink>
    </div>
  );
}

export function McpConnectProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scopedContainer, setScopedContainer] = useState<HTMLElement | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientKey>('claude-code');
  const client = CLIENTS.find((c) => c.key === selectedClient)!;

  return (
    <McpConnectModalContext.Provider
      value={{
        open: (container) => {
          setScopedContainer(container ?? null);
          setOpen(true);
        },
      }}
    >
      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          container={scopedContainer ?? undefined}
          scoped={!!scopedContainer}
          className="sm:max-w-lg bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            {/* Copy-as-markdown sits right next to the title it belongs to, not pinned to the far
                edge of the dialog - same "action lives beside what it acts on" placement as
                CopySectionLinkButton on the homepage headings. */}
            <DialogTitle className="inline-flex items-center gap-2 text-2xl text-black" style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800 }}>
              Talk to this portfolio
              <CopyMarkdownButton />
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
                It talks over the{' '}
                <a
                  href="https://modelcontextprotocol.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-black transition-colors"
                >
                  Model Context Protocol
                </a>
                &apos;s Streamable HTTP transport. Everything below is public, read-only data - no account or API
                key needed.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2 text-sm">
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

            <CopyLine label="Server URL" value={MCP_URL} />

            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">Add it to your client</div>
              <Select value={selectedClient} onValueChange={(v) => setSelectedClient(v as ClientKey)}>
                {/* Same fix as elsewhere in this DS: the primitive's own height/focus-ring classes
                    default to shadcn's blue theme token and lose the specificity fight against a
                    plain override, so height and focus colors are pinned explicitly. */}
                <SelectTrigger
                  className="w-full border-2 border-black rounded-[0.5rem] bg-white font-bold text-sm px-3 justify-between focus-visible:border-black focus-visible:ring-black/30"
                  style={{ height: 40 }}
                >
                  <span className="flex items-center gap-2">
                    <ClientIcon slug={client.iconSlug} />
                    {client.label}
                  </span>
                </SelectTrigger>
                <SelectContent className="border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] bg-white text-[var(--ds-charcoal)] p-1">
                  {CLIENTS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      <ClientIcon slug={c.iconSlug} />
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ClientSetup client={selectedClient} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </McpConnectModalContext.Provider>
  );
}
