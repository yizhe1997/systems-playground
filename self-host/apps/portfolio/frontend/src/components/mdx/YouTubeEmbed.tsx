// Available inside blog post content as <YouTubeEmbed videoId="..." title="..." />.
// This is the whole point of the MDX swap: unlike plain markdown, content can
// invoke real components we explicitly provide - not arbitrary HTML/JS.
export default function YouTubeEmbed({ videoId, title }: { videoId: string; title?: string }) {
  if (!videoId) return null;
  return (
    <div
      className="not-prose aspect-video w-full my-6 border-2 border-black overflow-hidden"
      style={{ borderRadius: '0.5rem' }}
    >
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title || 'YouTube video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}
