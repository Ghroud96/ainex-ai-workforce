import type { ButtonHTMLAttributes } from "react";
import { accent, border, text } from "@/lib/design/colors";
import { radius } from "@/lib/design/radius";
import { transition } from "@/lib/design/motion";

export type ActionButtonVariant = "primary" | "secondary" | "destructive";

const VARIANT_CLASSES: Record<ActionButtonVariant, string> = {
  // Exactly one Primary per screen/section — the one action that matters.
  primary: `${accent.primaryBg} ${accent.primaryBgHover} text-white`,
  // Low visual weight — anything that isn't the recommended action.
  secondary: `bg-white border ${border.hairline} ${text.primary} hover:bg-slate-50`,
  // Text-only/outline, never a loud filled red — deliberate, not alarming.
  destructive: "bg-white border border-red-200 text-red-700 hover:bg-red-50",
};

// The one button primitive — consolidates the primary/secondary/
// destructive className combinations repeated across every form action
// in the app today. Presentational only: works as a plain button, a
// form's type="submit" control, or wrapped in a Link — it never imports
// a specific Server Action, keeping it page-agnostic. See
// docs/design-system/06-components.md#buttons.
export default function ActionButton({
  variant = "secondary",
  className = "",
  children,
  ...buttonProps
}: {
  variant?: ActionButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...buttonProps}
      className={`${radius.control} px-4 py-2 text-sm font-medium ${transition.colors} disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
