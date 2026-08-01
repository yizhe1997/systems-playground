import { lookupIcon } from '@/lib/simple-icons';

export default function SimpleIcon({ slug, className = 'w-4 h-4' }: { slug?: string; className?: string }) {
  const icon = lookupIcon(slug);
  if (!icon) return null;

  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={`${className} fill-current`}>
      <title>{icon.title}</title>
      <path d={icon.path} />
    </svg>
  );
}
