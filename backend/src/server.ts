import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import elementRoutes from './routes/element.routes.js';
import sessionRoutes from './routes/session.routes.js';
import { initWebSocket, getConnectedClients } from './services/websocket.service.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

// Routes
app.use(elementRoutes);
app.use(sessionRoutes);

// Status endpoint with WebSocket info
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        connectedClients: getConnectedClients(),
        features: {
            gestureRecognition: true,
            elementVisualization: true,
            handTracking: true,
            sessions: true,
            collaborationEvents: true
        }
    });
});

// Create HTTP Server
const server = createServer(app);

// Initialize WebSocket with gesture handling
initWebSocket(server);

server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`WebSocket at ws://localhost:${PORT}/ws`);
    console.log('Features: Gesture Recognition, Hand Tracking, Element API, Sessions');
});
