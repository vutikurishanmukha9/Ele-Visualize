import { mkdir, readFile, writeFile, rename } from 'fs/promises';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

export interface VisualizeSession {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    selectedElement: number | null;
    selectedMolecule: string | null;
    workspaceMode: string;
    compareElements: number[];
    builderAtoms: unknown[];
    builderBonds: unknown[];
    notes: string;
    tags: string[];
}

type SessionInput = Partial<Omit<VisualizeSession, 'id' | 'createdAt' | 'updatedAt'>>;

const DATA_FILE = process.env.SESSIONS_FILE || join(process.cwd(), 'data', 'sessions.json');

async function ensureDataFile() {
    await mkdir(dirname(DATA_FILE), { recursive: true });
    try {
        await readFile(DATA_FILE, 'utf8');
    } catch {
        await writeFile(DATA_FILE, '[]', 'utf8');
    }
}

async function readSessions(): Promise<VisualizeSession[]> {
    await ensureDataFile();
    try {
        const raw = await readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as VisualizeSession[]) : [];
    } catch (e) {
        console.error('[SessionService] Failed to parse sessions JSON, returning empty list:', e);
        return [];
    }
}

/**
 * Atomic write to disk using temp file + atomic rename
 * Prevents file corruption during crashes or abrupt process termination.
 */
async function writeSessions(sessions: VisualizeSession[]) {
    await ensureDataFile();
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
    const payload = JSON.stringify(sessions, null, 2);
    await writeFile(tempFile, payload, 'utf8');
    await rename(tempFile, DATA_FILE);
}

function sanitizeString(val: unknown, maxLen = 500): string {
    if (typeof val !== 'string') return '';
    return val.slice(0, maxLen).trim();
}

function normalizeSession(input: SessionInput, existing?: VisualizeSession): VisualizeSession {
    const now = new Date().toISOString();
    return {
        id: existing?.id || randomUUID(),
        title: sanitizeString(input.title, 120) || existing?.title || 'Untitled exploration',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        selectedElement: typeof input.selectedElement === 'number' ? input.selectedElement : (existing?.selectedElement ?? null),
        selectedMolecule: typeof input.selectedMolecule === 'string' ? sanitizeString(input.selectedMolecule, 80) : (existing?.selectedMolecule ?? null),
        workspaceMode: sanitizeString(input.workspaceMode, 40) || existing?.workspaceMode || 'explore',
        compareElements: Array.isArray(input.compareElements)
            ? input.compareElements.filter((n): n is number => typeof n === 'number').slice(0, 10)
            : (existing?.compareElements || []),
        builderAtoms: Array.isArray(input.builderAtoms) ? input.builderAtoms.slice(0, 100) : (existing?.builderAtoms || []),
        builderBonds: Array.isArray(input.builderBonds) ? input.builderBonds.slice(0, 200) : (existing?.builderBonds || []),
        notes: sanitizeString(input.notes, 5000) || (existing?.notes ?? ''),
        tags: Array.isArray(input.tags)
            ? input.tags.map(t => sanitizeString(t, 30)).filter(Boolean).slice(0, 20)
            : (existing?.tags || []),
    };
}

export async function listSessions() {
    const sessions = await readSessions();
    return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSession(id: string) {
    const sessions = await readSessions();
    return sessions.find(session => session.id === id) || null;
}

export async function createSession(input: SessionInput) {
    const sessions = await readSessions();
    const session = normalizeSession(input);
    sessions.push(session);
    await writeSessions(sessions);
    return session;
}

export async function updateSession(id: string, input: SessionInput) {
    const sessions = await readSessions();
    const index = sessions.findIndex(session => session.id === id);
    if (index === -1) return null;

    const session = normalizeSession(input, sessions[index]);
    sessions[index] = session;
    await writeSessions(sessions);
    return session;
}

export async function deleteSession(id: string) {
    const sessions = await readSessions();
    const nextSessions = sessions.filter(session => session.id !== id);
    if (nextSessions.length === sessions.length) return false;
    await writeSessions(nextSessions);
    return true;
}
