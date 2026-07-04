export type ProviderHealthStatus = "Online" | "Offline" | "Degraded" | "Maintenance";

export interface ProviderHealthReport {
  providerId: string;
  status: ProviderHealthStatus;
  checkedAt: string;
  notes: string;
}

export function createHealthReport(
  providerId: string,
  status: ProviderHealthStatus,
  notes: string,
): ProviderHealthReport {
  return {
    providerId,
    status,
    checkedAt: new Date().toISOString(),
    notes,
  };
}
