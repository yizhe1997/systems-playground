'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { animate } from 'animejs';
import { Lock, RotateCw, SignalHigh, Wifi, BatteryFull, Volume2, VolumeX } from 'lucide-react';
import { playFlipSound } from '@/lib/flip-sound';
import { playShutterSound } from '@/lib/camera-shutter-sound';
import { playSpeakerChime } from '@/lib/speaker-chime-sound';
import BrailleScreensaver from '@/components/BrailleScreensaver';

// Landscape - the long edge runs horizontal, the short edge vertical (home button lives on the
// short right edge now, front camera on the short left edge - both rotated 90deg from where
// they'd sit on a portrait device). Both are pure functions of the viewport, never of
// route/content, so the device stays identical across pages; this only reshapes the CASE, not
// {children} - the screen content itself renders exactly as it always has, unrotated.
const SCREEN_WIDTH = 'min(90vw, 1520px)';
const SCREEN_HEIGHT = 'min(70vh, 740px)';

type Axis = 'x' | 'y';

// User-supplied solid triangular arrow, traced base-up: its two wide corners sit at y=~213-223
// and its point at y=~93 - i.e. authored pointing UP. Rotated per direction from there rather
// than swapped for a different path per arrow.
const ARROW_PATH =
  'M324.371,213.287l-150.004-120c-5.479-4.382-13.262-4.381-18.741,0.001l-149.996,120c-4.974,3.979-6.893,10.667-4.784,16.678c2.108,6.011,7.784,10.035,14.154,10.035h300c6.371,0,12.046-4.024,14.154-10.035C331.264,223.954,329.346,217.267,324.371,213.287z';

function CaseArrow({ direction }: { direction: 'up' | 'down' | 'left' | 'right' }) {
  const deg = { up: 0, right: 90, down: 180, left: 270 }[direction];
  return (
    <svg viewBox="0 0 330.002 330.002" className="w-9 h-9" style={{ transform: `rotate(${deg}deg)` }} aria-hidden="true">
      <path fill="currentColor" d={ARROW_PATH} />
    </svg>
  );
}

// A cartoon/brutalist iPad shell wrapping the /blog content - thick black outline, flat DS
// color, hard drop shadow, matching this site's own visual language rather than a photorealistic
// Apple render. Only ever mounted for large viewports (see useIsLargeScreen) - the interactive
// screen area would be too cramped to actually use on a phone.
export default function BlogIpadFrame({ children }: { children: React.ReactNode }) {
  // Drives the fake Safari address bar below - was hardcoded to "/blog" regardless of route,
  // which was wrong the moment you opened an actual post (still showed the index URL instead of
  // following the post's own id).
  const pathname = usePathname();
  const [time, setTime] = useState('');
  const [screensaverTime, setScreensaverTime] = useState('');
  const [screensaverDate, setScreensaverDate] = useState('');
  const [poweredOn, setPoweredOn] = useState(true);
  const [volume, setVolume] = useState(50);
  const [showVolumeHud, setShowVolumeHud] = useState(false);
  const volumeHudTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const homeBtnRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLButtonElement>(null);
  const powerBtnRef = useRef<HTMLButtonElement>(null);
  const volDownBtnRef = useRef<HTMLButtonElement>(null);
  const volUpBtnRef = useRef<HTMLButtonElement>(null);
  // Two independent cumulative angles, not 0/180 toggles - each of the four arrows always spins
  // its own direction (left/up keep subtracting, right/down keep adding), rather than picking
  // whichever way is "shorter" back to the other face. The flip buttons live outside the rotating
  // element (siblings of cardRef, not children of either face) specifically so they're always
  // visible and clickable regardless of which side is currently facing forward.
  const angleYRef = useRef(0);
  const angleXRef = useRef(0);
  // Click-and-drag flip: pointerdown on the case (not the screen) starts tracking; whichever axis
  // moves further past a small deadzone "wins" for that gesture. DEG_PER_PX is how much of a
  // flip a pixel of drag is worth - ~300px of drag for a full 180deg turn.
  const dragRef = useRef<{ axis: Axis | null; startX: number; startY: number; startAngle: number } | null>(null);
  const DEG_PER_PX = 0.6;
  const DRAG_DEADZONE = 8;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      // Same clock tick drives the screensaver's own two-line clock - a real device screensaver
      // shows one, so this reuses the status bar's own timer instead of running a second one.
      setScreensaverTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setScreensaverDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => {
    if (volumeHudTimeoutRef.current) clearTimeout(volumeHudTimeoutRef.current);
  }, []);

  // Shared by both the arrow buttons and the drag-release settle below - takes an explicit target
  // angle (rather than always +/-180 from wherever it is now) so a drag that's only partway
  // through a flip can animate on to the nearest full turn, or back to where it started.
  const runFlip = (axis: Axis, targetAngle: number) => {
    if (!cardRef.current) return;
    const angleRef = axis === 'y' ? angleYRef : angleXRef;
    // A drag that springs back without crossing the halfway point targets the same angle it
    // started at - no actual flip happened, so no sound (only a real commit, or a button click,
    // which always targets a genuinely different angle, plays one).
    const alreadyThere = angleRef.current === targetAngle;
    angleRef.current = targetAngle;
    if (!alreadyThere) playFlipSound();

    if (axis === 'y') {
      animate(cardRef.current, { rotateY: targetAngle, duration: 700, ease: 'inOutQuad' });
    } else {
      animate(cardRef.current, { rotateX: targetAngle, duration: 700, ease: 'inOutQuad' });
    }
  };

  const handleFlip = (axis: Axis, direction: 1 | -1) => {
    const angleRef = axis === 'y' ? angleYRef : angleXRef;
    runFlip(axis, angleRef.current + 180 * direction);
  };

  // Grabbing an edge and dragging it toward the opposite side flips the device - drag the right
  // side left and it turns the same way the right arrow button does (a positive rotateY swings
  // the right edge back and away from the viewer, which reads exactly like "pulling" it left).
  // Live-tracks the pointer with instant (duration:0) animate() calls rather than writing
  // cardRef's style.transform directly, so anime.js's own internal per-property state - which the
  // arrow buttons' animate() calls above also read/write - never drifts out of sync with the DOM.
  const handleCasePointerDown = (e: React.PointerEvent) => {
    const target = e.target as Element;
    if (target.closest('[data-blogpad-screen]') || target.closest('button')) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { axis: null, startX: e.clientX, startY: e.clientY, startAngle: 0 };
  };

  const handleCasePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !cardRef.current) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.axis) {
      if (Math.abs(dx) < DRAG_DEADZONE && Math.abs(dy) < DRAG_DEADZONE) return;
      drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'y' : 'x';
      drag.startAngle = drag.axis === 'y' ? angleYRef.current : angleXRef.current;
    }

    const delta = drag.axis === 'y' ? -dx : -dy;
    const angle = drag.startAngle + delta * DEG_PER_PX;
    if (drag.axis === 'y') {
      animate(cardRef.current, { rotateY: angle, duration: 0 });
    } else {
      animate(cardRef.current, { rotateX: angle, duration: 0 });
    }
  };

  const handleCasePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !drag.axis) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const delta = drag.axis === 'y' ? -dx : -dy;
    const current = drag.startAngle + delta * DEG_PER_PX;
    // Snapping to the nearest multiple of 180 is what implements "past the halfway point commits
    // to the flip, short of it springs back" - no separate threshold check needed.
    const target = Math.round(current / 180) * 180;
    runFlip(drag.axis, target);
  };

  const handleHomePress = () => {
    if (homeBtnRef.current) {
      animate(homeBtnRef.current, { scale: [1, 0.8, 1], duration: 400, ease: 'outBack' });
    }
    // The screen area now scrolls internally (fixed device size, scrollable content) rather than
    // the whole page - "home" scrolls that inner viewport back to the top, not the page.
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCameraClick = () => {
    playShutterSound();
    if (cameraRef.current) {
      animate(cameraRef.current, { scale: [1, 0.8, 1], duration: 260, ease: 'outBack' });
    }
  };

  const handleSpeakerClick = () => {
    playSpeakerChime(volume);
  };

  const togglePower = () => setPoweredOn((v) => !v);

  // Shows a temporary on-screen HUD regardless of power state, same as a real device still
  // showing a volume overlay over a locked/off screen - not gated on poweredOn.
  const adjustVolume = (delta: number) => {
    setVolume((v) => Math.max(0, Math.min(100, v + delta)));
    setShowVolumeHud(true);
    if (volumeHudTimeoutRef.current) clearTimeout(volumeHudTimeoutRef.current);
    volumeHudTimeoutRef.current = setTimeout(() => setShowVolumeHud(false), 1500);
  };

  // Feedback for the edge buttons is a physical "press into the case" bounce, not a hover
  // recolor - direction flips depending on which edge the button pokes out from (the top-edge
  // power button retracts DOWN into the case, the bottom-edge volume buttons retract UP into it).
  const indentPress = (el: HTMLElement | null, direction: 1 | -1) => {
    if (!el) return;
    animate(el, { translateY: [0, 3 * direction, 0], duration: 220, ease: 'outQuad' });
  };

  const handleTogglePower = () => {
    togglePower();
    indentPress(powerBtnRef.current, 1);
  };

  const handleVolumeDown = () => {
    adjustVolume(-10);
    indentPress(volDownBtnRef.current, -1);
  };

  const handleVolumeUp = () => {
    adjustVolume(10);
    indentPress(volUpBtnRef.current, -1);
  };

  // No circle/white chip - just the glyph sitting straight on the page's own sage backdrop, per
  // request. Sized up (w-9/h-9 on the SVG itself) for a chunkier, friendlier look; hover just
  // dims it slightly rather than swapping in a fill, since there's no button chrome to invert.
  const arrowBtnClass = 'shrink-0 flex items-center justify-center text-[var(--ds-charcoal)] hover:opacity-50 transition-opacity';

  return (
    <div
      className="mx-auto justify-items-center items-center"
      style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gridTemplateRows: 'auto 1fr auto', gap: '1rem', width: 'fit-content' }}
    >
      <button
        type="button"
        onClick={() => handleFlip('x', -1)}
        data-cursor-label="Flip"
        aria-label="Flip the iPad up"
        className={arrowBtnClass}
        style={{ gridColumn: 2, gridRow: 1 }}
      >
        <CaseArrow direction="up" />
      </button>

      <button
        type="button"
        onClick={() => handleFlip('y', -1)}
        data-cursor-label="Flip"
        aria-label="Flip the iPad left"
        className={arrowBtnClass}
        style={{ gridColumn: 1, gridRow: 2 }}
      >
        <CaseArrow direction="left" />
      </button>

      <div style={{ perspective: 2200, position: 'relative', width: 'fit-content', gridColumn: 2, gridRow: 2 }}>
        {/* Width is fit-content, not a hand-computed number - the screen inside has its own fixed
            width/height regardless of children, so the front face's rendered box is already
            deterministic; letting the card size to that removes a second, easy-to-drift copy of
            the same dimensions. */}
        <div ref={cardRef} className="relative" style={{ transformStyle: 'preserve-3d', width: 'fit-content', zIndex: 1 }}>
          {/* FRONT FACE - the screen itself is a fixed size so the whole device never resizes
              between routes - only the content inside scrolls. Landscape: extra padding sits on
              the RIGHT (for the home button) instead of the bottom. Pointer handlers here (and on
              the back face below) are what let you grab the case and drag it to flip - they bail
              out early for anything inside the screen or a button, see handleCasePointerDown. */}
          <div
            className="relative border-4 border-black"
            data-cursor-label="Flip"
            // touch-action stays at its default here rather than 'none' - this wraps the screen
            // too, and touch-action is the *intersection* of an element's value and its
            // ancestors', so 'none' up here would permanently kill the screen's own touch-scroll
            // no matter what it sets on itself. The device only mounts on large (>=1024px)
            // viewports anyway, so this is a mouse-first interaction first and foremost.
            style={{ backfaceVisibility: 'hidden', borderRadius: '2.5rem', backgroundColor: 'var(--ds-yellow)', padding: '22px 46px 22px 22px', cursor: 'grab' }}
            onPointerDown={handleCasePointerDown}
            onPointerMove={handleCasePointerMove}
            onPointerUp={handleCasePointerUp}
            onPointerCancel={handleCasePointerUp}
          >
            {/* Front camera - on the short LEFT edge now (opposite the home button), vertically
                centered, same as it'd sit on a real device rotated 90deg. */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 7,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--ds-charcoal)',
                border: '2px solid rgba(23,30,25,0.25)',
              }}
            />

            {/* data-cursor-label="" is a deliberate empty override (see usercursor.tsx) - without
                it, hovering blank space in here (gaps between cards, page margins) would
                otherwise inherit "Flip" from the face div above, which would be actively
                misleading since dragging doesn't do anything in here. */}
            <div
              data-blogpad-screen
              data-cursor-label=""
              className="relative border-2 border-black overflow-hidden flex flex-col"
              style={{ borderRadius: '1.25rem', width: SCREEN_WIDTH, height: SCREEN_HEIGHT, cursor: 'auto', backgroundColor: poweredOn ? '#fff' : 'var(--ds-charcoal)' }}
            >
              {poweredOn ? (
                <>
                  {/* status bar - time left, signal/wifi/battery right, matching iPadOS's own layout */}
                  <div className="shrink-0 flex items-center justify-between px-5 pt-3 pb-1.5 border-b border-black/10 text-[12px] font-semibold text-black">
                    <span className="font-mono">{time}</span>
                    <div className="flex items-center gap-1.5">
                      <SignalHigh className="w-3.5 h-3.5" aria-hidden="true" />
                      <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
                      <BatteryFull className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                  {/* Safari-style compact address bar - centered lock+domain as one unit (not
                      left-aligned), reload icon pinned to the right edge without disturbing that
                      centering, rounded pill on a light-gray field. */}
                  <div className="shrink-0 px-3 pt-2 pb-2.5 border-b border-black/10">
                    <div className="relative flex items-center justify-center px-3 py-1.5 bg-black/[0.06]" style={{ borderRadius: '0.6rem' }}>
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-black/70">
                        <Lock className="w-3 h-3" aria-hidden="true" />
                        <span>chinyizhe.com{pathname}</span>
                      </div>
                      <RotateCw className="w-3.5 h-3.5 absolute right-3 text-black/40" aria-hidden="true" />
                    </div>
                  </div>
                  <div ref={contentRef} className="flex-1 overflow-y-auto px-5 pt-4 pb-6">{children}</div>
                </>
              ) : (
                // User-supplied placeholder for the off state - a looping colored Braille-art
                // animation (see BrailleScreensaver), stretched edge-to-edge like a real
                // screensaver rather than sitting pinned at its native size with bezel showing
                // around it, plus a clock/date readout overlaid the same way an OS screensaver
                // shows one. Only mounts once the device is actually turned off (this whole branch
                // is gated on poweredOn), so the ~3.5MB asset is never fetched unless someone
                // actually toggles the power button.
                <div className="relative w-full h-full overflow-hidden">
                  <BrailleScreensaver
                    src="/screensaver.json.gz"
                    loadingLabel="Shutting down"
                    style={{ position: 'absolute', inset: 0 }}
                  />
                  {screensaverTime && (
                    <div
                      className="absolute bottom-5 right-6 flex flex-col items-end text-white/80 pointer-events-none"
                      style={{ zIndex: 5, textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}
                    >
                      <span className="font-mono font-bold leading-none" style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>
                        {screensaverTime}
                      </span>
                      <span className="font-mono tracking-wide text-white/60 mt-1" style={{ fontSize: 'clamp(12px, 1.6vw, 15px)' }}>
                        {screensaverDate}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Volume HUD - a temporary overlay, not gated on poweredOn (see adjustVolume) so
                  pressing volume while the screen is off still shows feedback, same as a real
                  device. Auto-hides itself after 1.5s. */}
              {showVolumeHud && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 border-2 border-black"
                  style={{ top: 16, borderRadius: '0.75rem', zIndex: 20, backgroundColor: poweredOn ? 'white' : 'var(--ds-charcoal)' }}
                >
                  {volume === 0 ? (
                    <VolumeX className="w-4 h-4" style={{ color: poweredOn ? 'var(--ds-charcoal)' : 'white' }} aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-4 h-4" style={{ color: poweredOn ? 'var(--ds-charcoal)' : 'white' }} aria-hidden="true" />
                  )}
                  <div style={{ width: 80, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: poweredOn ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }}>
                    <div style={{ width: `${volume}%`, height: '100%', backgroundColor: poweredOn ? 'var(--ds-charcoal)' : 'var(--ds-yellow)' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Home button - on the short RIGHT edge now, vertically centered (rotated 90deg from
                its old bottom-center spot). Only the CASE rotates to landscape; the screen above
                still renders {children} completely unrotated. Charcoal outline, site yellow fill -
                a flat bezel button rather than a solid dark disc. */}
            <button
              ref={homeBtnRef}
              type="button"
              onClick={handleHomePress}
              aria-label="Scroll to top"
              data-cursor-label="Home"
              className="absolute top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity"
              style={{ right: 10, width: 26, height: 26, borderRadius: '50%', backgroundColor: 'var(--ds-yellow)', border: '2px solid var(--ds-charcoal)' }}
            />
          </div>

          {/* BACK FACE - statically pre-rotated 180deg, so it only becomes visible once the whole
              card (cardRef) has also rotated an odd multiple of 180 - the two rotations cancel
              out and it faces forward, right-reading (not mirrored). */}
          <div
            className="absolute inset-0 border-4 border-black flex flex-col items-center justify-center"
            data-cursor-label="Flip"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '2.5rem', backgroundColor: 'var(--ds-yellow)', cursor: 'grab' }}
            onPointerDown={handleCasePointerDown}
            onPointerMove={handleCasePointerMove}
            onPointerUp={handleCasePointerUp}
            onPointerCancel={handleCasePointerUp}
          >
            {/* On the short RIGHT edge, vertically centered - the previous left placement read
                backwards once actually seen flipped to the back; this is the corrected side. */}
            <button
              ref={cameraRef}
              type="button"
              onClick={handleCameraClick}
              aria-label="Take a photo"
              data-cursor-label="Snap"
              className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center border-2 border-black hover:opacity-80 transition-opacity"
              style={{ right: 24, width: 46, height: 46, borderRadius: '50%', backgroundColor: 'var(--ds-charcoal)' }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%, #8a9aa4, #171e19 70%)',
                  border: '2px solid rgba(255,255,255,0.18)',
                }}
              />
            </button>

            {/* Speaker grille - the short LEFT edge, mirroring the camera on the right. A real
                perforated mesh (a tall grid of small drilled-look dots straight on the case),
                not a button-shaped chip - no circle backdrop, no border, so it reads as texture
                on the case rather than a control. Still a real <button> for click handling and
                a11y, just with all default button chrome stripped. Clicking it plays a little
                chime (speaker-chime-sound.ts) - there's no "correct" sound for a fake speaker,
                so this is just a fun confirmation noise, same synthesis approach as the other
                device sounds (flip/shutter). */}
            <button
              type="button"
              onClick={handleSpeakerClick}
              aria-label="Play a sound"
              data-cursor-label="Play"
              className="absolute top-1/2 -translate-y-1/2 grid hover:opacity-70 transition-opacity"
              style={{ left: 28, width: 44, height: 200, gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, background: 'none', border: 'none', padding: 0 }}
            >
              {Array.from({ length: 42 }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--ds-charcoal)', justifySelf: 'center' }}
                />
              ))}
            </button>

            {/* The wordmark is case branding, not screen content - like real engraving it's fixed
                to the physical body, so it rotates along with the case's own portrait-to-landscape
                turn. Both live inside a sage "segment" panel - like the distinct control-panel
                inset some real devices have - rather than floating loose on the yellow case. Logo
                badge is a plain bordered circle - a prior Neon Border (Originkit) version was
                dropped, not worth the extra dependency for a corner initials mark. */}
            <div style={{ transform: 'rotate(90deg)' }}>
              <div
                className="flex flex-col items-center gap-3 border-2 border-black"
                style={{ backgroundColor: 'var(--ds-sage)', borderRadius: '1.25rem', padding: '20px 28px' }}
              >
                <div
                  className="flex items-center justify-center border-2 border-black"
                  style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--ds-yellow)' }}
                >
                  <span style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ds-charcoal)' }}>YZ</span>
                </div>
                <span className="font-mono text-xs tracking-[0.3em]" style={{ color: 'var(--ds-charcoal)' }} aria-hidden="true">BLOGPAD</span>
              </div>
            </div>
          </div>

          {/* Power + volume buttons - physical case-edge hardware, not part of either face. They
              live as the LAST children of cardRef (after both faces, not nested inside either)
              for two reasons: (1) a real device's edge buttons are visible from the front AND the
              back, so unlike everything drawn on a face they must not be hidden by that face's
              backfaceVisibility once the card rotates past 90deg - the earlier version nested them
              inside the front face and vanished for exactly this reason; (2) since these have no
              rotation of their own, they sit perfectly coplanar with whichever face is currently
              showing (a 180deg turn maps a flat plane onto itself), so paint order between
              coincident coplanar 3D siblings falls back to DOM order - being last ensures they
              paint on top of whichever face is visible, front or back, instead of being buried
              under it. Blank, always-charcoal (no hover recolor, no on/off recolor) - feedback is
              the indentPress bounce on click, not a static color/hover state. Power stays alone on
              the top edge; volume moved to the bottom edge (the opposite side of the case) per
              request, both anchored a bit right of the front camera rather than centered.
              top/bottom offset is -height exactly (not -height-4): these buttons are direct
              children of cardRef, which (unlike the old front-face parent) has no border of its
              own, so the containing block's padding box already coincides with the case's visual
              border-box edge - no extra 4px border compensation needed. The earlier -14 baked in
              that compensation anyway (a leftover from when these lived inside the bordered front
              face) and it was creating a visible gap between the button and the case. */}
          <button
            ref={powerBtnRef}
            type="button"
            onClick={handleTogglePower}
            aria-label={poweredOn ? 'Turn off' : 'Turn on'}
            data-cursor-label={poweredOn ? 'Power off' : 'Power on'}
            className="absolute border-2 border-black border-b-0"
            style={{ top: -10, left: 90, width: 60, height: 10, borderRadius: '5px 5px 0 0', backgroundColor: 'var(--ds-charcoal)' }}
          />
          <div className="absolute flex items-start gap-1.5" style={{ bottom: -10, left: 90 }}>
            <button
              ref={volDownBtnRef}
              type="button"
              onClick={handleVolumeDown}
              aria-label="Volume down"
              data-cursor-label="Vol-"
              className="border-2 border-black border-t-0"
              style={{ width: 44, height: 10, borderRadius: '0 0 5px 5px', backgroundColor: 'var(--ds-charcoal)' }}
            />
            <button
              ref={volUpBtnRef}
              type="button"
              onClick={handleVolumeUp}
              aria-label="Volume up"
              data-cursor-label="Vol+"
              className="border-2 border-black border-t-0"
              style={{ width: 44, height: 10, borderRadius: '0 0 5px 5px', backgroundColor: 'var(--ds-charcoal)' }}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleFlip('y', 1)}
        data-cursor-label="Flip"
        aria-label="Flip the iPad right"
        className={arrowBtnClass}
        style={{ gridColumn: 3, gridRow: 2 }}
      >
        <CaseArrow direction="right" />
      </button>

      <button
        type="button"
        onClick={() => handleFlip('x', 1)}
        data-cursor-label="Flip"
        aria-label="Flip the iPad down"
        className={arrowBtnClass}
        style={{ gridColumn: 2, gridRow: 3 }}
      >
        <CaseArrow direction="down" />
      </button>
    </div>
  );
}
