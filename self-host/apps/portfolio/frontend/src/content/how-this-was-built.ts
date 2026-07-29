export type TimelineMoment = {
  prompt: string;
  decision: string;
  result: string;
};

export const timeline: TimelineMoment[] = [
  {
    prompt: '"Design me a portfolio direction" — first attempt, no external reference.',
    decision:
      'Shipped a flat "Config File" direction with no imagery and an unused display font. Called out as "hecking ugly."',
    result:
      'Rejected. Root cause traced to the visual screenshot tool silently failing all session — verification had been computed-style checks only, never an actual pixel review.',
  },
  {
    prompt: '"Try a different direction" — Mosaic Grid, still freehand.',
    decision: 'Built a second direction without a real design reference to anchor it.',
    result:
      'Rejected — background read as generic AI-slop texture, spacing felt off. Confirmed: freehand design without a real reference wasn\'t working.',
  },
  {
    prompt: 'Operator pinned an external reference directly (superdesign.dev\'s Lumina, adapted to Neo-Brutalist).',
    decision: 'Adopted the pinned reference\'s exact tokens — hard shadows, 2px black borders, the push-button press effect — instead of freehand styling.',
    result: '"Yeah this looks a lot better." First direction that stuck.',
  },
  {
    prompt: '"How would we continue from here normally?" — asked about workflow, not just fixes.',
    decision: 'Ran a structured `/impeccable audit` instead of ad hoc review.',
    result:
      'Scored 18/20. Caught real WCAG violations — footer icons and the mobile hamburger button both under the 44px touch-target minimum.',
  },
  {
    prompt: 'Extended the same system to Projects, Docs, and About.',
    decision: 'Ran a finish-reviewer pass against the new surfaces before calling them done.',
    result:
      'Caught a genuine Next.js 16 breaking change — client-component `params` is now a Promise — that would have silently broken the docs viewer in production.',
  },
  {
    prompt: '"Apply the same design to admin as well."',
    decision: 'Restyled the whole admin dashboard (CMS manager, resume-request queue, login) to the same tokens.',
    result:
      'Surfaced real accessibility gaps along the way, not just a re-skin: delete buttons invisible to keyboard-only focus, missing ARIA tabpanel wiring across two tab bars. Fixed both.',
  },
  {
    prompt: '"Get me the reactive grid component" — first animation-library integration.',
    decision: 'Wired an interactive canvas grid into the hero background.',
    result:
      'Shipped with a real bug: hovering over buttons and headline text didn\'t trigger the effect, because the listener was scoped to the wrong DOM layer. Root-caused and fixed same session.',
  },
];

export type BeforeAfter = {
  title: string;
  context: string;
  before: string;
  after: string;
};

export const beforeAfterGallery: BeforeAfter[] = [
  {
    title: 'The "real" keyword in the hero',
    context:
      'First pass misread the reference spec — the word rendered as a hollow, invisible outline instead of the intended solid stroked treatment.',
    before: `<span style={{
  WebkitTextStroke: '2px black',
  color: 'transparent',
}}>
  real
</span>`,
    after: `<span
  className="text-white drop-shadow-[4px_4px_0px_#000]"
  style={{ WebkitTextStroke: '4px black' }}
>
  REAL
</span>`,
  },
  {
    title: 'Hero dot-pattern visibility',
    context: 'Spec\'d at 10% opacity per the design doc — technically correct, but "I gotta squint to see it" in practice.',
    before: `rgba(0,0,0,0.1) 1.5px, transparent 1.5px`,
    after: `rgba(0,0,0,0.25) 1.5px, transparent 1.5px`,
  },
  {
    title: 'Reactive grid pointer tracking',
    context:
      'Foreground content (buttons, headline) sits as a sibling of the canvas, not a descendant — so a container-scoped listener never saw pointer events over it.',
    before: `container.addEventListener(
  "pointermove", onMove
);`,
    after: `// clientX/Y are page-relative regardless
// of target — window sees everything.
window.addEventListener(
  "pointermove", onMove
);`,
  },
];
