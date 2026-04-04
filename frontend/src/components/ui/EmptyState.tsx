import React from 'react';

export function EmptyState({ 
  icon: Icon, 
  title, 
  subtitle 
}: { 
  icon: React.ElementType; 
  title: string; 
  subtitle: string;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center p-16 rounded-2xl border-2 border-dashed border-border bg-card/50">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-lg font-medium text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
