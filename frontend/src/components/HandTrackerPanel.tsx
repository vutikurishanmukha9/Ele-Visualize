import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronDown, ChevronUp, Hand, Scan, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

interface GestureState {
  gesture: string;
  confidence: number;
}

export function HandTrackerPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureState>({ gesture: 'none', confidence: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Connect to WebSocket only when expanded
  useEffect(() => {
    if (!isExpanded) {
      // Close connection when collapsed
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[HandTracker] WebSocket connected');
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'register', role: 'tracker' }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'gesture') {
          setCurrentGesture({ gesture: message.gesture, confidence: message.confidence });
        }
      } catch (e) {
        console.error('[HandTracker] Error parsing message:', e);
      }
    };

    ws.onclose = () => {
      console.log('[HandTracker] WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('[HandTracker] WebSocket error:', error);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [isExpanded]);

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsTracking(true);
      }
    } catch (error) {
      console.error('[HandTracker] Camera access denied:', error);
    }
  }, []);

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTracking(false);
  }, []);

  // Simulated landmark detection (replace with actual MediaPipe)
  // In production, you would use @mediapipe/tasks-vision
  const processFrame = useCallback(() => {
    if (!isTracking || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Simulate hand landmarks for demo (21 points)
    // In real implementation, use MediaPipe HandLandmarker
    const mockLandmarks = Array(21).fill(0).map((_, i) => ({
      x: 0.5 + Math.sin(Date.now() / 1000 + i) * 0.1,
      y: 0.5 + Math.cos(Date.now() / 1000 + i) * 0.1,
      z: 0 + Math.sin(Date.now() / 500 + i) * 0.05
    }));

    wsRef.current.send(JSON.stringify({
      type: 'hand_landmarks',
      landmarks: mockLandmarks,
      timestamp: Date.now()
    }));
  }, [isTracking]);

  // Frame processing loop
  useEffect(() => {
    if (!isTracking) return;

    const intervalId = setInterval(processFrame, 100); // 10 FPS for demo
    return () => clearInterval(intervalId);
  }, [isTracking, processFrame]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="absolute bottom-6 right-6 z-10"
    >
      <div className="glass-panel rounded-xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Hand className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-foreground">
              Hand Tracker
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("status-dot", isConnected ? "bg-green-500" : "bg-red-500")} />
            <span className="text-[10px] text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Collapsible content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              {/* Video feed */}
              <div className="relative w-64 aspect-video bg-secondary/30 border-t border-border/30">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover",
                    !isTracking && "hidden"
                  )}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {!isTracking && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Camera className="w-6 h-6 text-muted-foreground/30 mb-1" />
                    <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                      Click Start to Enable
                    </span>
                  </div>
                )}

                {/* Corner brackets */}
                <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-primary/30" />
                <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-primary/30" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-primary/30" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-primary/30" />
              </div>

              {/* Controls */}
              <div className="p-2.5 flex items-center justify-between border-t border-border/30">
                <div className="flex gap-1">
                  <button
                    onClick={isTracking ? stopCamera : startCamera}
                    className={cn(
                      'p-1.5 rounded-md border transition-all duration-200',
                      isTracking
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-secondary/30 border-border/30 hover:bg-secondary/50 hover:border-primary/20'
                    )}
                    title={isTracking ? 'Stop' : 'Start'}
                  >
                    {isTracking ? (
                      <VideoOff className="w-3 h-3" />
                    ) : (
                      <Video className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    className={cn(
                      'p-1.5 rounded-md bg-secondary/30 border border-border/30',
                      'hover:bg-secondary/50 hover:border-primary/20 transition-all duration-200'
                    )}
                    title="Scan"
                  >
                    <Scan className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground/50">Confidence</span>
                  <div className="w-12 h-1 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all"
                      style={{ width: `${currentGesture.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-primary font-mono">
                    {Math.round(currentGesture.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Gesture hints */}
              <div className="px-2.5 pb-2.5 flex gap-2">
                {['Pinch', 'Grab', 'Point', 'Open'].map((gesture) => (
                  <div
                    key={gesture}
                    className={cn(
                      "flex-1 py-1 px-1.5 rounded-md border text-center transition-colors",
                      currentGesture.gesture.toLowerCase() === gesture.toLowerCase()
                        ? "bg-primary/20 border-primary/50"
                        : "bg-secondary/20 border-border/20"
                    )}
                  >
                    <span className={cn(
                      "text-[9px] uppercase tracking-wider",
                      currentGesture.gesture.toLowerCase() === gesture.toLowerCase()
                        ? "text-primary"
                        : "text-muted-foreground/50"
                    )}>
                      {gesture}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
