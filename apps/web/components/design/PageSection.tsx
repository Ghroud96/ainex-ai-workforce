import type { ReactNode } from "react";
import SectionHeader from "@/components/design/SectionHeader";
import { spacing } from "@/lib/design/spacing";

// Encodes the section-spacing rhythm from docs/design-system/05-spacing.md
// as a reusable wrapper, instead of every page hand-rolling its own
// <section> + margin combination. Optional title/description render a
// SectionHeader; omit both to use PageSection purely for spacing around
// custom content.
export default function PageSection({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={spacing.sectionGap}>
      {title && <SectionHeader title={title} description={description} actions={actions} />}
      {children}
    </section>
  );
}
