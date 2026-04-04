import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { fadeInUp } from './Shared';

export function SectionHeader({ icon: Icon, title, description, linkHref, linkText }: {
  icon: React.ElementType;
  title: string;
  description: string;
  linkHref?: string;
  linkText?: string;
}) {
  return (
    <motion.div 
      variants={fadeInUp}
      className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-4"
    >
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
      {linkHref && linkText && (
        <Link 
          href={linkHref} 
          className="hidden sm:inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all group"
        >
          {linkText}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </motion.div>
  );
}
