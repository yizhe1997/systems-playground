'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Cursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', updateMousePosition);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Outer Square */}
      <motion.div
        className="fixed top-0 left-0 w-6 h-6 border border-black dark:border-white pointer-events-none z-[9999]"
        animate={{
          x: mousePosition.x - 12,
          y: mousePosition.y - 12,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.2 }}
      />
      {/* Inner Crosshair (+) */}
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 pointer-events-none z-[9999] flex items-center justify-center"
        animate={{
          x: mousePosition.x - 6,
          y: mousePosition.y - 6,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.1 }}
      >
        <div className="absolute w-full h-[1px] bg-black dark:bg-white" />
        <div className="absolute h-full w-[1px] bg-black dark:bg-white" />
      </motion.div>
    </>
  );
}