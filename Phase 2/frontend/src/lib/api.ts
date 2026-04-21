import {
  CurrentStepResponse,
  ScenarioCatalogEntry,
  SessionSummaryResponse,
  StartSessionRequest,
  StartSessionResponse,
  SubmitActionRequest,
  SubmitActionResponse,
  SubmitReflectionRequest,
  SubmitReflectionResponse
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

/** Return the configured simulator API base URL used by the frontend. */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/** Point researchers to the backend Swagger UI that matches the current API host. */
export function getApiDocsUrl(): string {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "");
  return normalizedBaseUrl.endsWith("/api/v1")
    ? normalizedBaseUrl.replace(/\/api\/v1$/, "/docs")
    : `${normalizedBaseUrl}/docs`;
}

/** Load the config-driven scenario catalog shown on the launcher page. */
export async function listScenarios(): Promise<ScenarioCatalogEntry[]> {
  return request<ScenarioCatalogEntry[]>("/simulator/scenarios", {
    method: "GET"
  });
}

/** Start a new persisted simulator session, optionally targeting a specific scenario. */
export async function startSession(payload: StartSessionRequest = {}): Promise<StartSessionResponse> {
  return request<StartSessionResponse>("/simulator/sessions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/** Fetch the current step state that drives the live simulator UI. */
export async function getCurrentStep(sessionId: string): Promise<CurrentStepResponse> {
  return request<CurrentStepResponse>(`/simulator/sessions/${sessionId}/current-step`, {
    method: "GET"
  });
}

/** Persist a participant action against the current scenario step. */
export async function submitAction(
  sessionId: string,
  payload: SubmitActionRequest
): Promise<SubmitActionResponse> {
  return request<SubmitActionResponse>(`/simulator/sessions/${sessionId}/actions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/** Persist the post-decision reflection required by a scenario step. */
export async function submitReflection(
  sessionId: string,
  payload: SubmitReflectionRequest
): Promise<SubmitReflectionResponse> {
  return request<SubmitReflectionResponse>(`/simulator/sessions/${sessionId}/reflection`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/** Retrieve the full researcher-facing session summary after or during a run. */
export async function getSessionSummary(sessionId: string): Promise<SessionSummaryResponse> {
  return request<SessionSummaryResponse>(`/simulator/sessions/${sessionId}/summary`, {
    method: "GET"
  });
}

/** Shared fetch helper that keeps API errors readable in the UI. */
async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
}

/** Convert backend error payloads into a single user-friendly message string. */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
