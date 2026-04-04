'use client';
import { useState, useEffect } from 'react';
import RabbitMQDemo from '@/components/demos/RabbitMQDemo';

type Widget = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export default function PlaygroundPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWidgets = () => {
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/admin/widgets')
        .then((res) => res.json())
        .then((data) => {
          setWidgets(data);
          setLoading(false);
        })
        .catch(console.error);
    };
    
    fetchWidgets();
    const interval = setInterval(fetchWidgets, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-24">
      <h1 className="text-4xl font-bold mb-4">Systems Playground</h1>
      <p className="text-xl text-gray-500 mb-12">Live infrastructure experiments and scale-to-zero demos.</p>
      
      {loading ? (
        <div className="animate-pulse text-gray-400">Loading infrastructure...</div>
      ) : (
        <div className="grid gap-12">
          {widgets.map(w => w.status === 'running' && w.type === 'queue' ? (
            <div key={w.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <RabbitMQDemo widgetId={w.id} />
            </div>
          ) : null)}
          {!widgets.some(w => w.status === 'running') && (
            <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-gray-500">Containers are currently scaled to zero. Boot them from the Admin panel.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
