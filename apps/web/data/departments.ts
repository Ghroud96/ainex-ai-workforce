export const departments = [
  "All Departments",
  "Executive",
  "Finance",
  "Sales",
  "HR",
  "Operations",
  "Warehouse",
  "Customer Support",
  "Marketing",
  "IT",
] as const;

export type DepartmentFilterValue = (typeof departments)[number];
export type Department = Exclude<DepartmentFilterValue, "All Departments">;
