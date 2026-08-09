import * as React from 'react'

const MOBILE_BREAKPOINT = 768

// useSyncExternalStore is the React-recommended primitive for subscribing to
// an external browser API (matchMedia here) - it replaces the old
// effect-plus-state pattern (subscribe in useEffect, setState from the
// change handler) that always caused an extra post-mount render and tripped
// the set-state-in-effect lint rule. React handles the SSR/client snapshot
// reconciliation for us instead of us hand-rolling a "mounted" flag.
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
