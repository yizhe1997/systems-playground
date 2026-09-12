import { NextResponse } from 'next/server';

type Post = {
  id: string;
  source_type: string;
  content_target: string;
  content: string;
};

// Posts aren't file-based like a static-MDX blog, so there's no literal
// `.mdx` file to link to (the chanhdai.com "View as Markdown" pattern this
// mirrors). This route synthesizes the same thing on demand from Redis-backed
// post data, hitting the same public/filtered endpoint the blog itself uses
// so drafts stay invisible here too.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backendApiUrl = process.env.INTERNAL_BACKEND_URL || 'http://backend:8080';

  try {
    const res = await fetch(`${backendApiUrl}/api/posts`, { cache: 'no-store' });
    if (!res.ok) {
      return new NextResponse('Failed to load posts', { status: 502 });
    }

    const posts: Post[] = await res.json();
    const post = posts.find((p) => p.id === id);
    if (!post) {
      return new NextResponse('Post not found', { status: 404 });
    }

    let raw = '';
    if (post.source_type === 'external_url') {
      const contentRes = await fetch(post.content_target);
      if (!contentRes.ok) {
        return new NextResponse('Failed to fetch external content', { status: 502 });
      }
      raw = await contentRes.text();
    } else {
      raw = post.content;
    }

    return new NextResponse(raw, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('[Raw Post] Failed to reach backend:', error);
    return new NextResponse('Backend unreachable', { status: 502 });
  }
}
