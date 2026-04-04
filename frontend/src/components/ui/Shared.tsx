import React from 'react';
import { motion, Variants } from 'framer-motion';

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full flex flex-col items-center justify-center p-16 rounded-2xl border-2 border-dashed border-border bg-card/50"
    >
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-lg font-medium text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </motion.div>
  );
}

export function BentoCard({ 
  children, 
  className = '', 
  glowColor = 'primary',
  size = 'default'
}: { 
  children: React.ReactNode; 
  className?: string;
  glowColor?: 'primary' | 'secondary' | 'emerald' | 'rose';
  size?: 'default' | 'large' | 'tall' | 'wide';
}) {
  const sizeClasses = {
    default: '',
    large: 'md:col-span-2 md:row-span-2',
    tall: 'md:row-span-2',
    wide: 'md:col-span-2'
  };

  const glowClasses = {
    primary: 'hover:shadow-[0_0_30px_rgba(var(--glow-primary-rgb,56,189,248),0.15)] dark:hover:shadow-[0_0_40px_rgba(56,189,248,0.25)]',
    secondary: 'hover:shadow-[0_0_30px_rgba(var(--glow-secondary-rgb,52,211,153),0.15)] dark:hover:shadow-[0_0_40px_rgba(52,211,153,0.25)]',
    emerald: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.15)] dark:hover:shadow-[0_0_40px_rgba(52,211,153,0.25)]',
    rose: 'hover:shadow-[0_0_30px_rgba(251,113,133,0.15)] dark:hover:shadow-[0_0_40px_rgba(251,113,133,0.25)]'
  };

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`
        relative group rounded-2xl border border-border bg-card p-6
        transition-all duration-300 ease-out
        hover:border-primary/50
        ${glowClasses[glowColor]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
