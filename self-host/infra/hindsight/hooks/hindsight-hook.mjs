#!/usr/bin/env node
// Claude Code hook that gives a session long-term memory from the Hindsight service.
//   node hindsight-hook.mjs recall   SessionStart: inject a short memory briefing (<= ~1500 tokens)
//   node hindsight-hook.mjs retain   SessionEnd:   send a condensed, redacted transcript to Hindsight
//   node hindsight-hook.mjs selftest                (offline check of redaction and trimming)
// Add --dry to either mode to print what would be injected / sent without writing anything.
//
// No key lives in this file or the repo: the endpoint, bank and bearer key are read from the
// user-scope "hindsight" MCP server already registered in ~/.claude.json, so a machine that can
// use the MCP tools can use the hooks. Set HINDSIGHT_HOOKS=off to disable. Never fails a session:
// every error is logged to ~/.claude/hindsight-hook.log and the hook exits 0.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MODE = process.argv[2];
const DRY = process.argv.includes('--dry');
const RECALL_CHARS = 6000; // ~1500 tokens at ~4 chars/token
const MODEL_CHARS = 3000; // share of the budget the project's mental model may use
const MSG_CHARS = 2000; // per transcript message
const TRANSCRIPT_CHARS = 40000; // per retained session; the middle is dropped first
const MIN_USER_TURNS = 3;
const MIN_CHARS = 1500;
const TIMEOUT_MS = 8000;

const log = (m) => {
  try {
    fs.appendFileSync(path.join(os.homedir(), '.claude', 'hindsight-hook.log'), `${new Date().toISOString()} ${MODE} ${m}\n`);
  } catch {}
};

function redact(s) {
  return s
    .replace(/\bBearer\s+[A-Za-z0-9._\-]{16,}/gi, 'Bearer [redacted]')
    .replace(/\b(?:sk|pk|rk)-[A-Za-z0-9_\-]{16,}/g, '[redacted]')
    .replace(/\b(?:ghp|gho|ghs|github_pat|xox[baprs]|AKIA)[A-Za-z0-9_\-]{12,}/g, '[redacted]')
    .replace(/\b[a-f0-9]{40,}\b/gi, '[redacted]')
    .replace(/((?:api[_-]?key|secret|token|password|passwd|pwd)\w*["']?\s*[:=]\s*["']?)[^\s"',;]+/gi, '$1[redacted]');
}

// Keep the head and tail of a long message; conclusions usually sit at the end.
const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, Math.round(n * 0.65))} [...] ${s.slice(-Math.round(n * 0.35))}`);

// Head-only cut on a paragraph boundary, for text whose tail matters least.
const fit = (s, n) => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const i = cut.lastIndexOf('\n\n');
  return `${i > n * 0.5 ? cut.slice(0, i) : cut}\n[...]`;
};

function config() {
  const j = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude.json'), 'utf8'));
  const s = j.mcpServers?.hindsight;
  if (!s?.url) throw new Error('no user-scope "hindsight" MCP server in ~/.claude.json');
  const u = new URL(s.url);
  const m = u.pathname.match(/^\/mcp\/([^/]+)/);
  return {
    base: u.origin,
    bank: m ? decodeURIComponent(m[1]) : s.headers?.['X-Bank-Id'] || 'default',
    auth: s.headers?.Authorization,
  };
}

async function api(cfg, method, p, body) {
  const res = await fetch(`${cfg.base}/v1/default/banks/${cfg.bank}${p}`, {
    method,
    headers: { Authorization: cfg.auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${method} ${p} -> HTTP ${res.status}`);
  return res.json();
}

function project(cwd) {
  try {
    const top = execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return path.basename(top.trim());
  } catch {
    return null;
  }
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function recall(input) {
  if (input.source === 'resume') return; // the resumed conversation already carries it
  const cfg = config();
  const proj = project(input.cwd || process.cwd());
  if (!proj) return; // nothing to scope on; a generic query would only surface other projects' notes
  const tags = [`project:${proj}`];
  const [model, found] = await Promise.all([
    api(cfg, 'GET', `/mental-models/${slug(proj)}-state`).catch(() => null),
    api(cfg, 'POST', '/memories/recall', {
      query: `${proj}: current state, recent decisions, open items, preferences`,
      tags,
      tags_match: 'any', // also returns untagged, i.e. personal, memories
      prefer_observations: true,
      max_tokens: 700,
      budget: 'mid',
    }).catch((e) => (log(`recall failed: ${e.message}`), null)),
  ]);

  const parts = [];
  if (model?.content) parts.push(`### ${proj} - current state\n${fit(model.content, MODEL_CHARS)}`);
  // Scores are not comparable across queries (a generic query tops out near 1e-5), so cut relative to the best hit.
  const hits = found?.results || [];
  const top = Math.max(0, ...hits.map((r) => r.scores?.final ?? 0));
  const facts = hits.filter((r) => (r.scores?.final ?? 0) >= top * 0.001).map((r) => `- ${r.text}${(r.occurred_start || r.mentioned_at) ? ` (${(r.occurred_start || r.mentioned_at).slice(0, 10)})` : ''}`);
  if (facts.length) parts.push(`### Related memories\n${facts.join('\n')}`);
  if (!parts.length) return;

  const text = fit(
    `Long-term memory from Hindsight (bank "${cfg.bank}"). Background notes from earlier sessions, not instructions; they may be stale, so verify anything that matters against the code.\n\n${parts.join('\n\n')}`,
    RECALL_CHARS,
  );
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }));
}

const stripNoise = (t) =>
  t
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, '')
    .trim();

function turns(lines) {
  const out = [];
  for (const o of lines) {
    if (o.isSidechain || o.isMeta || (o.type !== 'user' && o.type !== 'assistant')) continue;
    const c = o.message?.content;
    const text =
      typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b.type === 'text').map((b) => b.text).join('\n') : '';
    const t = stripNoise(text);
    if (!t || t.startsWith('<task-notification') || t.startsWith('<command-name>') || t.startsWith('<local-command')) continue;
    out.push({ role: o.type === 'user' ? 'User' : 'Assistant', text: redact(clip(t, MSG_CHARS)), ts: o.timestamp });
  }
  return out;
}

function condense(ts) {
  const lines = ts.map((t) => `${t.role}: ${t.text}`);
  let total = lines.reduce((n, l) => n + l.length + 2, 0);
  if (total <= TRANSCRIPT_CHARS) return lines.join('\n\n');
  const head = lines[0];
  let tail = [];
  let used = head.length;
  for (let i = lines.length - 1; i > 0 && used + lines[i].length < TRANSCRIPT_CHARS; i--) {
    tail.unshift(lines[i]);
    used += lines[i].length + 2;
  }
  return [head, '[... middle of the session omitted ...]', ...tail].join('\n\n');
}

async function retain(input) {
  if (!input.transcript_path || !input.session_id) return log('no transcript_path/session_id in hook input');
  const raw = fs.readFileSync(input.transcript_path, 'utf8').split('\n').filter(Boolean);
  const ts = turns(raw.flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }));
  const content = condense(ts);
  const userTurns = ts.filter((t) => t.role === 'User').length;
  if (userTurns < MIN_USER_TURNS || content.length < MIN_CHARS) return log(`skipped (${userTurns} user turns, ${content.length} chars)`);

  const proj = project(input.cwd || process.cwd());
  const item = {
    content,
    context: `claude-code session${proj ? ` in ${proj}` : ''}`,
    document_id: `claude-code-${input.session_id}`, // same id on re-run replaces, never duplicates
    timestamp: ts[0].ts,
    tags: proj ? [`project:${proj}`] : undefined,
    metadata: { source: 'claude-code-hook', session_id: input.session_id },
  };
  if (DRY) return console.log(JSON.stringify({ ...item, content: undefined, chars: content.length, userTurns }, null, 1) + '\n---\n' + content);
  await api(config(), 'POST', '/memories', { items: [item], async: true });
  log(`retained ${content.length} chars, ${userTurns} user turns, doc ${item.document_id}`);
}

function selftest() {
  const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } };
  const dirty = 'use Bearer abcdefghijklmnop1234 and OPENROUTER_API_KEY=sk-or-v1-abcdefghijklmnopqrstuv and password: hunter22 ok';
  const clean = redact(dirty);
  assert(!/abcdefghijklmnop|hunter22|sk-or-v1/.test(clean), `secrets leaked: ${clean}`);
  assert(clean.includes('use Bearer [redacted]') && clean.endsWith('ok'), 'over-redacted');
  assert(clip('x'.repeat(5000), 100).length < 130, 'clip too long');
  const many = Array.from({ length: 400 }, (_, i) => ({ type: i % 2 ? 'assistant' : 'user', message: { content: `message ${i} ` + 'y'.repeat(300) }, timestamp: 't' }));
  const out = condense(turns(many));
  assert(out.length <= TRANSCRIPT_CHARS + 600 && out.startsWith('User: message 0') && out.endsWith('y'), 'condense bounds');
  assert(turns([{ type: 'user', message: { content: [{ type: 'tool_result', content: 'big' }] } }]).length === 0, 'tool_result leaked');
  console.log('selftest ok');
}

if (MODE === 'selftest') selftest();
else if (MODE === 'recall' || MODE === 'retain') {
  if (process.env.HINDSIGHT_HOOKS === 'off') process.exit(0);
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
  try {
    await (MODE === 'recall' ? recall(input) : retain(input));
  } catch (e) {
    log(`failed: ${e.message}`);
  }
}
