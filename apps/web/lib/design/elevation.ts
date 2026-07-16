// Elevation tokens for AINEX Design Language V2 (docs/design-system/06-components.md#cards).
// AINEX still sits flat by default — cards separate from the canvas via
// the warm-neutral/white contrast (lib/design/colors.ts) and a hairline
// border, not a shadow (Design Principle 1 — typography and spacing
// over decoration). `raised` is reserved for the one exception
// (modals/popovers/dropdowns lifting above the page): on a light canvas
// this is a soft, low-opacity shadow rather than V1's dark-canvas-tuned
// `shadow-black/30`. Never combine `raised` with a hairline border —
// pick one, per the design language's card rule.

export const elevation = {
  /** The default for cards and panels — no shadow. */
  flat: "",
  /** Modals, popovers, dropdown menus only. */
  raised: "shadow-xl shadow-slate-900/10",
} as const;
