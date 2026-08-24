import type { SavedSession, WorkspaceMode } from '@/store/useAppStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const LOCAL_STORAGE_KEY = 'ele_local_sessions';
const REQUEST_TIMEOUT_MS = 3500;

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

// -------------------------------------------------------------
// Offline Local-First Fallback Layer
// -------------------------------------------------------------
function getLocalSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSession[]) : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: SavedSession[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore storage quota errors
  }
}

function createLocalSession(payload: SessionPayload): SavedSession {
  const now = new Date().toISOString();
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: payload.title?.trim() || 'Untitled exploration',
    createdAt: now,
    updatedAt: now,
    selectedElement: payload.selectedElement ?? null,
    selectedMolecule: payload.selectedMolecule ?? null,
    workspaceMode: (payload.workspaceMode as WorkspaceMode) || 'explore',
    compareElements: payload.compareElements || [],
    builderAtoms: payload.builderAtoms || [],
    builderBonds: payload.builderBonds || [],
    notes: payload.notes || '',
    tags: payload.tags || [],
  };
}

// -------------------------------------------------------------
// Resilient Network Client with Timeouts
// -------------------------------------------------------------
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      ...init,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// -------------------------------------------------------------
// Production Session API (Remote API + Local-First Fallback)
// -------------------------------------------------------------
export const sessionApi = {
  async list(): Promise<SavedSession[]> {
    try {
      const remote = await request<SavedSession[]>('/api/sessions');
      // Merge with local sessions for full redundancy
      const local = getLocalSessions();
      const ids = new Set(remote.map((s) => s.id));
      const combined = [...remote, ...local.filter((l) => !ids.has(l.id))];
      return combined.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      return getLocalSessions().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
  },

  async get(id: string): Promise<SavedSession | null> {
    try {
      return await request<SavedSession>(`/api/sessions/${id}`);
    } catch {
      return getLocalSessions().find((s) => s.id === id) || null;
    }
  },

  async create(payload: SessionPayload): Promise<SavedSession> {
    try {
      const created = await request<SavedSession>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      // Mirror in local storage
      const local = getLocalSessions();
      saveLocalSessions([created, ...local]);
      return created;
    } catch {
      // Create locally when backend is offline
      const localSession = createLocalSession(payload);
      const local = getLocalSessions();
      saveLocalSessions([localSession, ...local]);
      return localSession;
    }
  },

  async update(id: string, payload: SessionPayload): Promise<SavedSession> {
    try {
      const updated = await request<SavedSession>(`/api/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const local = getLocalSessions().map((s) => (s.id === id ? updated : s));
      saveLocalSessions(local);
      return updated;
    } catch {
      const local = getLocalSessions();
      const existing = local.find((s) => s.id === id);
      const updated: SavedSession = {
        id,
        title: payload.title?.trim() || existing?.title || 'Untitled exploration',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        selectedElement: payload.selectedElement ?? existing?.selectedElement ?? null,
        selectedMolecule: payload.selectedMolecule ?? existing?.selectedMolecule ?? null,
        workspaceMode: (payload.workspaceMode as WorkspaceMode) || existing?.workspaceMode || 'explore',
        compareElements: payload.compareElements || existing?.compareElements || [],
        builderAtoms: payload.builderAtoms || existing?.builderAtoms || [],
        builderBonds: payload.builderBonds || existing?.builderBonds || [],
        notes: payload.notes ?? existing?.notes ?? '',
        tags: payload.tags || existing?.tags || [],
      };
      saveLocalSessions(local.map((s) => (s.id === id ? updated : s)));
      return updated;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await request<void>(`/api/sessions/${id}`, { method: 'DELETE' });
    } catch {
      // Continue to remove locally even if remote request fails
    }
    const filtered = getLocalSessions().filter((s) => s.id !== id);
    saveLocalSessions(filtered);
  },
};
