export type WorkerResponseStatus = "success" | "unsupported" | "error";

export interface WorkerResponse {
  workerId: string;
  capabilityId?: string;
  content: string;
  status: WorkerResponseStatus;
  generatedAt: string;
}

export function createMockResponse(
  workerId: string,
  capabilityId: string | undefined,
  content: string,
  status: WorkerResponseStatus = "success",
): WorkerResponse {
  return {
    workerId,
    capabilityId,
    content,
    status,
    generatedAt: new Date().toISOString(),
  };
}
