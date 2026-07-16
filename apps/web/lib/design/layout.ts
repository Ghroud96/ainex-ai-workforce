// Layout tokens for AINEX Design Language V1 (docs/design-system/07-layout.md).

export const layout = {
  /** Matches components/Sidebar.tsx's current width. */
  sidebarWidth: "w-64",
  /** The target cap on content width — see docs/design-system/07-layout.md#content-width. Not yet applied to app/layout.tsx's <main>. */
  contentMaxWidth: "max-w-7xl",
  /** The target cap on prose/reading content — matches PageHeader.tsx's existing description width. */
  readingMaxWidth: "max-w-3xl",
  /** Matches app/layout.tsx's current <main> padding. */
  pagePadding: "p-10",
} as const;
