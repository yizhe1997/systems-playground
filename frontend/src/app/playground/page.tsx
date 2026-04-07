'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/components/ui/Shared';
import { Dialog, DialogContent } from "@/components/ui/dialog"
import RabbitMQDemo from '@/components/demos/RabbitMQDemo';
import RedpandaDemo from '@/components/demos/RedpandaDemo';
import WidgetGrid, { type PlaygroundWidget } from '@/components/playground/WidgetGrid';
import { useWidgetsFeed } from '@/hooks/use-widgets-feed';

type Widget = PlaygroundWidget;

export default function PlaygroundPage() {
  const { widgets, loading, waking, wakeWidget } = useWidgetsFeed();
  const [activeDemo, setActiveDemo] = useState<Widget | null>(null);

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
      
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <WidgetGrid
          widgets={widgets}
          loading={loading}
          waking={waking}
          onWake={wakeWidget}
          onLaunch={setActiveDemo}
          emptySubtitle="No interactive systems are currently available."
        />
      </motion.div>

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
