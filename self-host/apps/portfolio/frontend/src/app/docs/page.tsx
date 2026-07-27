export default function DocsIndex() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <h1 className="text-2xl font-extrabold mb-3 text-black" style={{ fontFamily: 'var(--ds-font-display)' }}>
        Engineering documentation
      </h1>
      <p className="text-sm text-[var(--ds-charcoal)]/70 max-w-md">
        Select a write-up from the folder tree on the left to begin reading.
      </p>
    </div>
  );
}
