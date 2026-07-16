// Border radius tokens for AINEX Design Language V1. Values match the
// radii already in use throughout the app — one consistent radius per
// element type, never mixed on the same screen.

export const radius = {
  /** Cards, panels, modals. */
  card: "rounded-xl",
  /** Buttons, inputs, small controls. */
  control: "rounded-lg",
  /** Badges, pills — the only place a full pill radius is used. */
  pill: "rounded-full",
} as const;
