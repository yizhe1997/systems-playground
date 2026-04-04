import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { fadeInUp } from './Shared';

export function SectionHeader({ icon: Icon, title, description, linkHref, linkText }: {
  icon: React.ElementType;
  title: string;
  description: string;
  linkHref: string;
  linkText: string;
}) {
  return (
    <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-12">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium text-sm mb-4">
          <Icon className="w-4 h-4" />
          {title}
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">{title}</h2>
        <p className="text-lg text-muted-foreground">{description}</p>
      </div>
      <Link href={linkHref} className="hidden sm:inline-flex items-center gap-2 text-primary font-medium hover:opacity-80 transition-opacity">
        {linkText}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}
