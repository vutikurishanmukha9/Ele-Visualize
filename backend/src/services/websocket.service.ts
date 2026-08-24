/**
 * Production WebSocket Service
 * High-performance, memory-safe message routing with ping/pong heartbeats
 * and payload size limits.
 */

import { WebSocket, WebSocketServer, RawData } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';

interface Client {
    ws: WebSocket;
    id: string;
    type: 'tracker' | 'visualizer' | 'unknown';
    isAlive: boolean;
}

const clients = new Map<string, Client>();
const MAX_PAYLOAD_BYTES = 64 * 1024; // 64 KB limit

let wss: WebSocketServer | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

export function initWebSocket(server: Server): WebSocketServer {
    wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: MAX_PAYLOAD_BYTES,
    });

    // 30s Heartbeat cycle to sweep dead connections
    heartbeatInterval = setInterval(() => {
        clients.forEach((client, id) => {
            if (!client.isAlive) {
                console.log(`[WS] Terminating inactive client: ${id}`);
                client.ws.terminate();
                clients.delete(id);
                return;
            }
            client.isAlive = false;
            client.ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
    });

    wss.on('connection', (ws: WebSocket) => {
        const clientId = randomUUID();
        const client: Client = { ws, id: clientId, type: 'unknown', isAlive: true };
        clients.set(clientId, client);

        ws.on('pong', () => {
            client.isAlive = true;
        });

        // Welcome payload
        try {
            ws.send(JSON.stringify({
                type: 'connection',
                status: 'connected',
                clientId,
            }));
        } catch {
            // Ignore initial send failure
        }

        ws.on('message', (data: RawData) => {
            try {
                if (data.toString().length > MAX_PAYLOAD_BYTES) {
                    console.warn(`[WS] Payload from ${clientId} exceeded maximum size.`);
                    return;
                }
                const message = JSON.parse(data.toString());
                handleMessage(client, message);
            } catch (e) {
                console.error('[WS] Error parsing message:', e);
            }
        });

        ws.on('close', () => {
            clients.delete(clientId);
        });

        ws.on('error', (error) => {
            console.error(`[WS] Error for ${clientId}:`, error);
            clients.delete(clientId);
        });
    });

    return wss;
}

function handleMessage(client: Client, message: Record<string, unknown>) {
    if (!message || typeof message !== 'object') return;

    switch (message.type) {
        case 'register':
            client.type = (message.role as Client['type']) || 'unknown';
            break;

        case 'hand_landmarks':
            broadcastToVisualizers({
                type: 'hand_landmarks',
                landmarks: message.landmarks,
                timestamp: Date.now(),
            });
            break;

        case 'select_element':
            broadcast({
                type: 'element_selected',
                atomicNumber: message.atomicNumber,
                source: client.id,
            });
            break;

        case 'control':
            broadcastToVisualizers({
                type: 'control',
                action: message.action,
                value: message.value,
                source: client.id,
            });
            break;

        case 'session_opened':
        case 'molecule_selected':
        case 'compare_updated':
        case 'builder_updated':
        case 'presence':
            broadcast({
                ...message,
                source: client.id,
                timestamp: Date.now(),
            });
            break;

        default:
            break;
    }
}

function broadcast(message: object) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(data);
            } catch {
                // Ignore dropped frame
            }
        }
    });
}

function broadcastToVisualizers(message: object) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
        if (client.type === 'visualizer' && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(data);
            } catch {
                // Ignore dropped frame
            }
        }
    });
}

export function getConnectedClients(): number {
    return clients.size;
}
