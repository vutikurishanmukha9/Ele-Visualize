import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronDown, ChevronUp, Hand, Video, VideoOff, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HandTrackerProps {
    onZoomChange?: (zoomLevel: number) => void;
    onGestureDetected?: (gesture: string) => void;
}

declare global {
    interface Window {
        HandLandmarker: any;
        FilesetResolver: any;
    }
}

const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Smoothing for stable readings
class SmoothValue {
    private values: number[] = [];
    private maxSamples: number;

    constructor(samples = 5) {
        this.maxSamples = samples;
    }

    add(value: number): number {
        this.values.push(value);
        if (this.values.length > this.maxSamples) {
            this.values.shift();
        }
        return this.values.reduce((a, b) => a + b, 0) / this.values.length;
    }

    reset() {
        this.values = [];
    }
}

export function HandTracker({ onZoomChange, onGestureDetected }: HandTrackerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentGesture, setCurrentGesture] = useState<string>('none');
    const [zoomLevel, setZoomLevel] = useState(1);
    const [confidence, setConfidence] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [handedness, setHandedness] = useState<string>('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const handLandmarkerRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number>(0);

    // Smoothing for gesture detection
    const pinchSmoother = useRef(new SmoothValue(8));
    const zoomSmoother = useRef(new SmoothValue(5));
    const lastPinchRef = useRef<number>(0);
    const gestureHoldRef = useRef<{ gesture: string; count: number }>({ gesture: 'none', count: 0 });

    const processLandmarks = useCallback((results: any) => {
        if (!results.landmarks || results.landmarks.length === 0) {
            setCurrentGesture('none');
            setConfidence(0);
            pinchSmoother.current.reset();
            gestureHoldRef.current = { gesture: 'none', count: 0 };
            return;
        }

        const landmarks = results.landmarks[0];

        // Get handedness
        if (results.handedness?.[0]?.[0]) {
            setHandedness(results.handedness[0][0].categoryName);
        }

        // Key landmarks
        const wrist = landmarks[0];
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        const indexTip = landmarks[8];
        const indexPip = landmarks[6];
        const indexMcp = landmarks[5];
        const middleTip = landmarks[12];
        const middlePip = landmarks[10];
        const middleMcp = landmarks[9];
        const ringTip = landmarks[16];
        const ringPip = landmarks[14];
        const pinkyTip = landmarks[20];
        const pinkyPip = landmarks[18];

        // Calculate pinch distance with smoothing
        const rawPinchDistance = getDistance(thumbTip, indexTip);
        const pinchDistance = pinchSmoother.current.add(rawPinchDistance);

        // Calculate palm size for relative measurements
        const palmSize = getDistance(wrist, middleMcp);
        const normalizedPinch = pinchDistance / palmSize;

        // Check if fingers are extended
        const indexExtended = indexTip.y < indexPip.y;
        const middleExtended = middleTip.y < middlePip.y;
        const ringExtended = ringTip.y < ringPip.y;
        const pinkyExtended = pinkyTip.y < pinkyPip.y;
        const thumbExtended = getDistance(thumbTip, indexMcp) > palmSize * 0.8;

        let detectedGesture = 'none';
        let gestureConfidence = 0;

        // Pinch gesture (thumb and index close, others can be any state)
        if (normalizedPinch < 0.35) {
            detectedGesture = 'pinch';
            gestureConfidence = Math.min(1, (0.35 - normalizedPinch) / 0.25);

            // Smooth zoom control
            if (lastPinchRef.current > 0) {
                const delta = (lastPinchRef.current - normalizedPinch) * 5;
                const smoothedDelta = zoomSmoother.current.add(delta);

                if (Math.abs(smoothedDelta) > 0.01) {
                    setZoomLevel(prev => {
                        const newZoom = Math.max(0.5, Math.min(3, prev + smoothedDelta));
                        onZoomChange?.(newZoom);
                        return newZoom;
                    });
                }
            }
            lastPinchRef.current = normalizedPinch;
        }
        // Point gesture (only index extended)
        else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
            detectedGesture = 'point';
            gestureConfidence = 0.9;
            lastPinchRef.current = 0;
            zoomSmoother.current.reset();
        }
        // Open hand (all fingers extended)
        else if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
            detectedGesture = 'open';
            gestureConfidence = 0.85;
            lastPinchRef.current = 0;
            zoomSmoother.current.reset();
        }
        // Fist (no fingers extended)
        else if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
            detectedGesture = 'fist';
            gestureConfidence = 0.8;
            lastPinchRef.current = 0;
            zoomSmoother.current.reset();
        }
        else {
            lastPinchRef.current = 0;
            zoomSmoother.current.reset();
        }

        // Gesture stability - require consistent detection
        if (detectedGesture === gestureHoldRef.current.gesture) {
            gestureHoldRef.current.count++;
        } else {
            gestureHoldRef.current = { gesture: detectedGesture, count: 1 };
        }

        // Only update gesture after 3 consistent frames
        if (gestureHoldRef.current.count >= 3) {
            setCurrentGesture(detectedGesture);
            setConfidence(gestureConfidence);
            if (detectedGesture !== 'none') {
                onGestureDetected?.(detectedGesture);
            }
        }

        // Draw landmarks with better visualization
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connections first (behind points)
            const connections = [
                [0, 1], [1, 2], [2, 3], [3, 4], // thumb
                [0, 5], [5, 6], [6, 7], [7, 8], // index
                [5, 9], [9, 10], [10, 11], [11, 12], // middle
                [9, 13], [13, 14], [14, 15], [15, 16], // ring
                [13, 17], [17, 18], [18, 19], [19, 20], // pinky
                [0, 17] // palm
            ];

            ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
            ctx.lineWidth = 2;
            for (const [start, end] of connections) {
                ctx.beginPath();
                ctx.moveTo(landmarks[start].x * canvas.width, landmarks[start].y * canvas.height);
                ctx.lineTo(landmarks[end].x * canvas.width, landmarks[end].y * canvas.height);
                ctx.stroke();
            }

            // Draw points
            for (let i = 0; i < landmarks.length; i++) {
                const point = landmarks[i];
                const size = [4, 8, 12, 16, 20].includes(i) ? 6 : 4; // Bigger for fingertips
                const color = [4, 8].includes(i) ? '#00ff88' : '#00d4ff'; // Green for thumb/index tips

                ctx.beginPath();
                ctx.arc(point.x * canvas.width, point.y * canvas.height, size, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
            }

            // Draw pinch indicator line
            if (detectedGesture === 'pinch') {
                ctx.strokeStyle = '#00ff88';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(thumbTip.x * canvas.width, thumbTip.y * canvas.height);
                ctx.lineTo(indexTip.x * canvas.width, indexTip.y * canvas.height);
                ctx.stroke();
            }
        }
    }, [onZoomChange, onGestureDetected]);

    const startTracking = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (!window.FilesetResolver || !window.HandLandmarker) {
                throw new Error('MediaPipe not loaded. Please refresh the page.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                streamRef.current = stream;
            }

            if (!handLandmarkerRef.current) {
                const vision = await window.FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
                );

                handLandmarkerRef.current = await window.HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                        delegate: 'GPU'
                    },
                    runningMode: 'VIDEO',
                    numHands: 1,
                    minHandDetectionConfidence: 0.7,
                    minHandPresenceConfidence: 0.7,
                    minTrackingConfidence: 0.7
                });
            }

            setIsTracking(true);
            setIsLoading(false);

            const detectLoop = () => {
                if (!handLandmarkerRef.current || !videoRef.current || !streamRef.current) return;

                const video = videoRef.current;
                if (video.readyState >= 2) {
                    try {
                        const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
                        processLandmarks(results);
                    } catch (e) {
                        // Silent error handling for detection
                    }
                }

                animationFrameRef.current = requestAnimationFrame(detectLoop);
            };
            detectLoop();

        } catch (err: any) {
            setError(err.message || 'Failed to start');
            setIsLoading(false);

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
    }, [processLandmarks]);

    const stopTracking = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsTracking(false);
        setCurrentGesture('none');
        setConfidence(0);
        pinchSmoother.current.reset();
        zoomSmoother.current.reset();
    }, []);

    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-6 right-6 z-10"
        >
            <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-xl">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Hand className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium uppercase tracking-wider">Hand Tracker</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            isTracking ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                        )} />
                        <span className="text-[10px] text-muted-foreground">
                            {isLoading ? 'Loading...' : isTracking ? handedness || 'Active' : 'Inactive'}
                        </span>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </div>
                </button>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="relative w-64 aspect-video bg-black border-t border-border/30">
                                <video
                                    ref={videoRef}
                                    className={cn("absolute inset-0 w-full h-full object-cover scale-x-[-1]", !isTracking && "hidden")}
                                    playsInline
                                    muted
                                />
                                <canvas
                                    ref={canvasRef}
                                    width={256}
                                    height={144}
                                    className="absolute inset-0 w-full h-full scale-x-[-1]"
                                />

                                {!isTracking && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <Camera className="w-6 h-6 text-muted-foreground/30 mb-1" />
                                        <span className="text-[10px] text-muted-foreground/40 text-center px-2">
                                            {error || 'Click Start for hand tracking'}
                                        </span>
                                    </div>
                                )}

                                <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-primary/30" />
                                <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-primary/30" />
                                <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-primary/30" />
                                <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-primary/30" />
                            </div>

                            <div className="p-2.5 flex items-center justify-between border-t border-border/30">
                                <button
                                    onClick={isTracking ? stopTracking : startTracking}
                                    disabled={isLoading}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-all',
                                        isTracking
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                            : 'bg-primary/20 text-primary border border-primary/50',
                                        isLoading && 'opacity-50 cursor-not-allowed'
                                    )}
                                >
                                    {isTracking ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                    {isLoading ? 'Loading...' : isTracking ? 'Stop' : 'Start'}
                                </button>

                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-muted-foreground">Conf:</span>
                                    <div className="w-12 h-1 bg-secondary/50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${confidence * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] text-primary font-mono">{Math.round(confidence * 100)}%</span>
                                </div>
                            </div>

                            <div className="px-2.5 pb-2.5 flex gap-1.5">
                                {['Pinch', 'Point', 'Open', 'Fist'].map((gesture) => (
                                    <div
                                        key={gesture}
                                        className={cn(
                                            "flex-1 py-1 px-1 rounded-md border text-center transition-all",
                                            currentGesture.toLowerCase() === gesture.toLowerCase()
                                                ? "bg-primary/20 border-primary/50 text-primary"
                                                : "bg-secondary/20 border-border/20 text-muted-foreground/50"
                                        )}
                                    >
                                        <span className="text-[8px] uppercase tracking-wider">{gesture}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="px-2.5 pb-2.5 flex items-center gap-2 border-t border-border/30 pt-2">
                                <ZoomOut className="w-3 h-3 text-muted-foreground" />
                                <div className="flex-1 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all"
                                        style={{ width: `${((zoomLevel - 0.5) / 2.5) * 100}%` }}
                                    />
                                </div>
                                <ZoomIn className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-primary font-mono w-10 text-right">{zoomLevel.toFixed(2)}x</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
