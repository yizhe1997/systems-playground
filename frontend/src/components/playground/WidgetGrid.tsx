'use client';

import { Rocket, Power, Loader2, CircleDot, Server, Database, MessageSquare, Gamepad2 } from 'lucide-react';
import { BentoCard, EmptyState, fadeInUp } from '@/components/ui/Shared';

export type PlaygroundWidget = {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
};

type WidgetGridProps = {
  widgets: PlaygroundWidget[];
  loading: boolean;
  waking: string | null;
  onWake: (id: string) => void;
  onLaunch: (widget: PlaygroundWidget) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
};

export default function WidgetGrid({
  widgets,
  loading,
  waking,
  onWake,
  onLaunch,
  emptyTitle = "It&apos;s empty at the moment...",
  emptySubtitle = 'No interactive systems are currently available.',
}: WidgetGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {loading ? (
        <div className="col-span-full flex items-center justify-center gap-3 p-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Checking infrastructure status...
        </div>
      ) : widgets.length === 0 ? (
        <EmptyState icon={Gamepad2} title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        widgets.map((widget) => (
          <BentoCard
            key={widget.id}
            size="default"
            glowColor={widget.status === 'running' ? 'emerald' : 'rose'}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  {widget.type === 'queue' ? (
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  ) : widget.type === 'cache' ? (
                    <Database className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Server className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{widget.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <CircleDot className={`w-3 h-3 ${widget.status === 'running' ? 'text-emerald-500' : 'text-rose-500'}`} />
                    <span className={`text-xs font-medium uppercase tracking-wider ${widget.status === 'running' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {widget.status === 'running' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto">
                {widget.status === 'running' ? (
                  <button
                    onClick={() => onLaunch(widget)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                  >
                    <Rocket className="w-4 h-4" />
                    Launch Demo
                  </button>
                ) : (
                  <button
                    onClick={() => onWake(widget.id)}
                    disabled={waking === widget.id}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      waking === widget.id
                        ? 'bg-primary/50 text-primary-foreground cursor-wait'
                        : 'bg-card border border-border text-foreground hover:bg-accent hover:border-primary/50'
                    }`}
                  >
                    {waking === widget.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Booting via Golang...
                      </>
                    ) : (
                      <>
                        <Power className="w-4 h-4" />
                        Wake Container
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground pt-5 border-t border-border leading-relaxed mb-4 mt-6">
              {(() => {
                const desc = widget.description || '';
                if (desc.includes('Use Cases:') && desc.includes('Solution:')) {
                  const parts = desc.split('Solution:');
                  const useCasesText = parts[0].replace('Use Cases:', '').trim();
                  const solutionText = parts[1].trim();

                  const formatText = (text: string) => {
                    if (text.includes('Event-Driven Architecture (EDA)')) {
                      const [before, after] = text.split('Event-Driven Architecture (EDA)');
                      return <>{before}<strong className="text-foreground">Event-Driven Architecture (EDA)</strong>{after}</>;
                    }
                    if (text.includes('FIFO task delegation')) {
                      const [before, after] = text.split('FIFO task delegation');
                      return <>{before}<strong className="text-foreground">FIFO task delegation</strong>{after}</>;
                    }
                    return text;
                  };

                  return (
                    <div className="space-y-3">
                      <p>
                        <strong className="text-foreground">Use Cases:</strong> {useCasesText}
                      </p>
                      <p>
                        <strong className="text-foreground">Solution:</strong> {formatText(solutionText)}
                      </p>
                    </div>
                  );
                }
                return <p>{desc}</p>;
              })()}
            </div>
          </BentoCard>
        ))
      )}
    </div>
  );
}
