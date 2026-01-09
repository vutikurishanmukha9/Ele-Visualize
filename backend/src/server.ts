import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { elements, categories, getElementByNumber, getElementsByCategory } from './data/elements.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());

// ==================== REST API ROUTES ====================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/elements', (req, res) => {
    const { category, limit } = req.query;
    let result = elements;

    if (category && typeof category === 'string') {
        result = getElementsByCategory(category);
    }

    if (limit) {
        result = result.slice(0, parseInt(limit as string));
    }

    res.json(result);
});

app.get('/api/elements/:atomicNumber', (req, res) => {
    const atomicNumber = parseInt(req.params.atomicNumber);
    const element = getElementByNumber(atomicNumber);
    if (!element) return res.status(404).json({ error: 'Element not found' });
    res.json(element);
});

app.get('/api/categories', (req, res) => {
    res.json(categories);
});

// ==================== HTTP SERVER & WEBSOCKET ====================

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'connection', status: 'connected' }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            if (message.type === 'hand_tracking') {
                // Relay hand tracking data to visualization clients
                broadcastToOthers(ws, { type: 'hand_update', data: message.data });
            }
        } catch (e) { console.error(e); }
    });

    ws.on('close', () => clients.delete(ws));
});

function broadcastToOthers(sender: WebSocket, message: object) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) client.send(data);
    });
}

server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`WebSocket at ws://localhost:${PORT}/ws`);
});
