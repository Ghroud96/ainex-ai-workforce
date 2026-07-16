// Typography tokens for AINEX Design Language V2 (docs/design-system/04-typography.md).
// A six-level scale — Display, H1, H2, H3, Body, Caption — each mapped to
// a single Tailwind class string a primitive composes directly.
// Reviewed for Visual Sprint 07A (Design Principle 1 — "typography
// matters more than color") and kept as-is: the weight/tracking here
// already carries hierarchy without leaning on color or decoration, on
// both the V1 dark canvas and the V2 light one.

export const type = {
  /** At most one per screen — the single most important figure or statement. */
  display: "text-4xl font-semibold tracking-tight sm:text-5xl",
  /** Page-level title. One per page. */
  h1: "text-3xl font-semibold tracking-tight",
  /** Section titles. */
  h2: "text-xl font-semibold",
  /** Card / subsection titles. */
  h3: "text-base font-semibold",
  /** The default reading size — generous line height for comfortable scanning. */
  body: "text-sm leading-relaxed",
  /** Metadata, timestamps, tag/badge labels. Always paired with a muted text color. */
  caption: "text-xs font-medium",
  /** Caption variant for section eyebrows — matches the `text-xs font-medium tracking-wide uppercase` pattern already repeated across the app. */
  eyebrow: "text-xs font-medium tracking-wide uppercase",
} as const;

/** Tabular (fixed-width) numerals for currency and KPI figures — see docs/design-system/04-typography.md#numeric-figures. */
export const numeric = "tabular-nums";
