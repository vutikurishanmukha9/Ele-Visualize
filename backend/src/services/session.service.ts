import { mkdir, readFile, writeFile } from 'fs/promises';
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
    const raw = await readFile(DATA_FILE, 'utf8');
    try {
        return JSON.parse(raw) as VisualizeSession[];
    } catch {
        return [];
    }
}

async function writeSessions(sessions: VisualizeSession[]) {
    await ensureDataFile();
    await writeFile(DATA_FILE, JSON.stringify(sessions, null, 2), 'utf8');
}

function normalizeSession(input: SessionInput, existing?: VisualizeSession): VisualizeSession {
    const now = new Date().toISOString();
    return {
        id: existing?.id || randomUUID(),
        title: input.title?.trim() || existing?.title || 'Untitled exploration',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        selectedElement: input.selectedElement ?? existing?.selectedElement ?? null,
        selectedMolecule: input.selectedMolecule ?? existing?.selectedMolecule ?? null,
        workspaceMode: input.workspaceMode || existing?.workspaceMode || 'explore',
        compareElements: input.compareElements || existing?.compareElements || [],
        builderAtoms: input.builderAtoms || existing?.builderAtoms || [],
        builderBonds: input.builderBonds || existing?.builderBonds || [],
        notes: input.notes ?? existing?.notes ?? '',
        tags: input.tags || existing?.tags || [],
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
