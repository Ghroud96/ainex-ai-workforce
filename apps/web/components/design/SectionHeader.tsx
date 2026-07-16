import type { ReactNode } from "react";
import { text } from "@/lib/design/colors";
import { type } from "@/lib/design/typography";

// The Design Language V1 successor to components/SectionTitle.tsx — same
// job (section-level title + description), rebuilt on shared tokens with
// an optional trailing actions slot. Existing pages keep using the
// current SectionTitle.tsx this sprint. See
// docs/design-system/06-components.md.
export default function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className={`${type.h2} ${text.onCanvas}`}>{title}</h2>
        {description && <p className={`mt-1 ${type.body} ${text.secondary}`}>{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
