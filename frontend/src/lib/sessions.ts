import type { SavedSession, WorkspaceMode } from '@/store/useAppStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SessionPayload {
    title?: string;
    selectedElement?: number | null;
    selectedMolecule?: string | null;
    workspaceMode?: WorkspaceMode | string;
    compareElements?: number[];
    builderAtoms?: unknown[];
    builderBonds?: unknown[];
    notes?: string;
    tags?: string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
        ...init,
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
}

export const sessionApi = {
    list: () => request<SavedSession[]>('/api/sessions'),
    get: (id: string) => request<SavedSession>(`/api/sessions/${id}`),
    create: (payload: SessionPayload) => request<SavedSession>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    update: (id: string, payload: SessionPayload) => request<SavedSession>(`/api/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    }),
    delete: (id: string) => request<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
};
