// Radial Reveal Button — Originkit
// Using component defaults.

"use client";

import * as React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  useAnimate,
  useReducedMotion,
  type AnimationPlaybackControls,
  type Transition,
} from "framer-motion";

/** Rounded is a percent of the MAXIMUM possible radius — half the short side —
 *  so 100 is a true pill at any button size and 0 is a square corner. A CSS
 *  percentage border-radius is not the same thing: it resolves per axis and
 *  gives an ellipse, so a wide button would bulge instead of forming a stadium.
 *  Hence the measured conversion. */
const radiusFromPercent = (w: number, h: number, pct: number) =>
  (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100);

export type IconConfig = {
  type?: "symbol" | "image" | "node";
  symbol?: string;
  image?: string | { src?: string; srcSet?: string; alt?: string };
  // Not in the original Originkit component (symbol/image only) - lets a caller drop in a real
  // icon component (e.g. a lucide-react icon) instead of an emoji/text glyph or an image URL,
  // for sites whose visual language doesn't want emoji. Sized/colored the same way the symbol
  // is: the wrapping span carries `color`, so any icon using currentColor (lucide's default)
  // picks up iconColor/iconHoverColor automatically.
  node?: React.ReactNode;
  color?: string;
  hoverColor?: string;
  size?: number;
  padding?: number;
  rounded?: number;
  side?: "left" | "right";
};

type HoverConfig = {
  fill?: string;
  textColor?: string;
};

/** The four colours, batched into one modal under Font. Top-level `fill` /
 *  `textColor` and a `hover` group were the previous shape; both are still read
 *  as fallbacks so an existing instance keeps its values. */
type Colors = {
  fill?: string;
  textColor?: string;
  hoverFill?: string;
  hoverTextColor?: string;
};

type BorderConfig = {
  borderWidth?: number;
  borderTopWidth?: number;
  borderRightWidth?: number;
  borderBottomWidth?: number;
  borderLeftWidth?: number;
  borderStyle?: string;
  borderColor?: string;
};

type Props = {
  label?: string;
  font?: React.CSSProperties;
  showText?: boolean;
  padding?: string;
  rounded?: number;
  fill?: string;
  textColor?: string;
  colors?: Colors;
  addIcon?: boolean;
  icon?: IconConfig;
  gap?: number;
  border?: BorderConfig;
  hover?: HoverConfig;
  link?: string;
  transition?: Transition;
  newTab?: boolean;
  style?: React.CSSProperties;
  // Not part of the original Originkit component (link-only) - added so this can also drive a
  // plain action (e.g. opening a modal) instead of only ever navigating.
  onClick?: React.MouseEventHandler;
  // Also not in the original - lets a caller set data-*/aria-* attributes it doesn't otherwise
  // expose (e.g. this site's data-cursor-label convention for the custom cursor).
  "data-cursor-label"?: string;
};

/** The overlay sits on the PADDING box, so its corners have to be the
 *  border's INNER radius — every side read on its own. */
type BandWidths = { top: number; right: number; bottom: number; left: number };

const num = (v: any) => {
  const parsed = parseFloat(String(v ?? ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const bandWidthsOf = (b: BorderConfig | undefined): BandWidths => {
  const fused = num(b?.borderWidth);
  return {
    top: b?.borderTopWidth !== undefined ? num(b.borderTopWidth) : fused,
    right: b?.borderRightWidth !== undefined ? num(b.borderRightWidth) : fused,
    bottom:
      b?.borderBottomWidth !== undefined ? num(b.borderBottomWidth) : fused,
    left: b?.borderLeftWidth !== undefined ? num(b.borderLeftWidth) : fused,
  };
};

/** The radius of the hole the border leaves. Each corner shrinks by the width
 *  of the two sides meeting there — horizontally by one, vertically by the
 *  other — which is exactly how the browser derives a border's inner edge. */
const innerRadiusOf = (radius: number, b: BandWidths): string => {
  const inset = (v: number) => `${Math.max(0, radius - v)}px`;
  return (
    `${inset(b.left)} ${inset(b.right)} ${inset(b.right)} ${inset(b.left)}` +
    ` / ${inset(b.top)} ${inset(b.top)} ${inset(b.bottom)} ${inset(b.bottom)}`
  );
};

const DEFAULT_TRANSITION: Transition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.45,
};

// The overlay must be clipped before the first paint, or the hover fill flashes
// at full size for one frame on mount.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const DEFAULT_FONT: React.CSSProperties = {
  fontFamily: "Inter",
  fontWeight: 500,
  fontSize: 40,
  lineHeight: "1.5em",
  letterSpacing: "0em",
  textAlign: "left",
};

const DEFAULT_COLORS: Colors = {
  fill: "#000000",
  hoverFill: "#008E8E",
  textColor: "#FFFFFF",
  hoverTextColor: "#FFFFFF",
};

const DEFAULT_ICON: IconConfig = {
  type: "symbol",
  symbol: "→",
  image: "",
  color: "#FFFFFF",
  hoverColor: "#000000",
  size: 24,
  padding: 0,
  rounded: 0,
  side: "left",
};

const DEFAULT_BORDER: BorderConfig = {
  borderWidth: 2,
  borderStyle: "solid",
  borderColor: "#008E8E",
};

export default function RadialRevealButton({
  label = "RADIAL REVEAL",
  font = DEFAULT_FONT,
  showText = true,
  padding = "40px 64px 40px 64px",
  rounded = 100,
  fill: fillProp,
  textColor: textColorProp,
  colors = DEFAULT_COLORS,
  addIcon = false,
  icon = DEFAULT_ICON,
  gap = 12,
  border = DEFAULT_BORDER,
  hover = {},
  link = "",
  transition = DEFAULT_TRANSITION,
  newTab = true,
  style,
  onClick,
  "data-cursor-label": dataCursorLabel,
}: Props) {
  // Top-level Fill / Text Color win; the old `Colors` group is the fallback so
  // an instance built before the split keeps rendering what it rendered.
  const fill = colors?.fill ?? fillProp ?? "#000000";
  const textColor = colors?.textColor ?? textColorProp ?? "#FFFFFF";
  const {
    fill: hoverFill = colors?.hoverFill ?? "#FFFFFF",
    textColor: hoverTextColor = colors?.hoverTextColor ?? "#000000",
  } = hover;

  const [scope, animate] = useAnimate();

  // Rounded is a percent, so the px radius can only come from the measured
  // box.
  const [radiusBox, setRadiusBox] = useState({ w: 0, h: 0 });
  useIsoLayoutEffect(() => {
    const el = scope.current as HTMLElement | null;
    if (!el) return;
    const read = () =>
      setRadiusBox((prev) =>
        prev.w === el.offsetWidth && prev.h === el.offsetHeight
          ? prev
          : { w: el.offsetWidth, h: el.offsetHeight }
      );
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scope]);
  const radiusPx = radiusFromPercent(radiusBox.w, radiusBox.h, rounded);
  const overlayRef = useRef<HTMLSpanElement>(null);
  const clipCtrl = useRef<AnimationPlaybackControls | null>(null);
  const reducedMotion = useReducedMotion();

  // r = current clip radius in %, (x,y) = its origin in %, max = the radius
  // that fully covers the button from that origin.
  const clip = useRef({ r: 0, x: 100, y: 100, max: 160 });

  const fontStyles = (font ?? {}) as React.CSSProperties;
  const band = bandWidthsOf(border);

  const applyClip = () => {
    const el = overlayRef.current;
    if (!el) return;
    const { r, x, y } = clip.current;
    const value = `circle(${r}% at ${x}% ${y}%)`;
    el.style.clipPath = value;
    (el.style as any).webkitClipPath = value;
  };

  /** Re-anchor the reveal on the pointer and work out how far it must grow to
   *  cover every corner from there. A `circle()` percentage resolves against
   *  √(w²+h²)/√2, so the corner distance has to be converted into that unit. */
  const anchorTo = (e: React.PointerEvent) => {
    const el = overlayRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const unit = Math.hypot(r.width, r.height) / Math.SQRT2;
    const far = Math.max(
      Math.hypot(px, py),
      Math.hypot(r.width - px, py),
      Math.hypot(px, r.height - py),
      Math.hypot(r.width - px, r.height - py)
    );
    clip.current.x = (px / r.width) * 100;
    clip.current.y = (py / r.height) * 100;
    clip.current.max = (far / unit) * 100 + 2; // 2% so AA never leaves a seam
  };

  const growTo = (to: number) => {
    clipCtrl.current?.stop();
    if (reducedMotion) {
      clip.current.r = to;
      applyClip();
      return;
    }
    clipCtrl.current = animate(clip.current.r, to, {
      ...(transition as any),
      onUpdate: (v: number) => {
        clip.current.r = v;
        applyClip();
      },
    });
  };

  const onEnter = (e: React.PointerEvent) => {
    anchorTo(e);
    applyClip(); // move the origin before growing, not during
    growTo(clip.current.max);
  };

  const onLeave = (e: React.PointerEvent) => {
    // Retract toward the exit point, but only re-anchor while the overlay
    // still covers everything — moving the origin mid-reveal would tear a
    // hole in a partially-grown circle.
    if (clip.current.r >= clip.current.max - 0.5) {
      anchorTo(e);
      clip.current.r = clip.current.max;
      applyClip();
    }
    growTo(0);
  };

  useIsoLayoutEffect(() => {
    applyClip();
    return () => clipCtrl.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Tag: any = link ? "a" : "button";
  const tagProps = {
    // With the text hidden the button has no accessible name — the icon is
    // decorative — so Label keeps working as one.
    "aria-label": showText ? undefined : label || undefined,
    "data-cursor-label": dataCursorLabel,
    onClick,
    ...(link
      ? {
          href: link,
          target: newTab ? "_blank" : undefined,
          rel: newTab ? "noopener noreferrer" : undefined,
        }
      : { type: "button" }),
  };

  // ---- icon -----------------------------------------------------------
  const {
    type: iconKind = "symbol",
    symbol: iconSymbol = "→",
    image,
    node: iconNode,
    color: iconColor = "#FFFFFF",
    hoverColor: iconHoverColor = "#000000",
    side: iconSide = "left",
    size: iconSize = 24,
    padding: iconPaddingProp = 0,
    rounded: iconRounded = 0,
  } = icon;
  const iconSrc =
    typeof image === "string" ? image : image && image.src ? image.src : "";
  // Image/node mode falls back to the symbol until something's actually provided, otherwise
  // flipping the switch empties the slot and reads as broken.
  const iconMode =
    iconKind === "image" && iconSrc ? "image" : iconKind === "node" && iconNode ? "node" : "symbol";
  const iconPx = Math.max(1, Math.round(iconSize));
  // Icon Padding is applied as a MARGIN, not padding: the image
  // carries its own border-radius, and padding would round the empty
  // box around the picture instead of the picture.
  const iconPadPx = Math.max(0, Math.round(iconPaddingProp));
  // Percent of the maximum radius (half the square icon box): 100 = a
  // circle, 0 = a square corner.
  const iconRadius = radiusFromPercent(iconPx, iconPx, iconRounded);
  const gapPx = Math.max(0, Math.round(gap));
  const hasIcon = addIcon;

  const faceStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    // Gap only means something with two children.
    gap: hasIcon && showText ? gapPx : 0,
    // Icon stays FIRST in the DOM and flips visually, so the label keeps
    // reading first for assistive tech either way.
    flexDirection: iconSide === "right" ? "row-reverse" : "row",
  };

  /** BOTH faces render this — the resting one sizes the button and the hover
   *  overlay must match it exactly, or the clip circle reveals text that sits
   *  a few pixels off and the wipe reads as a tear. */
  const content = (isHoverFace: boolean) => (
    <>
      {hasIcon &&
        (iconMode === "image" ? (
          <img
            src={iconSrc}
            alt=""
            aria-hidden
            draggable={false}
            style={{
              width: iconPx,
              height: iconPx,
              margin: iconPadPx,
              // `contain` letterboxes, so a rounded corner would
              // clip empty space instead of the image.
              objectFit: iconRadius > 0 ? "cover" : "contain",
              borderRadius: Math.min(iconRadius, iconPx / 2),
              display: "block",
              flex: "none", // never let a wide icon squash the label
              pointerEvents: "none",
            }}
          />
        ) : iconMode === "node" ? (
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              margin: iconPadPx,
              lineHeight: 0,
              // The icon itself (e.g. a lucide-react component) is expected to stroke/fill with
              // currentColor, same as the symbol span below - each face still carries its own
              // colour, so nothing is animated, the reveal just swaps one whole face for another.
              color: isHoverFace ? iconHoverColor : iconColor,
              flex: "none",
              pointerEvents: "none",
            }}
          >
            {iconNode}
          </span>
        ) : (
          <span
            aria-hidden
            style={{
              fontSize: iconPx,
              margin: iconPadPx,
              lineHeight: 1,
              // Each face carries its own colour — the reveal swaps
              // one whole face for another, so nothing is animated.
              color: isHoverFace ? iconHoverColor : iconColor,
              flex: "none",
              pointerEvents: "none",
            }}
          >
            {iconSymbol}
          </span>
        ))}
      {showText && <span>{label}</span>}
    </>
  );

  return (
    <Tag
      {...tagProps}
      ref={scope}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radiusPx,
        borderWidth: border?.borderWidth,
        borderStyle: border?.borderStyle,
        borderColor: border?.borderColor,
        backgroundColor: fill,
        textDecoration: "none",
        cursor: "pointer",
        overflow: "hidden",
        boxSizing: "border-box",
        userSelect: "none",
        ...fontStyles,
        ...style,
      }}
    >
      {/* resting face — also the element that sizes the button */}
      <span style={{ ...faceStyle, color: textColor }}>{content(false)}</span>

      {/* hover face — same box, revealed by a clip circle grown from the
          point the pointer entered */}
      <span
        ref={overlayRef}
        aria-hidden
        style={{
          ...faceStyle,
          position: "absolute",
          inset: 0,
          backgroundColor: hoverFill,
          color: hoverTextColor,
          pointerEvents: "none",
          // No `will-change: clip-path`. It promoted this element for
          // the whole session, and a promoted child inside a rounded
          // `overflow: hidden` is the case where the clip stops being
          // reliable and a square corner escapes. The clip-path tween
          // promotes it for its own duration anyway.
          //
          // A second boundary behind the root's overflow: even if that
          // clip is skipped, the hover fill still has the button's own
          // corners. It must be the border's INNER radius, not the
          // outer one — `inherit` gave this box, which is already inset
          // by the border, the full outer curve, so its corners pulled
          // away from the hole and leaked a crescent of resting fill at
          // all four corners, widening with the border.
          borderRadius: innerRadiusOf(radiusPx, band),
          clipPath: "circle(0% at 100% 100%)",
          WebkitClipPath: "circle(0% at 100% 100%)",
        }}
      >
        {content(true)}
      </span>
    </Tag>
  );
}
