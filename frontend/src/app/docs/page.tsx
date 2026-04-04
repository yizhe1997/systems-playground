export default function DocsIndex() {
  return (
    <div className="text-center py-20 flex flex-col items-center justify-center h-full">
      <span className="text-6xl mb-6 opacity-80">📖</span>
      <h1 className="text-3xl font-bold text-slate-800 mb-4">Engineering Documentation</h1>
      <p className="text-slate-500 max-w-md mx-auto text-lg">
        Select an Architecture Decision Record (ADR) or engineering blog post from the virtual folder tree on the left to begin reading.
      </p>
    </div>
  );
}
