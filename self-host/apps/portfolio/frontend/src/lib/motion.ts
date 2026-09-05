import type { Transition, Variants } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

// Falls from above and settles with a couple of gentle bounces - an underdamped spring (damping
// ratio ~0.35, from damping / (2*sqrt(stiffness*mass))) rather than a duration/easing tween, so
// the bounce is real physics instead of a hand-tuned keyframe curve. Used for the "device" shells
// (kiosk, CRT+tower, iPad) on page load.
export const FALL_IN_SPRING: Transition = { type: 'spring', stiffness: 300, damping: 12, mass: 1 };
export const FALL_IN_INITIAL = { opacity: 0, y: -120 };
export const FALL_IN_ANIMATE = { opacity: 1, y: 0 };

// Same "falls from above" idea with no bounce - a plain eased slide, using the site's own
// signature hover-transition curve for continuity.
export const SLIDE_DOWN_TRANSITION: Transition = { duration: 0.7, ease: EASE };
export const SLIDE_DOWN_INITIAL = { opacity: 0, y: -60 };
export const SLIDE_DOWN_ANIMATE = { opacity: 1, y: 0 };

// Homepage hero: the left column (job-title badge, heading+description, buttons+trust row - three
// separate CSS grid items, not one wrapper, since wrapping them would collapse the grid's own
// row placement) slides in from the left as one group, then the browser mockup follows in from
// the right shortly after (HERO_RIGHT_TRANSITION's delay). All mount-triggered, not scroll-
// triggered - this is the hero, always above the fold on load.
export const HERO_LEFT_INITIAL = { opacity: 0, x: -60 };
export const HERO_LEFT_ANIMATE = { opacity: 1, x: 0 };
export const HERO_LEFT_TRANSITION: Transition = { duration: 0.85, ease: EASE };
export const HERO_RIGHT_INITIAL = { opacity: 0, x: 60 };
export const HERO_RIGHT_ANIMATE = { opacity: 1, x: 0 };
export const HERO_RIGHT_TRANSITION: Transition = { duration: 0.85, ease: EASE, delay: 0.25 };

// Work Together "boarding pass" - slides in from the left on load, same idea as the hero's left
// column but a bigger travel distance for a full-width block.
export const TICKET_INITIAL = { opacity: 0, x: -100 };
export const TICKET_ANIMATE = { opacity: 1, x: 0 };
export const TICKET_TRANSITION: Transition = { duration: 0.9, ease: EASE };

// Featured Projects / Blog cards - "pop into existence" (scale+fade, not a slide), cascading one
// after another. Mount-triggered, not scroll-triggered: these grids can be the first thing a
// visitor sees if they land via a copied #projects/#blog section link, so gating the reveal on
// scroll position either left them stuck invisible or raced the browser's own anchor-jump.
export const POP_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
// Plain (non-Variants-typed) versions of the same two states, for callers that animate a single
// element directly via initial/animate/exit rather than through a stagger container's variants
// propagation - Variants' value type allows a resolver function, which initial/animate/exit don't
// accept, so POP_ITEM itself isn't assignable there.
export const POP_HIDDEN = { opacity: 0, scale: 0.85 };
export const POP_VISIBLE = { opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE } };
export const POP_ITEM: Variants = {
  hidden: POP_HIDDEN,
  visible: POP_VISIBLE,
};
