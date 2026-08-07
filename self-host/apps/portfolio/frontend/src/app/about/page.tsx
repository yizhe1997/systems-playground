import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import AboutPageBody, {
  type StackCategory,
  type CompanyExperience,
  type Education,
} from '@/components/AboutPageBody';

const DEFAULT_BIO =
  'Chin Yi Zhe — Backend / Platform Engineer. Builds and operates real self-hosted infrastructure, with AI as a working collaborator rather than a novelty.';

const backendUrl = () => process.env.INTERNAL_BACKEND_URL || 'http://localhost:8085';

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${backendUrl()}${path}`, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) ?? fallback;
  } catch {
    return fallback;
  }
}

export default async function AboutPage() {
  const [stack, experience, education, config] = await Promise.all([
    fetchJson<StackCategory[]>('/api/stack', []),
    fetchJson<CompanyExperience[]>('/api/experience', []),
    fetchJson<Education[]>('/api/education', []),
    fetchJson<{ bio?: string }>('/api/config', {}),
  ]);
  const bio = config.bio || DEFAULT_BIO;

  return (
    <div className="min-h-screen flex flex-col bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 w-full">
        <AboutPageBody bio={bio} stack={stack} experience={experience} education={education} />
      </main>
      <SiteFooter />
    </div>
  );
}
