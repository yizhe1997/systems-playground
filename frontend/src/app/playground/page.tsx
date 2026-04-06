'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Power, Loader2, CircleDot, Server, Database, MessageSquare, Gamepad2 } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog"
import RabbitMQDemo from '@/components/demos/RabbitMQDemo';
import RedpandaDemo from '@/components/demos/RedpandaDemo';
import { BentoCard, EmptyState, staggerContainer } from '@/components/ui/Shared';

type Widget = {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
};

export default function PlaygroundPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState<string | null>(null);
  const [activeDemo, setActiveDemo] = useState<Widget | null>(null);

  useEffect(() => {
    const fetchWidgets = () => {
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/admin/widgets')
        .then((res) => res.json())
        .then((data) => {
          setWidgets(data);
          setLoading(false);
          if (waking) {
            const wokenWidget = data.find((w: Widget) => w.id === waking);
            if (wokenWidget && wokenWidget.status === 'running') {
              setWaking(null);
            }
          }
        })
        .catch(console.error);
    };
    
    fetchWidgets();
    const interval = setInterval(fetchWidgets, 5000);
    return () => clearInterval(interval);
  }, [waking]);

  const wakeWidget = async (id: string) => {
    setWaking(id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      await fetch(`${apiUrl}/api/demo/widgets/${id}/wake`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to wake widget:', err);
      setWaking(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-24 min-h-screen bg-background text-foreground">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition mb-8 group">
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </Link>

      <h1 className="text-4xl font-bold mb-4 text-foreground">Systems Playground</h1>
      <p className="text-xl text-muted-foreground mb-12">Live infrastructure experiments and scale-to-zero demos.</p>
      
      {loading ? (
        <div className="animate-pulse flex items-center gap-3 text-muted-foreground p-12">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading infrastructure...
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {widgets.length === 0 ? (
            <EmptyState 
              icon={Gamepad2}
              title="It's empty at the moment..."
              subtitle="No interactive systems are currently available."
            />
          ) : (
            widgets.map((widget, index) => (
              <BentoCard 
                key={widget.id}
                size={index === 0 ? 'wide' : 'default'}
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
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                          {widget.status === 'running' ? 'Online' : 'Hibernating'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {widget.status === 'running' ? (
                    <button 
                      onClick={() => setActiveDemo(widget)}
                      className="px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity w-full sm:w-auto"
                    >
                      Open Demo
                    </button>
                  ) : (
                    <button 
                      onClick={() => wakeWidget(widget.id)}
                      disabled={waking === widget.id}
                      className="px-4 py-2 border border-border bg-background text-foreground text-sm font-semibold rounded-lg hover:bg-accent disabled:opacity-50 transition-all w-full sm:w-auto flex items-center justify-center gap-2"
                    >
                      {waking === widget.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Booting...</>
                      ) : (
                        <><Power className="w-4 h-4" /> Wake Container</>
                      )}
                    </button>
                  )}
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
        </motion.div>
      )}

      {/* Active Demo Modal */}
      <Dialog open={activeDemo !== null} onOpenChange={(open) => !open && setActiveDemo(null)} disablePointerDismissal>
        <DialogContent className="flex flex-col max-w-[95vw] md:max-w-[85vw] lg:max-w-[1400px] max-h-[85vh] p-0 overflow-auto bg-background border border-border resize transition-all duration-300 ease-in-out">
          {activeDemo?.type === 'queue' && <RabbitMQDemo widgetId={activeDemo.id} />}
          {activeDemo?.type === 'event' && <RedpandaDemo widgetId={activeDemo.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
