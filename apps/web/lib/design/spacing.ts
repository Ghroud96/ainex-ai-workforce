// Spacing tokens for AINEX Design Language V2 (docs/design-system/05-spacing.md).
// Tailwind's default spacing scale is already 4px-based (1 unit = 4px),
// so the design language's scale maps directly onto Tailwind's numeric
// utilities — these tokens just name the semantic *use* of a value
// rather than inventing new raw numbers.
//
// V2 bumps card padding and section gaps up from V1 — Design Principle 4
// ("white space communicates structure") calls for more room to breathe,
// not a restructure of the scale itself.

export const spacing = {
  /** Icon-to-label gap, tight inline spacing inside a tag/badge. */
  tight: "gap-1",
  /** Gap between a label and its value. */
  compact: "gap-2",
  /** Gap between related inline elements (a row of badges). */
  inline: "gap-3",

  /** Default card internal padding. */
  cardPadding: "p-8",
  /** Dense-context card padding — never below this. */
  cardPaddingCompact: "p-5",
  /** Gap between cards in the same list. */
  cardGap: "gap-6",
  /** Gap between a section's header and its content. */
  sectionContentGap: "mt-10",
  /** Gap between one section and the next. */
  sectionGap: "mb-16",
  /** Page outer margin on wide viewports. */
  pageMargin: "p-12",
} as const;
