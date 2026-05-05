const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

export type ProductEvent =
    | { type: 'session_opened'; sessionId: string }
    | { type: 'molecule_selected'; formula: string }
    | { type: 'compare_updated'; compareElements: number[] }
    | { type: 'builder_updated'; atoms: unknown[]; bonds: unknown[] }
    | { type: 'presence'; workspaceMode: string };

export function sendProductEvent(event: ProductEvent) {
    try {
        const ws = new WebSocket(WS_URL);
        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'register', role: 'visualizer' }));
            ws.send(JSON.stringify(event));
            ws.close();
        };
    } catch {
        // Collaboration events are opportunistic; the UI should remain local-first.
    }
}
