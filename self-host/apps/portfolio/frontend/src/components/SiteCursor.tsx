'use client';

import UserCursor from '@/components/originkit/usercursor';

export default function SiteCursor() {
  return (
    <UserCursor
      name="Yi Zhe"
      color="#FFFFFF"
      textColor="#FFFFFF"
      size={40}
      labelTiltStrength={25}
      showLabel={false}
      offsetX={0}
      offsetY={0}
      labelOffsetUseDefault={true}
      labelOffsetX={20}
      labelOffsetY={10}
      pressScale={0.92}
      arrow={(color) => (
        <svg width={40} height={40} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', overflow: 'visible' }}>
          <path d="M5 3 L23 14 L14 16 L11 24 Z" fill={color} stroke="#000000" strokeWidth={2} strokeLinejoin="round" />
        </svg>
      )}
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999 }}
    />
  );
}
