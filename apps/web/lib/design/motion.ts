// Motion tokens for AINEX Design Language V1 (docs/design-system/08-motion.md).
// Short durations, ease-out on enter / ease-in on exit, no bounce or
// spring easing anywhere in the system — motion explains a state change,
// it never performs.

export const duration = {
  fast: "duration-150",
  base: "duration-200",
} as const;

export const easing = {
  enter: "ease-out",
  exit: "ease-in",
} as const;

export const transition = {
  /** Hover/active color changes — the most common transition in the app. */
  colors: "transition-colors duration-150 ease-out",
  /** Expandable open/close, height or opacity reveals. */
  reveal: "transition-all duration-200 ease-out",
  /** Icon rotation (e.g. an expandable's chevron). */
  transform: "transition-transform duration-150 ease-out",
} as const;
