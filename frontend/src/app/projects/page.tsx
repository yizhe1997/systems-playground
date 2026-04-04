import Link from 'next/link';

export default function ProjectsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-24">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition mb-8 group">
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </Link>
      
      <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <span className="text-6xl block mb-6 opacity-60">📂</span>
        <h1 className="text-3xl font-bold mb-3 text-slate-800">Featured Projects</h1>
        <p className="text-lg text-slate-500">It's empty at the moment...</p>
        <p className="text-sm text-slate-400 mt-2">Real-world applications are currently in development.</p>
      </div>
    </div>
  );
}
