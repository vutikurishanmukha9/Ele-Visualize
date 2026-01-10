/**
 * WebSocket Service
 * Manages WebSocket connections and message routing
 */

import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { recognizeGesture, HandLandmark, GestureResult } from './gesture.service.js';

interface Client {
    ws: WebSocket;
    id: string;
    type: 'tracker' | 'visualizer' | 'unknown';
}

const clients = new Map<string, Client>();

let wss: WebSocketServer;

export function initWebSocket(server: Server): WebSocketServer {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const client: Client = { ws, id: clientId, type: 'unknown' };
        clients.set(clientId, client);

        console.log(`[WS] Client connected: ${clientId}`);

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connection',
            status: 'connected',
            clientId
        }));

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                handleMessage(client, message);
            } catch (e) {
                console.error('[WS] Error parsing message:', e);
            }
        });

        ws.on('close', () => {
            console.log(`[WS] Client disconnected: ${clientId}`);
            clients.delete(clientId);
        });

        ws.on('error', (error) => {
            console.error(`[WS] Error for ${clientId}:`, error);
        });
    });

    return wss;
}

function handleMessage(client: Client, message: any) {
    switch (message.type) {
        case 'register':
            // Client identifies itself as tracker or visualizer
            client.type = message.role || 'unknown';
            console.log(`[WS] Client ${client.id} registered as: ${client.type}`);
            break;

        case 'hand_landmarks':
            // Process hand landmarks and recognize gesture
            const landmarks: HandLandmark[] = message.landmarks;
            const gesture = recognizeGesture(landmarks);

            // Broadcast gesture to all visualizer clients
            broadcastToVisualizers({
                type: 'gesture',
                gesture: gesture.gesture,
                confidence: gesture.confidence,
                data: gesture.data,
                timestamp: Date.now()
            });
            break;

        case 'select_element':
            // Broadcast element selection to all clients
            broadcast({
                type: 'element_selected',
                atomicNumber: message.atomicNumber,
                source: client.id
            });
            break;

        case 'control':
            // Direct control commands (rotation, zoom)
            broadcastToVisualizers({
                type: 'control',
                action: message.action, // 'rotate' | 'zoom' | 'reset'
                value: message.value,
                source: client.id
            });
            break;

        default:
            console.log(`[WS] Unknown message type: ${message.type}`);
    }
}

function broadcast(message: object) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}

function broadcastToVisualizers(message: object) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
        if (client.type === 'visualizer' && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}

export function getConnectedClients(): number {
    return clients.size;
}
