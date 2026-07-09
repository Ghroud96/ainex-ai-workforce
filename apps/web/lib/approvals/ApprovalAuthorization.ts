import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";

// Every stage-decision action in this app authorizes with the same shape:
// a domain-specific role check, OR'd with the global demo-mode bypass (see
// CompanyModeStore.ts). Extracted so every future workflow's isAuthorized
// wires the bypass in consistently instead of repeating
// `check || CompanyModeStore.isDemoModeEnabled()` at each call site.
export function authorizedOrDemoMode(check: boolean): boolean {
  return check || CompanyModeStore.isDemoModeEnabled();
}
