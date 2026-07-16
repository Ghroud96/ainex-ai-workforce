// Color tokens for AINEX Design Language V2 — the Executive Workspace
// refresh (Visual Sprint 07A, docs/design-system/03-colors.md). Values
// are Tailwind utility-class fragments, not hex constants — this
// codebase styles exclusively with Tailwind utility classes (no
// CSS-in-JS, no styled-components), so a token here is only useful if a
// component can drop it straight into a className string.
//
// V2 direction: bright, warm-neutral canvas; white content surfaces;
// near-black text; blue accent reserved for primary actions, AI
// recommendations, and critical decision surfaces only (Design
// Principle 5 — "accent even more restrained"). `surface.canvas` is
// deliberately not pure white (Design Principle 4) — cards read as a
// crisp white raised against a warm neutral backdrop, not a
// border-heavy box on white-on-white.

export const surface = {
  /** The app background — set once in globals.css, components should not set this. Warm neutral, never pure white. */
  canvas: "bg-[#F8F9FB]",
  /** Default card/panel surface — crisp white, separated from canvas by warmth contrast, not a heavy border. */
  card: "bg-white",
  /** Modals, popovers, dropdowns — same white as `card`, lifted via `elevation.raised`'s shadow instead of a darker fill. */
  raised: "bg-white",
  /** A quiet inset area inside a card (e.g. a quoted AI recommendation block). */
  sunken: "bg-slate-50",
} as const;

export const border = {
  /** The only border weight in the system — see docs/design-system/03-colors.md. */
  hairline: "border-slate-200/70",
  /** Focus rings — the one place visibility outranks restraint. */
  focus: "border-blue-600",
} as const;

export const text = {
  primary: "text-slate-900",
  secondary: "text-slate-500",
  muted: "text-slate-400",
  /** For text placed directly on the canvas background rather than a card. */
  onCanvas: "text-slate-900",
} as const;

export const accent = {
  primaryText: "text-blue-700",
  primaryBg: "bg-blue-600",
  primaryBgHover: "hover:bg-blue-700",
  primaryRing: "focus-visible:ring-2 focus-visible:ring-blue-600",
  /** A quiet primary-tinted border — the one card type (Executive Decision Card) allowed to hint at the primary accent via its border. */
  primaryBorder: "border-blue-200",
  /** The quiet AI-content signature (docs/design-system/03-colors.md#secondary) — a border/icon tint only, never a fill. */
  secondaryText: "text-indigo-600",
  secondaryBorder: "border-indigo-200",
} as const;

export interface SemanticTone {
  text: string;
  bg: string;
  border: string;
}

export const semantic: Record<"success" | "warning" | "danger" | "info" | "neutral", SemanticTone> = {
  success: { text: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
  warning: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  danger: { text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  info: { text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  neutral: { text: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
} as const;
