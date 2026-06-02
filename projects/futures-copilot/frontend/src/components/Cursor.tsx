'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function Cursor() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState<string | null>(null);
  const [isRightHalf, setIsRightHalf] = useState(false);
  const [isBottomHalf, setIsBottomHalf] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: fine) and (hover: hover)');

    const updateEnabledState = () => {
      const nextIsEnabled = mediaQuery.matches;
      setIsEnabled(nextIsEnabled);

      if (!nextIsEnabled) {
        setIsVisible(false);
        setTooltipText(null);
      }
    };

    updateEnabledState();
    mediaQuery.addEventListener('change', updateEnabledState);

    return () => {
      mediaQuery.removeEventListener('change', updateEnabledState);
    };
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const updateMousePosition = (x: number, y: number, target: EventTarget | null) => {
      setIsVisible(true);
      setMousePosition({ x, y });
      setIsRightHalf(x > window.innerWidth / 2);
      setIsBottomHalf(y > window.innerHeight / 2);
      lastPointerPositionRef.current = { x, y };
      
      const targetElement = target as HTMLElement | null;
      // Skip if mouse leaves document entirely
      if (!targetElement || !targetElement.closest) return;

      const tooltipElement = targetElement.closest('[data-cursor-text]') as HTMLElement;
      if (tooltipElement) {
        setTooltipText(tooltipElement.getAttribute('data-cursor-text') || null);
      } else {
        setTooltipText(null);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateMousePosition(e.clientX, e.clientY, e.target);
    };

    const restoreCursorAfterHistoryNavigation = () => {
      if (!isEnabled) return;

      const fallbackPosition = {
        x: Math.round(window.innerWidth / 2),
        y: Math.round(window.innerHeight / 2),
      };
      const pointer = lastPointerPositionRef.current ?? fallbackPosition;

      setMousePosition(pointer);
      setIsRightHalf(pointer.x > window.innerWidth / 2);
      setIsBottomHalf(pointer.y > window.innerHeight / 2);
      setIsVisible(true);
    };

    const hideCursor = () => {
      setIsVisible(false);
      setTooltipText(null);
    };

    const handleWindowMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget) {
        hideCursor();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        restoreCursorAfterHistoryNavigation();
      }
    };

    const handlePopState = () => {
      requestAnimationFrame(() => {
        restoreCursorAfterHistoryNavigation();
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restoreCursorAfterHistoryNavigation();
      }
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('mouseout', handleWindowMouseOut);
    window.addEventListener('blur', hideCursor);
    window.addEventListener('focus', restoreCursorAfterHistoryNavigation);
    window.addEventListener('pagehide', hideCursor);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('mouseleave', hideCursor);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mouseout', handleWindowMouseOut);
      window.removeEventListener('blur', hideCursor);
      window.removeEventListener('focus', restoreCursorAfterHistoryNavigation);
      window.removeEventListener('pagehide', hideCursor);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('mouseleave', hideCursor);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEnabled]);

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

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-6 h-6 border border-black dark:border-white pointer-events-none z-[9999] flex items-center justify-center"
        animate={{
          x: mousePosition.x - 12,
          y: mousePosition.y - 12,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.2, opacity: { duration: 0.1 } }}
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
          opacity: tooltipText && isVisible ? 1 : 0, 
          scale: tooltipText ? 1 : 0.9,
          x: tooltipX,
          y: tooltipY
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.2, opacity: { duration: 0.15 } }}
        style={{ display: tooltipText && isVisible ? 'block' : 'none', translateX: isRightHalf ? '-100%' : '0%', translateY: isBottomHalf ? '-100%' : '0%' }}
      >
        {tooltipText}
      </motion.div>
    </>
  );
}