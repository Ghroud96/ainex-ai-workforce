export const categories = [
  "Policies",
  "SOP",
  "Finance",
  "Sales",
  "HR",
  "Operations",
  "Legal",
  "Contracts",
  "Inventory",
  "Training",
  "Marketing",
  "Customer Service",
  "Engineering",
  "Administration",
] as const;

export type Category = (typeof categories)[number];
