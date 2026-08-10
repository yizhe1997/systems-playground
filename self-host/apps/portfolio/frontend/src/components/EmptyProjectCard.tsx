'use client';
import { useState } from 'react';

// Six expressions, ported verbatim from the Claude Design "Featured
// Projects" empty-state template - randomizeFace on hover picks one at
// random, independently per card (each card owns its own state).
type Face = { leftEye: string; rightEye: string; filled: boolean; mouth: string; rotate: number; tongue: string };

const FACES: Face[] = [
  { leftEye: 'M12.7 18a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0', rightEye: 'M23.7 18a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0', filled: true, mouth: 'M14 24c1.8 2 4 3 6 3s4.2-1 6-3', rotate: 0, tongue: '' },
  { leftEye: 'M14.5 15l1.2 2.6 2.8 1-2.8 1-1.2 2.6-1.2-2.6-2.8-1 2.8-1z', rightEye: 'M25.5 15l1.2 2.6 2.8 1-2.8 1-1.2 2.6-1.2-2.6-2.8-1 2.8-1z', filled: true, mouth: 'M13 23.2a7 5 0 0 0 14 0', rotate: -6, tongue: '' },
  { leftEye: 'M14.5 18m-2 0a2 2 0 1 1 4 0a1.3 1.3 0 1 1 -2.6 0a0.6 0.6 0 1 1 1.2 0', rightEye: 'M25.5 18m-2 0a2 2 0 1 1 4 0a1.3 1.3 0 1 1 -2.6 0a0.6 0.6 0 1 1 1.2 0', filled: false, mouth: 'M13 25q1.5 -3.5 3 0t3 0t3 0t3 0', rotate: 8, tongue: '' },
  { leftEye: 'M12.7 18.5q1.8 -2.4 3.6 0', rightEye: 'M23.7 18a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0', filled: false, mouth: 'M13 23.5c2 3 5 4 7 4s5-1 7-4', rotate: 0, tongue: 'M17.5 27q2.5 2.6 5 0' },
  { leftEye: 'M12.7 16.2l3.6 3.6m0 -3.6l-3.6 3.6', rightEye: 'M23.7 16.2l3.6 3.6m0 -3.6l-3.6 3.6', filled: false, mouth: 'M14 25.5q3 1.4 6 0t6 0', rotate: 4, tongue: '' },
  { leftEye: 'M14.5 16.3c-1-1.3-3-0.6-3 0.9c0 1.3 1.8 2.6 3 3.6c1.2-1 3-2.3 3-3.6c0-1.5-2-2.2-3-0.9z', rightEye: 'M25.5 16.3c-1-1.3-3-0.6-3 0.9c0 1.3 1.8 2.6 3 3.6c1.2-1 3-2.3 3-3.6c0-1.5-2-2.2-3-0.9z', filled: true, mouth: 'M13 23.5c2 3 5 4 7 4s5-1 7-4', rotate: 0, tongue: '' },
];

// One slot in the Featured Projects grid when there's nothing to show yet -
// dashed-top/left, solid-bottom/right border distinguishes it from a real
// (fully solid-border) project card at a glance. Same shape, shadow, and
// press-hover as a populated card so the empty grid still reads as part of
// the same component family, not a separate "error" state.
export default function EmptyProjectCard() {
  const [faceIndex, setFaceIndex] = useState(0);
  const face = FACES[faceIndex];

  return (
    <div
      onMouseEnter={() => setFaceIndex(Math.floor(Math.random() * FACES.length))}
      className="flex flex-col items-center justify-center gap-2.5 border-black bg-[#fafafa] text-center cursor-pointer transition-[transform,box-shadow] duration-150 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
      style={{
        borderWidth: '2px',
        borderStyle: 'dashed solid solid dashed',
        borderRadius: '0 0.75rem 0.75rem 0.75rem',
        boxShadow: 'var(--ds-shadow-md)',
        padding: '20px',
        minHeight: '186px',
      }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        style={{ transform: `rotate(${face.rotate}deg)`, transformOrigin: 'center', transition: 'transform 200ms' }}
      >
        <circle cx="20" cy="20" r="16" fill="var(--ds-yellow)" stroke="#000" strokeWidth={2} />
        <path d={face.leftEye} fill={face.filled ? '#000' : 'none'} stroke={face.filled ? 'none' : '#000'} strokeWidth={2} strokeLinecap="round" />
        <path d={face.rightEye} fill={face.filled ? '#000' : 'none'} stroke={face.filled ? 'none' : '#000'} strokeWidth={2} strokeLinecap="round" />
        <path d={face.mouth} stroke="#000" strokeWidth={2} strokeLinecap="round" fill="none" />
        {face.tongue && <path d={face.tongue} stroke="#000" strokeWidth={2} strokeLinecap="round" fill="none" />}
      </svg>
      <div className="font-extrabold text-sm" style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-charcoal)' }}>
        Nothing here yet
      </div>
      <div className="text-xs" style={{ color: 'var(--ds-charcoal)', opacity: 0.55 }}>
        Check back soon
      </div>
    </div>
  );
}
