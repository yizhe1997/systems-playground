'use client';
import { useState, useEffect, useRef } from 'react';
import { ImageOff } from 'lucide-react';

const LOAD_TIMEOUT_MS = 12000;

export default function BrutalistImage({ src, alt, className = '' }: { src: string, alt: string, className?: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setHasError(true);
    }, LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [src]);

  const handleLoad = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsLoading(false);
  };

  const handleError = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={`relative flex items-center justify-center w-full h-full min-h-[300px] ${className}`}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8f8f8] dark:bg-[#111] animate-pulse z-10">
          <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin mb-4" />
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">LOADING ASSET...</span>
        </div>
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8f8f8] dark:bg-[#111] border border-dashed border-rose-500/50 z-20 p-6 text-center">
          <ImageOff className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
          <span className="font-mono text-xs text-rose-500 uppercase tracking-widest font-bold mb-2">ASSET CORRUPTED</span>
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-60 max-w-[200px]">Failed to load {alt}</span>
        </div>
      ) : (
        <img 
          src={src} 
          alt={alt} 
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full max-w-[800px] h-auto object-contain dark:invert transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`} 
        />
      )}
    </div>
  );
}