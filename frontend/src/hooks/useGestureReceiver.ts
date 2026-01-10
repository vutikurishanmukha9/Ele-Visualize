import { useEffect, useState, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

export interface GestureData {
    gesture: 'pinch' | 'grab' | 'point' | 'open' | 'none';
    confidence: number;
    data?: {
        pinchDistance?: number;
        rotation?: { x: number; y: number };
        position?: { x: number; y: number };
    };
    timestamp: number;
}

export interface ControlData {
    action: 'rotate' | 'zoom' | 'reset' | 'select';
    value?: number | { x: number; y: number };
}

export function useGestureReceiver() {
    const [isConnected, setIsConnected] = useState(false);
    const [currentGesture, setCurrentGesture] = useState<GestureData | null>(null);
    const [lastControl, setLastControl] = useState<ControlData | null>(null);

    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('[Visualizer] WebSocket connected');
            setIsConnected(true);
            ws.send(JSON.stringify({ type: 'register', role: 'visualizer' }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                switch (message.type) {
                    case 'gesture':
                        setCurrentGesture({
                            gesture: message.gesture,
                            confidence: message.confidence,
                            data: message.data,
                            timestamp: message.timestamp || Date.now()
                        });
                        break;

                    case 'control':
                        setLastControl({
                            action: message.action,
                            value: message.value
                        });
                        break;

                    case 'element_selected':
                        // Handle element selection from other clients
                        console.log('[Visualizer] Element selected:', message.atomicNumber);
                        break;
                }
            } catch (e) {
                console.error('[Visualizer] Error parsing message:', e);
            }
        };

        ws.onclose = () => {
            console.log('[Visualizer] WebSocket disconnected');
            setIsConnected(false);
        };

        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, []);

    const sendControl = useCallback((action: string, value?: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'control',
                action,
                value
            }));
        }
    }, []);

    return {
        isConnected,
        currentGesture,
        lastControl,
        sendControl
    };
}
