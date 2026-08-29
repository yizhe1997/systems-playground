'use client';
import { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatPublishedDate } from '@/lib/format-date';
import StatusToggle from '@/components/admin/StatusToggle';
import MDXContent from '@/components/mdx/MDXContent';
import { BlogCardPreview } from '@/components/BlogCard';

const RequiredMark = () => <span className="text-red-600" aria-hidden="true"> *</span>;

type Post = {
  id: string;
  title: string;
  source_type: string;
  // content_target is the raw markdown URL - only meaningful when
  // source_type is "external_url".
  content_target: string;
  // content is the markdown body itself - only meaningful when source_type
  // is "native". Stored inline instead of as a separate file in Filebrowser
  // storage: it saves and loads exactly like every other field on the post
  // (one array, one Save button), so there's no "does the file exist yet"
  // question and nothing to orphan when source_type changes.
  content: string;
  cover_image_url: string;
  published_date: string;
  featured: boolean;
  // love_count/view_count accumulate from real reader activity on the post
  // page (POST /api/posts/:id/love and /view) - deliberately not
  // admin-editable fields here. They round-trip through Save Blog
  // untouched, same as id.
  love_count: number;
  view_count: number;
  status: string;
};

const fieldClass =
  'border-2 border-black rounded-[0.375rem] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0px_0px_#000] transition-shadow h-9';

const selectClass =
  'border-2 border-black rounded-[0.375rem] px-2 h-9 text-sm bg-white text-[var(--ds-charcoal)] focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed';

function PostPagePreview({ post }: { post: Post }) {
  const [content, setContent] = useState(post.source_type === 'native' ? post.content : '');
  const [loading, setLoading] = useState(post.source_type === 'external_url');
  const [error, setError] = useState<string | null>(null);

  // Native content is fully derived from props - sync it during render
  // (React's documented "adjust state on prop change" pattern) instead of
  // as the effect's first synchronous act. The external_url branch below is
  // left untouched: it's a genuine async fetch, a legitimate effect.
  const [prevNativeContent, setPrevNativeContent] = useState(post.source_type === 'native' ? post.content : null);
  if (post.source_type === 'native' && post.content !== prevNativeContent) {
    setPrevNativeContent(post.content);
    setContent(post.content);
    setLoading(false);
    setError(null);
  }

  useEffect(() => {
    if (post.source_type === 'native') return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!post.content_target) throw new Error('No source URL set yet.');
        const res = await fetch(post.content_target);
        if (!res.ok) throw new Error('Failed to fetch external markdown');
        const raw = await res.text();
        if (!cancelled) setContent(raw);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [post.source_type, post.content_target, post.content]);

  if (loading) return <p className="text-sm text-[var(--ds-charcoal)]/70">Loading post&hellip;</p>;
  if (error) return (
    <div className="text-[var(--ds-charcoal)] p-4 bg-[var(--ds-yellow)] border-2 border-black" style={{ borderRadius: '0.5rem' }}>
      <p className="font-bold text-sm">Couldn&apos;t load that post</p>
      <p className="text-xs mt-1">{error}</p>
    </div>
  );

  return (
    <article className="max-w-none">
      {post.cover_image_url && (
        <div className="aspect-video w-full overflow-hidden border-2 border-black mb-6" style={{ borderRadius: '0.5rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="mb-6 pb-4 border-b-2 border-black">
        <h1 className="text-2xl mb-2 leading-tight text-black" style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800 }}>
          {post.title || 'Untitled post'}
        </h1>
        {post.published_date && (
          <p className="text-xs font-mono text-[var(--ds-charcoal)]/60 mt-2">Published on {formatPublishedDate(post.published_date)}</p>
        )}
      </div>
      <MDXContent source={content} />
    </article>
  );
}

type ValidationError = { message: string; index: number; field: 'title' | 'target' | 'content' };

export default function BlogManager({ isAdmin, onDirtyChange }: { isAdmin: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [baseline, setBaseline] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();

  // Admins fetch through the authenticated proxy so drafts (excluded from
  // the public /api/posts response) still show up here to keep editing.
  useEffect(() => {
    const url = isAdmin ? '/api/proxy/cms?type=posts' : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085'}/api/posts`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { const d = data || []; setPosts(d); setBaseline(d); })
      .catch(console.error);
  }, [isAdmin]);

  const isDirty = JSON.stringify(posts) !== JSON.stringify(baseline);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  // Drafts skip validation entirely - a draft is explicitly a
  // work-in-progress save, and must never be blocked by incomplete fields.
  const validate = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    posts.forEach((p, i) => {
      if (p.status !== 'published') return;
      if (!p.title.trim()) errors.push({ message: `Post #${i + 1} needs a title.`, index: i, field: 'title' });
      if (p.source_type === 'external_url') {
        if (!p.content_target.trim()) errors.push({ message: `Post #${i + 1} needs a raw URL.`, index: i, field: 'target' });
      } else if (!p.content.trim()) {
        errors.push({ message: `Post #${i + 1} needs content.`, index: i, field: 'content' });
      }
    });
    return errors;
  };

  const save = async () => {
    if (!isAdmin) return;
    const errors = validate();
    if (errors.length > 0) {
      toast({
        title: errors.length === 1 ? 'Missing required field' : `${errors.length} required fields missing`,
        description: errors.map((e) => e.message).join(' '),
        variant: 'destructive',
      });
      const first = errors[0];
      if (first.field === 'content') {
        setEditingIndex(first.index);
      } else {
        const el = fieldRefs.current[`${first.field}-${first.index}`];
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
      }
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'posts', payload: posts }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Saved Blog to Redis!' });
        setBaseline(posts);
      } else {
        const body = await res.json().catch(() => null);
        toast({ title: 'Error', description: body?.error || 'Failed to save Blog.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const addPost = () => {
    setPosts([
      {
        id: Math.random().toString(36).substring(2, 8),
        title: '', source_type: 'native', content_target: '', content: '',
        cover_image_url: '', published_date: '', featured: false, love_count: 0, view_count: 0, status: 'draft',
      },
      ...posts,
    ]);
  };

  const removePost = (i: number) => setPosts(posts.filter((_, idx) => idx !== i));

  const update = (i: number, patch: Partial<Post>) => {
    const n = [...posts];
    n[i] = { ...n[i], ...patch };
    setPosts(n);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= posts.length) return;
    const n = [...posts];
    [n[i], n[j]] = [n[j], n[i]];
    setPosts(n);
  };

  // published_date is stamped automatically the first time a post goes
  // live, not hand-typed - now that Status exists, "published" already
  // means "this is live," so a separate manually-set date was redundant
  // and could drift from reality (e.g. left blank, or backdated by
  // accident). Only set if it isn't already there, so re-publishing after
  // an unpublish doesn't overwrite the original date with today.
  const updateStatus = (i: number, status: string) => {
    const patch: Partial<Post> = { status };
    if (status === 'published' && !posts[i].published_date) {
      // Local calendar date, not toISOString()'s UTC date - the admin's
      // "today" near midnight can otherwise land on the wrong day.
      const d = new Date();
      patch.published_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    update(i, patch);
  };

  return (
    <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '0.75rem' }}>
      <div className="p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b-2 border-black">
        <div>
          <h2 className="text-xl font-extrabold mb-1">Blog</h2>
          <p className="text-sm text-[var(--ds-charcoal)]/70">
            External posts point to a raw markdown URL (e.g. a GitHub repo); native posts are written directly here.
          </p>
        </div>
        <Button
          onClick={addPost}
          disabled={!isAdmin}
          variant="outline"
          className="border-2 border-black rounded-[0.5rem] font-bold hover:bg-black hover:text-white whitespace-nowrap"
        >
          + Add Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="p-12 text-sm text-[var(--ds-charcoal)]/60 text-center">
          No posts yet. Click &quot;Add Post&quot; to begin.
        </div>
      ) : (
        <div className="divide-y-2 divide-black">
          {posts.map((p, i) => (
            <div key={p.id} className="p-6 space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`post-title-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    Post title<RequiredMark />
                  </Label>
                  <Input
                    id={`post-title-${i}`}
                    ref={(el) => { fieldRefs.current[`title-${i}`] = el; }}
                    value={p.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    className={`font-bold ${fieldClass}`}
                    placeholder="Joining Claude for Open Source Program"
                    disabled={!isAdmin}
                  />
                </div>
                <StatusToggle value={p.status} onChange={(v) => updateStatus(i, v)} disabled={!isAdmin} />
                <div className="flex gap-1 shrink-0">
                  <Button
                    onClick={() => move(i, -1)}
                    disabled={!isAdmin || i === 0}
                    variant="ghost"
                    size="icon"
                    aria-label="Move up"
                    className="border-2 border-transparent hover:border-black rounded-[0.5rem]"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => move(i, 1)}
                    disabled={!isAdmin || i === posts.length - 1}
                    variant="ghost"
                    size="icon"
                    aria-label="Move down"
                    className="border-2 border-transparent hover:border-black rounded-[0.5rem]"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setPreviewIndex(i)}
                    variant="ghost"
                    size="icon"
                    aria-label="Preview"
                    className="border-2 border-transparent hover:border-black rounded-[0.5rem]"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => removePost(i)}
                    disabled={!isAdmin}
                    variant="destructive"
                    size="icon"
                    aria-label="Remove post"
                    className="border-2 border-black rounded-[0.5rem]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`post-cover-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                  Cover image URL (optional)
                </Label>
                <Input
                  id={`post-cover-${i}`}
                  value={p.cover_image_url}
                  onChange={(e) => update(i, { cover_image_url: e.target.value })}
                  className={`text-xs ${fieldClass}`}
                  placeholder="https://..."
                  disabled={!isAdmin}
                />
              </div>

              {p.published_date && (
                <p className="text-xs font-mono text-[var(--ds-charcoal)]/60">
                  Published on {formatPublishedDate(p.published_date)} — stamped automatically the first time this went live, not editable.
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="sm:w-1/4 space-y-1.5">
                  <Label htmlFor={`post-source-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                    Source type
                  </Label>
                  <select
                    id={`post-source-${i}`}
                    value={p.source_type}
                    onChange={(e) => update(i, { source_type: e.target.value })}
                    className={`w-full ${selectClass}`}
                    disabled={!isAdmin}
                  >
                    <option value="external_url">External</option>
                    <option value="native">Native</option>
                  </select>
                </div>
                {p.source_type === 'external_url' ? (
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`post-target-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                      Raw URL<RequiredMark />
                    </Label>
                    <Input
                      id={`post-target-${i}`}
                      ref={(el) => { fieldRefs.current[`target-${i}`] = el; }}
                      value={p.content_target}
                      onChange={(e) => update(i, { content_target: e.target.value })}
                      className={`text-xs ${fieldClass}`}
                      placeholder="https://raw.githubusercontent.com/..."
                      disabled={!isAdmin}
                    />
                    <p className="text-[10px] text-[var(--ds-charcoal)]/50">
                      Must be a URL that returns the raw markdown text directly, not a web page. A GitHub file&apos;s normal (&quot;blob&quot;) URL won&apos;t work — use the <code className="bg-black/5 px-1 rounded">raw.githubusercontent.com</code> or Gist &quot;raw&quot; link instead. Use the <span className="font-bold">Preview</span> button&apos;s &quot;Full post page&quot; tab to confirm it actually loads before publishing.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">
                      Content<RequiredMark />
                    </Label>
                    <div className="flex gap-2 items-center h-9">
                      <span className="flex-1 text-xs text-[var(--ds-charcoal)]/60 truncate">
                        {p.content.trim() ? `${p.content.trim().length} characters written` : 'No content yet'}
                      </span>
                      <Button
                        onClick={() => setEditingIndex(i)}
                        disabled={!isAdmin}
                        variant="outline"
                        className="border-2 border-black rounded-[0.375rem] bg-[var(--ds-sage)] hover:bg-black hover:text-white text-xs font-bold whitespace-nowrap h-9"
                      >
                        {p.content.trim() ? 'Edit Content' : 'Write Content'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer select-none w-fit">
                  <input
                    type="checkbox"
                    checked={p.featured}
                    onChange={(e) => update(i, { featured: e.target.checked })}
                    disabled={!isAdmin}
                    className="accent-black w-4 h-4"
                  />
                  Featured on homepage
                </label>
                <p className="text-[10px] text-[var(--ds-charcoal)]/50 mt-1">
                  Every post appears on <code className="bg-black/5 px-1 rounded">/blog</code> regardless. Featured additionally shows it on the homepage (max 4).
                </p>
              </div>

              <p className="text-xs font-mono text-[var(--ds-charcoal)]/60">
                {p.love_count > 0 || p.view_count > 0
                  ? `${p.love_count} love${p.love_count === 1 ? '' : 's'}, ${p.view_count} view${p.view_count === 1 ? '' : 's'} — accumulated from the post page, not editable here.`
                  : 'No loves or views yet.'}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="p-6 border-t-2 border-black">
        <Button
          onClick={save}
          disabled={!isAdmin || loading || !isDirty}
          className="px-5 h-10 text-sm font-bold border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-all bg-black text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? 'Saving...' : 'Save Blog'}
        </Button>
      </div>

      <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <DialogContent
          className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-black font-extrabold">Post preview</DialogTitle>
            <DialogDescription className="text-[var(--ds-charcoal)]/70">
              Unsaved changes — see how this renders on the homepage card vs. the full <code className="bg-black/5 px-1 rounded text-[var(--ds-charcoal)]">/blog</code> page.
              {previewIndex !== null && posts[previewIndex]?.status !== 'published' && (
                <span className="block mt-2 font-bold text-black">This post is a Draft and won&apos;t appear on the live site until Published.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {previewIndex !== null && posts[previewIndex] && (
            <Tabs defaultValue="card">
              <TabsList>
                <TabsTrigger value="card">Homepage card</TabsTrigger>
                <TabsTrigger value="page">Full post page</TabsTrigger>
              </TabsList>
              <TabsContent value="card" className="pt-4">
                <BlogCardPreview post={posts[previewIndex]} />
              </TabsContent>
              <TabsContent value="page" className="pt-4">
                <PostPagePreview post={posts[previewIndex]} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Content editor overlay - edits land directly in the post's own
          `content` field (same as every other input on this row), so
          "Save Blog" is the only save action; this is just a bigger
          writing surface. */}
      {editingIndex !== null && posts[editingIndex] && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-8">
          <div className="bg-white border-2 border-black shadow-[12px_12px_0px_0px_#000] w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden" style={{ borderRadius: '0.75rem' }}>
            <div className="px-6 py-4 border-b-2 border-black flex flex-col sm:flex-row sm:items-center justify-between bg-white gap-4">
              <div>
                <h3 className="font-extrabold text-lg">{posts[editingIndex].title || 'Untitled post'}</h3>
                <span className="text-xs text-[var(--ds-charcoal)]/70">Edits are part of this tab&apos;s changes — click &quot;Save Blog&quot; to persist.</span>
              </div>
              <Button
                onClick={() => setEditingIndex(null)}
                className="border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] hover:shadow-none bg-black text-white"
              >
                Done
              </Button>
            </div>
            <div className="flex-1" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
              <textarea
                value={posts[editingIndex].content}
                onChange={(e) => update(editingIndex, { content: e.target.value })}
                className="w-full h-full p-8 font-mono text-[13px] leading-relaxed resize-none outline-none bg-transparent text-white"
                spellCheck={false}
                placeholder={'# Write your markdown here...\n\nSupports GitHub-flavored markdown, syntax-highlighted code blocks, and\n<YouTubeEmbed videoId="..." title="..." /> for video embeds.'}
                disabled={!isAdmin}
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
