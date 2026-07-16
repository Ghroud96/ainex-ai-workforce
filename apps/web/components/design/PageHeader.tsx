import type { ReactNode } from "react";
import { text } from "@/lib/design/colors";
import { layout } from "@/lib/design/layout";
import { spacing } from "@/lib/design/spacing";
import { type } from "@/lib/design/typography";

// The Design Language V1 successor to components/PageHeader.tsx — same
// job (page-level title + description), rebuilt on shared tokens with an
// optional trailing actions slot. Existing pages keep using the current
// PageHeader.tsx this sprint; this is the version future pages migrate
// to. See docs/design-system/06-components.md.
export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={`${spacing.sectionGap} flex flex-wrap items-start justify-between gap-4`}>
      <div>
        <h1 className={`${type.h1} ${text.onCanvas}`}>{title}</h1>
        {description && <p className={`mt-2 ${layout.readingMaxWidth} ${type.body} ${text.secondary}`}>{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
