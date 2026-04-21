const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const BACKEND_SESSION_ID_KEY = 'prototype-backend-session-id';
const BACKEND_SYNC_STATE_KEY = 'prototype-backend-sync-state';

export interface PrototypeSessionCreatePayload {
  professional_role: string;
  simulation_mode: 'training' | 'testing';
  metadata?: Record<string, unknown>;
}

export interface PrototypeSessionCreateResponse {
  session_id: string;
  scenario_id: string;
  status: string;
  professional_role: string;
  simulation_mode: string;
}

export interface PrototypeSessionStateResponse {
  session_id: string;
  scenario_id: string;
  status: string;
  current_route: string;
  professional_role: string;
  simulation_mode: string;
  conversation_turn: number;
  show_context_dashboard: boolean;
  current_step_id?: string | null;
  synced_at?: string | null;
  completed_at?: string | null;
  snapshot: {
    messages?: PrototypeChatMessagePayload[];
    data_snapshot?: Record<string, unknown>;
    task_completed?: boolean;
  };
}

export interface PrototypeChatMessagePayload {
  id: string;
  sender: 'agent' | 'user';
  content: string;
  timestamp: string;
  isHallucination?: boolean;
  isDrift?: boolean;
  isVague?: boolean;
}

export interface PrototypeSessionSyncPayload {
  current_route: string;
  professional_role: string;
  task_completed: boolean;
  conversation_turn: number;
  show_context_dashboard: boolean;
  messages: PrototypeChatMessagePayload[];
  data_snapshot: Record<string, unknown>;
}

export function buildPrototypeSyncPayload({
  currentRoute,
  professionalRole,
  taskCompleted,
  conversationTurn,
  showContextDashboard,
  messages,
  dataSnapshot,
}: {
  currentRoute: string;
  professionalRole: string;
  taskCompleted: boolean;
  conversationTurn: number;
  showContextDashboard: boolean;
  messages: Array<{
    id: string;
    sender: 'agent' | 'user';
    content: string;
    timestamp: Date;
    isHallucination?: boolean;
    isDrift?: boolean;
    isVague?: boolean;
  }>;
  dataSnapshot: Record<string, unknown>;
}): PrototypeSessionSyncPayload {
  return {
    current_route: currentRoute,
    professional_role: professionalRole,
    task_completed: taskCompleted,
    conversation_turn: conversationTurn,
    show_context_dashboard: showContextDashboard,
    messages: messages.map((message) => ({
      id: message.id,
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      isHallucination: message.isHallucination,
      isDrift: message.isDrift,
      isVague: message.isVague,
    })),
    data_snapshot: JSON.parse(JSON.stringify(dataSnapshot)),
  };
}

export async function createPrototypeBackendSession(
  payload: PrototypeSessionCreatePayload
): Promise<PrototypeSessionCreateResponse> {
  return request<PrototypeSessionCreateResponse>('/prototype/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function syncPrototypeBackendSession(
  sessionId: string,
  payload: PrototypeSessionSyncPayload
): Promise<void> {
  await request(`/prototype/sessions/${sessionId}/state`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getPrototypeBackendSessionState(
  sessionId: string
): Promise<PrototypeSessionStateResponse> {
  return request<PrototypeSessionStateResponse>(`/prototype/sessions/${sessionId}/state`, {
    method: 'GET',
  });
}

export function storePrototypeBackendSessionId(sessionId: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(BACKEND_SESSION_ID_KEY, sessionId);
}

export function getStoredPrototypeBackendSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(BACKEND_SESSION_ID_KEY);
}

export function storePrototypeSyncState(payload: PrototypeSessionSyncPayload) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(BACKEND_SYNC_STATE_KEY, JSON.stringify(payload));
}

export function getStoredPrototypeSyncState(): PrototypeSessionSyncPayload | null {
  if (typeof window === 'undefined') return null;
  const rawValue = window.sessionStorage.getItem(BACKEND_SYNC_STATE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PrototypeSessionSyncPayload;
  } catch {
    return null;
  }
}

export function clearStoredPrototypeBackendSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(BACKEND_SESSION_ID_KEY);
  window.sessionStorage.removeItem(BACKEND_SYNC_STATE_KEY);
}

async function request<T = unknown>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
