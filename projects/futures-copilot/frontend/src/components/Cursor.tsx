'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Cursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState<string | null>(null);
  const [isRightHalf, setIsRightHalf] = useState(false);
  const [isBottomHalf, setIsBottomHalf] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setIsRightHalf(e.clientX > window.innerWidth / 2);
      setIsBottomHalf(e.clientY > window.innerHeight / 2);
      
      const target = e.target as HTMLElement;
      // Skip if mouse leaves document entirely
      if (!target || !target.closest) return;

      const tooltipElement = target.closest('[data-cursor-text]') as HTMLElement;
      if (tooltipElement) {
        setTooltipText(tooltipElement.getAttribute('data-cursor-text') || null);
      } else {
        setTooltipText(null);
      }
    };
    
    window.addEventListener('mousemove', updateMousePosition);
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  // The cursor box is 24x24 (w-6 h-6), centered at mousePosition
  const cursorLeft = mousePosition.x - 12;
  const cursorTop = mousePosition.y - 12;
  const cursorRight = mousePosition.x + 12;
  const cursorBottom = mousePosition.y + 12;

  // Stick tooltip corner-to-corner dynamically based on the quadrant
  let tooltipX = cursorRight;
  let tooltipY = cursorBottom; // Default: Top-Left quadrant (Top-Left of tooltip snaps to Bottom-Right of cursor)
  
  if (isRightHalf && !isBottomHalf) {
    // Top-Right quadrant -> Top-Right of tooltip snaps to Bottom-Left of cursor
    tooltipX = cursorLeft;
    tooltipY = cursorBottom;
  } else if (!isRightHalf && isBottomHalf) {
    // Bottom-Left quadrant -> Bottom-Left of tooltip snaps to Top-Right of cursor
    tooltipX = cursorRight;
    tooltipY = cursorTop;
  } else if (isRightHalf && isBottomHalf) {
    // Bottom-Right quadrant -> Bottom-Right of tooltip snaps to Top-Left of cursor
    tooltipX = cursorLeft;
    tooltipY = cursorTop;
  }

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-6 h-6 border border-black dark:border-white pointer-events-none z-[9999] flex items-center justify-center"
        animate={{
          x: mousePosition.x - 12,
          y: mousePosition.y - 12,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.2 }}
      >
        {/* Inner Crosshair (+) locked in center */}
        <div className="relative w-3 h-3 flex items-center justify-center">
          <div className="absolute w-full h-[1px] bg-black dark:bg-white" />
          <div className="absolute h-full w-[1px] bg-black dark:bg-white" />
        </div>
      </motion.div>
      
      {/* Attached Tooltip Box */}
      <motion.div 
        className="fixed top-0 left-0 bg-white dark:bg-black text-black dark:text-white border border-black dark:border-white p-3 font-mono text-[10px] uppercase tracking-widest max-w-[200px] whitespace-normal pointer-events-none shadow-xl z-[9999]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: tooltipText ? 1 : 0, 
          scale: tooltipText ? 1 : 0.9,
          x: tooltipX,
          y: tooltipY,
          xPercent: isRightHalf ? -100 : 0,
          yPercent: isBottomHalf ? -100 : 0
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.2, opacity: { duration: 0.15 } }}
        style={{ display: tooltipText ? 'block' : 'none', translateX: isRightHalf ? '-100%' : '0%', translateY: isBottomHalf ? '-100%' : '0%' }}
      >
        {tooltipText}
      </motion.div>
    </>
  );
}