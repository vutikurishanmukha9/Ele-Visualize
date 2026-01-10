import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import elementRoutes from './routes/element.routes.js';
import { initWebSocket, getConnectedClients } from './services/websocket.service.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:8082',
        'http://localhost:8083',
        'http://localhost:5173'
    ],
    credentials: true
}));
app.use(express.json());

// Routes
app.use(elementRoutes);

// Status endpoint with WebSocket info
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        connectedClients: getConnectedClients(),
        features: {
            gestureRecognition: true,
            elementVisualization: true,
            handTracking: true
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
    console.log('Features: Gesture Recognition, Hand Tracking, Element API');
});
