import type { ReactNode } from "react";
import { text } from "@/lib/design/colors";
import { type } from "@/lib/design/typography";

// Per docs/design-system/06-components.md#empty-states: no illustrations,
// no jokey copy. A short, plainly worded memo — what's missing, and what
// to do about it — at Body weight.
export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-6">
      <p className={`${type.body} font-medium ${text.secondary}`}>{title}</p>
      {description && <p className={`mt-1 ${type.body} ${text.muted}`}>{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
