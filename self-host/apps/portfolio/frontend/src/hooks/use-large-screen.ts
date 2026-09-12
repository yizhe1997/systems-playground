import * as React from 'react'

// Tailwind's `lg` breakpoint - the iPad frame needs real width to not feel cramped, so it only
// wraps content here; smaller viewports get the plain unframed layout instead. Same
// useSyncExternalStore pattern as use-mobile.ts's useIsMobile, just a different breakpoint/direction.
const LARGE_BREAKPOINT = 1024

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(min-width: ${LARGE_BREAKPOINT}px)`)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.innerWidth >= LARGE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsLargeScreen() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
