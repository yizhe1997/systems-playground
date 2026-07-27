type Tab<T extends string> = { value: T; label: string };

export function tabId(idPrefix: string, value: string) {
  return `${idPrefix}-tab-${value}`;
}

export function tabPanelId(idPrefix: string, value: string) {
  return `${idPrefix}-panel-${value}`;
}

export default function AdminTabBar<T extends string>({
  idPrefix,
  tabs,
  active,
  onChange,
}: {
  idPrefix: string;
  tabs: Tab<T>[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap border-2 border-black bg-white" style={{ borderRadius: '0.5rem' }}>
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            id={tabId(idPrefix, tab.value)}
            role="tab"
            aria-selected={isActive}
            aria-controls={tabPanelId(idPrefix, tab.value)}
            onClick={() => onChange(tab.value)}
            className={`flex-1 px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
              isActive ? 'bg-black text-white' : 'text-[var(--ds-charcoal)] hover:bg-black/5'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
