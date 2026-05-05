import { Request, Response } from 'express';
import {
    createSession,
    deleteSession,
    getSession,
    listSessions,
    updateSession,
} from '../services/session.service.js';

export async function getSessions(req: Request, res: Response) {
    res.json(await listSessions());
}

export async function getSessionById(req: Request, res: Response) {
    const session = await getSession(req.params.id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.json(session);
}

export async function postSession(req: Request, res: Response) {
    const session = await createSession(req.body || {});
    res.status(201).json(session);
}

export async function putSession(req: Request, res: Response) {
    const session = await updateSession(req.params.id, req.body || {});
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.json(session);
}

export async function removeSession(req: Request, res: Response) {
    const deleted = await deleteSession(req.params.id);
    if (!deleted) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.status(204).send();
}
