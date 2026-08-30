'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { animate } from 'animejs';
import { Lock, Power, Sun, Plus, Minus } from 'lucide-react';
import { playShutterSound } from '@/lib/camera-shutter-sound';
import BrailleScreensaver from '@/components/BrailleScreensaver';

// Exposes the device's own screen DOM node to descendants - so something rendered inside
// {children} (like the "Talk to this portfolio" dialog on /projects) can portal itself into the
// screen and confine itself there, instead of covering the whole page the way a normal dialog
// does. null outside a CRT frame (mobile's unframed layout, or anywhere else in the app), which
// callers should treat as "just behave normally, full-viewport".
const CrtScreenContext = createContext<HTMLDivElement | null>(null);
export function useCrtScreenContainer() {
  return useContext(CrtScreenContext);
}

// Landscape CRT screen - the case bezel is deliberately chunky ("edges made bigger" per request,
// a direct correction of how cramped BlogIpadFrame's own edge controls kept turning out on first
// drafts) rather than a slim modern-monitor bezel. Unlike BlogIpadFrame's iPad, this composition
// has a tower + cable sitting outside the case's own width - accounted for here (case padding 88 +
// border 16 + gap 0 + cable 80 + tower 230 = 398px) so the WHOLE composition fits the same 88vw
// budget the screen alone would otherwise claim, instead of overflowing the viewport horizontally.
const SCREEN_WIDTH = 'min(calc(88vw - 400px), 1200px)';
const SCREEN_HEIGHT = 'min(68vh, 760px)';
// Case body height = screen + top/bottom padding (40+20) + border (8*2) + button row (~62) -
// the tower is sized off this so "half the monitor" tracks the screen's own responsive height
// instead of being a fixed guess that only looks right at one viewport size.
const CASE_BODY_HEIGHT = `calc(${SCREEN_HEIGHT} + 138px)`;
const TOWER_HEIGHT = `calc((${CASE_BODY_HEIGHT}) * 0.56)`;

// The cable connects two INTERIOR points, not the shared bottom baseline the case/stand/tower
// column otherwise share via `items-end` - the monitor-side end near the button row (~83px below
// the screen's own bottom edge, measured empirically off a live render rather than hand-summed
// from the button row's padding/border, which undercounted by ~6px), the tower-side end near its
// LED on the tower's thin top rail (~81px below the case's own top edge, same empirical
// correction - the tower's redesigned thin rails/padding made the original hand-summed border+
// padding+half-LED estimate overshoot by ~26px). Both measured as a distance from the case's own
// top edge (= the flex row's own top, since the case+stand column is the tallest item and
// items-end anchors everyone's BOTTOM together, which pushes every shorter item's top downward to
// match - so the row's top edge is exactly the case's top edge). Built from the same
// SCREEN_HEIGHT/CASE_BODY_HEIGHT/TOWER_HEIGHT constants everything else derives from, so this
// stays correct at any viewport size instead of a fixed-px guess that only lines up at one screen
// height.
const CABLE_MONITOR_Y = `calc(${SCREEN_HEIGHT} + 83px)`;
const CABLE_TOWER_Y = `calc(${CASE_BODY_HEIGHT} + 81px - ${TOWER_HEIGHT})`;
const CABLE_BOX_HEIGHT = `calc(${CABLE_MONITOR_Y} - ${CABLE_TOWER_Y} + 10px)`;

// A cartoon/brutalist retro CRT + PC tower shell wrapping the /projects content - thick black
// outline, flat DS colors, hard offset shadows, matching BlogIpadFrame's established visual
// language but built from the "Chunky Arcade" design direction rather than reusing the iPad's own
// shape. Only ever mounted for large viewports (see useIsLargeScreen in the page) - the
// interactive screen area would be too cramped to actually use on a phone.
export default function ProjectsCrtFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [poweredOn, setPoweredOn] = useState(true);
  const [brightness, setBrightness] = useState(100);
  const [showBrightnessHud, setShowBrightnessHud] = useState(false);
  const brightnessHudTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // A state setter doubles as a valid callback ref ((el) => void) - used instead of a plain
  // useRef so the DOM node can be exposed via CrtScreenContext. A plain ref's value doesn't
  // propagate through Context (it's stale/null at first render and updating it doesn't
  // re-render subscribers), whereas this triggers a real re-render once the node mounts.
  const [screenEl, setScreenEl] = useState<HTMLDivElement | null>(null);
  const [screensaverTime, setScreensaverTime] = useState('');
  const [screensaverDate, setScreensaverDate] = useState('');
  const cameraLensRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setScreensaverTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setScreensaverDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => {
    if (brightnessHudTimeoutRef.current) clearTimeout(brightnessHudTimeoutRef.current);
  }, []);

  const togglePower = () => setPoweredOn((v) => !v);

  const adjustBrightness = (delta: number) => {
    setBrightness((v) => Math.max(30, Math.min(100, v + delta)));
    setShowBrightnessHud(true);
    if (brightnessHudTimeoutRef.current) clearTimeout(brightnessHudTimeoutRef.current);
    brightnessHudTimeoutRef.current = setTimeout(() => setShowBrightnessHud(false), 1500);
  };

  const handleCameraClick = () => {
    playShutterSound();
    if (cameraLensRef.current) {
      animate(cameraLensRef.current, { scale: [1, 0.8, 1], duration: 260, ease: 'outBack' });
    }
  };

  return (
    <CrtScreenContext.Provider value={screenEl}>
    <div className="mx-auto flex flex-col items-center" style={{ width: 'fit-content' }}>
      {/* No flex `gap` between monitor/cable/tower - the cable's own box spans the full visual
          gap and its path is drawn edge-to-edge within it, so it actually touches both
          neighbors. A flex gap here left empty space on both sides of the cable's box that the
          path never reached, which read as "not connected to anything". */}
      <div className="flex items-end">
        {/* MONITOR */}
        <div className="flex flex-col items-center">
          <div
            className="relative border-black"
            style={{
              borderWidth: 8,
              borderStyle: 'solid',
              borderRadius: '2.5rem',
              backgroundColor: 'var(--ds-yellow)',
              padding: '40px 44px 20px',
            }}
          >
            {/* Webcam - a real rectangular housing (not a bare lens dot) sitting top-center of
                the bezel, mimicking a physical clip-on webcam clipped to a monitor. Sized and
                positioned to straddle the case's own top border - negative `top` pulls it up so
                roughly its top half pokes above the border into the sage backdrop, while its
                bottom half dips down past the screen's top edge into the address-bar strip,
                rather than sitting flush inside the bezel padding like a normal button. Same lens
                gradient, shutter sound and scale-bounce click feedback as BlogIpadFrame's own
                camera - the bounce only applies to the lens itself (cameraLensRef), not the whole
                housing, so the housing box stays perfectly still on click and only the lens
                "blinks". */}
            <button
              type="button"
              onClick={handleCameraClick}
              aria-label="Take a photo"
              data-cursor-label="Snap"
              className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center border-2 border-black"
              style={{ top: -30, width: 96, height: 72, borderRadius: '0.9rem', backgroundColor: 'var(--ds-charcoal)', zIndex: 20 }}
            >
              <span
                ref={cameraLensRef}
                aria-hidden="true"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%, #8a9aa4, #171e19 70%)',
                  border: '2px solid rgba(255,255,255,0.18)',
                }}
              />
            </button>

            {/* Screen */}
            <div
              ref={setScreenEl}
              className="relative border-black overflow-hidden"
              style={{
                borderWidth: 3,
                borderStyle: 'solid',
                borderRadius: '1.75rem',
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
                // Always charcoal here, not conditional on poweredOn - the actual white comes
                // from the filtered wrapper below when powered on (see its own comment). Leaving
                // white on this outer div meant CSS filter:brightness on the inner wrapper only
                // dimmed the content, not the surrounding screen background, since a child's
                // filter never reaches an ancestor's own painted background.
                backgroundColor: 'var(--ds-charcoal)',
              }}
            >
              {/* CRT glass highlight - flat shapes, not a gradient, echoing the mock's swoosh */}
              <div
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{ top: -80, left: -120, width: 340, height: 640, background: 'rgba(255,255,255,0.05)', transform: 'rotate(14deg)', borderRadius: '50%', zIndex: 30 }}
              />
              {/* scanlines */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 4px)',
                  zIndex: 30,
                }}
              />

              {poweredOn ? (
                // The white background lives HERE, inside the filtered element, not on the outer
                // screen div - filter:brightness only affects an element and its own descendants,
                // never an ancestor's painted background, so the white has to move with it or the
                // page's blank canvas stays full-bright while only the address bar/content dim.
                <div className="relative flex flex-col h-full" style={{ filter: `brightness(${brightness}%)`, backgroundColor: '#fff' }}>
                  {/* Address pill - matches BlogIpadFrame's own fake-browser chrome for the same
                      "device is showing this exact route" feel, minus a mobile status bar which
                      wouldn't make sense over a desktop browser. */}
                  <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-black/10">
                    <div className="flex items-center justify-center gap-1.5 mx-auto px-3 py-1.5 bg-black/[0.06] text-[12px] font-semibold text-black/70" style={{ borderRadius: '0.6rem', width: 'fit-content' }}>
                      <Lock className="w-3 h-3" aria-hidden="true" />
                      <span>chinyizhe.com{pathname}</span>
                    </div>
                  </div>
                  <div ref={contentRef} className="flex-1 overflow-y-auto px-6 pt-4 pb-6">{children}</div>
                </div>
              ) : (
                // Same koi Braille-art screensaver as BlogIpadFrame's own off-state, not a
                // separate animation - one shared easter egg across both device frames.
                <div className="relative w-full h-full overflow-hidden">
                  <BrailleScreensaver
                    src="/screensaver.json.gz"
                    loadingLabel="Shutting down"
                    style={{ position: 'absolute', inset: 0 }}
                  />
                  {screensaverTime && (
                    <div
                      className="absolute top-6 right-8 flex flex-col items-end text-white/70 pointer-events-none"
                      style={{ zIndex: 5, textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}
                    >
                      <span className="font-mono font-bold leading-none" style={{ fontSize: 'clamp(24px, 4vw, 38px)' }}>{screensaverTime}</span>
                      <span className="font-mono tracking-wide text-white/50 mt-1" style={{ fontSize: 'clamp(11px, 1.4vw, 14px)' }}>{screensaverDate}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Brightness HUD */}
              {showBrightnessHud && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 border-2 border-black"
                  style={{ top: 16, borderRadius: '0.75rem', zIndex: 40, backgroundColor: poweredOn ? 'white' : 'var(--ds-charcoal)' }}
                >
                  <Sun className="w-4 h-4" style={{ color: poweredOn ? 'var(--ds-charcoal)' : 'white' }} aria-hidden="true" />
                  <div style={{ width: 80, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: poweredOn ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }}>
                    <div style={{ width: `${brightness}%`, height: '100%', backgroundColor: poweredOn ? 'var(--ds-charcoal)' : 'var(--ds-yellow)' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Bezel button row - sits ON the bezel face (a CRT convention), not protruding case-
                edge tabs like BlogIpadFrame's redesigned power/volume. Brightness buttons now
                match the power button's own styling (black circle, yellow icon) instead of white
                squares, just smaller - reads as one consistent button family, and the shorter row
                frees up a bit more vertical room for the screen itself. justify-between (not
                justify-end) makes room for the YZ wordmark on the left. */}
            <div className="flex items-center justify-between gap-3 pt-3 pl-1 pr-1">
              <span
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--ds-font-display)',
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: '0.02em',
                  color: 'var(--ds-charcoal)',
                }}
              >
                YZ
              </span>
              <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => adjustBrightness(-10)}
                aria-label="Decrease brightness"
                data-cursor-label="Dimmer"
                className="flex items-center justify-center border-black hover:opacity-80 transition-opacity"
                style={{ width: 34, height: 34, borderWidth: 3, borderStyle: 'solid', borderRadius: '999px', backgroundColor: 'var(--ds-charcoal)', boxShadow: '2px 2px 0 0 rgba(23,30,25,0.4)' }}
              >
                <Minus className="w-3.5 h-3.5" style={{ color: 'var(--ds-yellow)' }} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => adjustBrightness(10)}
                aria-label="Increase brightness"
                data-cursor-label="Brighter"
                className="flex items-center justify-center border-black hover:opacity-80 transition-opacity"
                style={{ width: 34, height: 34, borderWidth: 3, borderStyle: 'solid', borderRadius: '999px', backgroundColor: 'var(--ds-charcoal)', boxShadow: '2px 2px 0 0 rgba(23,30,25,0.4)' }}
              >
                <Plus className="w-3.5 h-3.5" style={{ color: 'var(--ds-yellow)' }} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={togglePower}
                aria-label={poweredOn ? 'Turn off' : 'Turn on'}
                data-cursor-label={poweredOn ? 'Power off' : 'Power on'}
                className="flex items-center justify-center border-black hover:opacity-80 transition-opacity"
                style={{ width: 46, height: 46, borderWidth: 4, borderStyle: 'solid', borderRadius: '999px', backgroundColor: 'var(--ds-charcoal)', boxShadow: '3px 3px 0 0 rgba(23,30,25,0.4)' }}
              >
                <Power className="w-4 h-4" style={{ color: 'var(--ds-yellow)' }} aria-hidden="true" />
              </button>
              </div>
            </div>
          </div>

          {/* Stand neck + base */}
          <div style={{ width: 92, height: 48, backgroundColor: 'var(--ds-charcoal)', clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0% 100%)' }} />
          <div style={{ width: 210, height: 26, backgroundColor: 'var(--ds-charcoal)', borderRadius: '0.65rem', marginTop: -2 }} />
        </div>

        {/* Cable - no longer anchored to the shared case/stand/tower bottom baseline (that read
            as connecting to the case's bottom CORNER, not anything a real cable would actually
            plug into). Instead it spans between the two computed interior points above: the
            monitor's own button row (near the power button) and the tower's own LED near its top
            edge - `marginTop: CABLE_TOWER_Y` places the box's top at the tower connection point,
            `height: CABLE_BOX_HEIGHT` stretches it down to the monitor connection point.
            `preserveAspectRatio="none"` + a normalized 0-100 viewBox height (rather than a fixed
            px one) let the box's real CSS height - itself a calc() tied to the same responsive
            SCREEN_HEIGHT/TOWER_HEIGHT everything else uses - stretch the path without needing a
            second parallel set of px constants. vectorEffect keeps the stroke width visually
            constant despite that non-uniform stretch. */}
        <svg
          width="90"
          style={{ alignSelf: 'flex-start', marginTop: CABLE_TOWER_Y, height: CABLE_BOX_HEIGHT }}
          viewBox="0 0 90 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,94 C 40,94 30,10 90,6"
            stroke="var(--ds-charcoal)"
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* TOWER - restyled after a real Corsair case photo: thin black rails (not the yellow
            bezel's chunky border) framing a wood-toned mesh front panel, rather than a flat
            yellow box with printed vent lines. Still at least half the monitor's own case-body
            height (TOWER_HEIGHT, unchanged) and noticeably thicker than the first pass. LED lives
            on a thin top rail (near the case's own top edge, where the cable's tower-side
            connection point targets), the power button on a thin bottom rail - both keep the
            exact same poweredOn-toggling behavior as before. */}
        <div className="flex flex-col items-center">
          <div
            className="border-black flex flex-col"
            style={{
              width: 210,
              height: TOWER_HEIGHT,
              borderWidth: 6,
              borderStyle: 'solid',
              borderRadius: '0.75rem',
              backgroundColor: 'var(--ds-charcoal)',
              padding: '10px 12px',
            }}
          >
            {/* Top rail - LED + a short vent slit standing in for the case's own top venting */}
            <div className="flex items-center justify-between" style={{ padding: '0 2px 8px' }}>
              <div
                aria-hidden="true"
                className={poweredOn ? 'animate-pulse' : ''}
                style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#fff', border: '2px solid var(--ds-charcoal)' }}
              />
              <div style={{ width: 26, height: 7, backgroundColor: '#0b0f0c', borderRadius: 2 }} />
            </div>

            {/* Wood-toned mesh front panel - a crosshatched repeating-linear-gradient pair (flat
                pattern, no smooth gradient, same convention as the screen's own scanlines) stands
                in for the reference photo's dense triangular perforation over a bamboo panel. */}
            <div
              className="relative border-2 border-black"
              style={{
                flex: 1,
                borderRadius: '0.4rem',
                backgroundColor: '#c9a875',
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(23,30,25,0.35) 0px, rgba(23,30,25,0.35) 2px, transparent 2px, transparent 9px), repeating-linear-gradient(-45deg, rgba(23,30,25,0.35) 0px, rgba(23,30,25,0.35) 2px, transparent 2px, transparent 9px)',
                overflow: 'hidden',
              }}
            />

            {/* Bottom rail - power button, toggles the exact same shared poweredOn state as the
                monitor's own power button. */}
            <div className="flex items-center justify-center" style={{ paddingTop: 10 }}>
              <button
                type="button"
                onClick={togglePower}
                aria-label={poweredOn ? 'Turn off' : 'Turn on'}
                data-cursor-label={poweredOn ? 'Power off' : 'Power on'}
                className="flex items-center justify-center border-black hover:opacity-80 transition-opacity"
                style={{ width: 40, height: 40, borderWidth: 4, borderStyle: 'solid', borderRadius: '999px', backgroundColor: '#0b0f0c', boxShadow: '3px 3px 0 0 rgba(23,30,25,0.4)' }}
              >
                <Power className="w-3.5 h-3.5" style={{ color: 'var(--ds-yellow)' }} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Feet - small dark tabs under the case, echoing the reference photo's own small feet
              at its base, rather than the case simply meeting the floor with a flat bottom edge. */}
          <div className="flex items-center justify-between" style={{ width: 210, padding: '0 20px' }}>
            <div style={{ width: 16, height: 5, backgroundColor: 'var(--ds-charcoal)', borderRadius: 2 }} />
            <div style={{ width: 16, height: 5, backgroundColor: 'var(--ds-charcoal)', borderRadius: 2 }} />
          </div>
        </div>
      </div>
    </div>
    </CrtScreenContext.Provider>
  );
}
