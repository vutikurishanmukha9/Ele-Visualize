import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronDown, ChevronUp, Hand, Video, VideoOff, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HandTrackerProps {
    onZoomChange?: (zoomLevel: number) => void;
    onGestureDetected?: (gesture: string) => void;
    onSwipe?: (direction: 'left' | 'right') => void;
    onHandPosition?: (x: number, y: number) => void;
}

declare global {
    interface Window {
        HandLandmarker: any;
        FilesetResolver: any;
    }
}

// ============== ADVANCED SMOOTHING CLASSES ==============

// Kalman-like 1D filter for ultra-smooth prediction
class KalmanFilter {
    private x: number = 0;      // state
    private p: number = 1;      // error covariance
    private q: number;          // process noise
    private r: number;          // measurement noise
    private k: number = 0;      // kalman gain

    constructor(processNoise = 0.01, measurementNoise = 0.1) {
        this.q = processNoise;
        this.r = measurementNoise;
    }

    filter(measurement: number): number {
        // Prediction
        this.p = this.p + this.q;

        // Update
        this.k = this.p / (this.p + this.r);
        this.x = this.x + this.k * (measurement - this.x);
        this.p = (1 - this.k) * this.p;

        return this.x;
    }

    reset(value: number = 0) {
        this.x = value;
        this.p = 1;
    }
}

// Velocity tracker for gesture detection
class VelocityTracker {
    private history: { value: number; time: number }[] = [];
    private maxHistory = 5;

    add(value: number) {
        this.history.push({ value, time: performance.now() });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    getVelocity(): number {
        if (this.history.length < 2) return 0;
        const first = this.history[0];
        const last = this.history[this.history.length - 1];
        const dt = (last.time - first.time) / 1000; // seconds
        if (dt < 0.01) return 0;
        return (last.value - first.value) / dt;
    }

    reset() {
        this.history = [];
    }
}

// Gesture state machine for stable detection
class GestureStateMachine {
    private currentGesture: string = 'none';
    private candidateGesture: string = 'none';
    private candidateFrames: number = 0;
    private requiredFrames: number;
    private exitFrames: number = 0;
    private requiredExitFrames: number;

    constructor(requiredFrames = 3, requiredExitFrames = 2) {
        this.requiredFrames = requiredFrames;
        this.requiredExitFrames = requiredExitFrames;
    }

    update(detected: string): string {
        if (detected === this.currentGesture) {
            // Staying in current gesture
            this.candidateGesture = detected;
            this.candidateFrames = this.requiredFrames;
            this.exitFrames = 0;
            return this.currentGesture;
        }

        if (detected !== this.candidateGesture) {
            // New candidate
            this.candidateGesture = detected;
            this.candidateFrames = 1;
            this.exitFrames++;
        } else {
            // Same candidate, count up
            this.candidateFrames++;
        }

        // Check if candidate should become current
        if (this.candidateFrames >= this.requiredFrames) {
            this.currentGesture = this.candidateGesture;
            this.exitFrames = 0;
            return this.currentGesture;
        }

        // Check if we should exit current gesture
        if (this.exitFrames >= this.requiredExitFrames && this.currentGesture !== 'none') {
            // Don't immediately go to none, wait for new gesture
            if (detected === 'none') {
                this.currentGesture = 'none';
            }
        }

        return this.currentGesture;
    }

    get(): string {
        return this.currentGesture;
    }

    reset() {
        this.currentGesture = 'none';
        this.candidateGesture = 'none';
        this.candidateFrames = 0;
        this.exitFrames = 0;
    }
}

// Landmark smoothing with per-point Kalman filters
class LandmarkKalmanSmoother {
    private filters: { x: KalmanFilter; y: KalmanFilter; z: KalmanFilter }[] = [];

    update(landmarks: { x: number; y: number; z: number }[]): { x: number; y: number; z: number }[] {
        // Initialize filters if needed
        if (this.filters.length !== landmarks.length) {
            this.filters = landmarks.map(() => ({
                x: new KalmanFilter(0.001, 0.05),
                y: new KalmanFilter(0.001, 0.05),
                z: new KalmanFilter(0.001, 0.1)
            }));
        }

        return landmarks.map((lm, i) => ({
            x: this.filters[i].x.filter(lm.x),
            y: this.filters[i].y.filter(lm.y),
            z: this.filters[i].z.filter(lm.z || 0)
        }));
    }

    reset() {
        this.filters = [];
    }
}

// ============== HELPER FUNCTIONS ==============

const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

const get3DDistance = (p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow((p2.z || 0) - (p1.z || 0), 2));
};

// Angle between three points (in radians)
const getAngle = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => {
    const ab = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    const bc = Math.sqrt(Math.pow(c.x - b.x, 2) + Math.pow(c.y - b.y, 2));
    const ac = Math.sqrt(Math.pow(c.x - a.x, 2) + Math.pow(c.y - a.y, 2));
    return Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc));
};

// ============== MAIN COMPONENT ==============

export function HandTracker({ onZoomChange, onGestureDetected, onSwipe, onHandPosition }: HandTrackerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentGesture, setCurrentGesture] = useState<string>('none');
    const [zoomLevel, setZoomLevel] = useState(1);
    const [confidence, setConfidence] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [handedness, setHandedness] = useState<string>('');
    const [fps, setFps] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const handLandmarkerRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number>(0);
    const isTrackingRef = useRef<boolean>(false); // Use ref for closure stability

    // Advanced smoothing instances
    const landmarkSmootherRef = useRef(new LandmarkKalmanSmoother());
    const gestureStateMachineRef = useRef(new GestureStateMachine(4, 3)); // 4 frames to enter, 3 to exit

    // Per-value Kalman filters
    const pinchFilterRef = useRef(new KalmanFilter(0.005, 0.02));
    const zoomFilterRef = useRef(new KalmanFilter(0.001, 0.01));
    const handXFilterRef = useRef(new KalmanFilter(0.002, 0.03));
    const handYFilterRef = useRef(new KalmanFilter(0.002, 0.03));

    // Velocity trackers
    const wristVelocityRef = useRef(new VelocityTracker());

    // State refs
    const lastPinchRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);
    const frameCountRef = useRef<number>(0);
    const swipeCooldownRef = useRef<number>(0);
    const lastWristXRef = useRef<number>(0);

    const processLandmarks = useCallback((results: any) => {
        // FPS calculation
        const now = performance.now();
        frameCountRef.current++;
        if (now - lastFrameTimeRef.current >= 1000) {
            setFps(frameCountRef.current);
            frameCountRef.current = 0;
            lastFrameTimeRef.current = now;
        }

        if (!results.landmarks || results.landmarks.length === 0) {
            gestureStateMachineRef.current.update('none');
            setCurrentGesture('none');
            setConfidence(0);
            onGestureDetected?.('none');
            return;
        }

        // Apply Kalman smoothing to landmarks
        const smoothedLandmarks = landmarkSmootherRef.current.update(results.landmarks[0]);

        if (results.handedness?.[0]?.[0]) {
            setHandedness(results.handedness[0][0].categoryName);
        }

        // Extract key landmarks
        const wrist = smoothedLandmarks[0];
        const thumbTip = smoothedLandmarks[4];
        const thumbIp = smoothedLandmarks[3];
        const thumbMcp = smoothedLandmarks[2];
        const indexTip = smoothedLandmarks[8];
        const indexPip = smoothedLandmarks[6];
        const indexMcp = smoothedLandmarks[5];
        const middleTip = smoothedLandmarks[12];
        const middlePip = smoothedLandmarks[10];
        const middleMcp = smoothedLandmarks[9];
        const ringTip = smoothedLandmarks[16];
        const ringPip = smoothedLandmarks[14];
        const ringMcp = smoothedLandmarks[13];
        const pinkyTip = smoothedLandmarks[20];
        const pinkyPip = smoothedLandmarks[18];
        const pinkyMcp = smoothedLandmarks[17];

        // Palm size for normalization
        const palmSize = getDistance(wrist, middleMcp);

        // ========== FINGER CURL DETECTION (angle-based, more accurate) ==========
        const indexCurl = getAngle(indexMcp, indexPip, indexTip);
        const middleCurl = getAngle(middleMcp, middlePip, middleTip);
        const ringCurl = getAngle(ringMcp, ringPip, ringTip);
        const pinkyCurl = getAngle(pinkyMcp, pinkyPip, pinkyTip);

        // Extended = angle > 2.5 radians (~143 degrees = straight)
        const curlThreshold = 2.3;
        const indexExtended = indexCurl > curlThreshold;
        const middleExtended = middleCurl > curlThreshold;
        const ringExtended = ringCurl > curlThreshold;
        const pinkyExtended = pinkyCurl > curlThreshold;

        // Thumb extension (distance-based)
        const thumbExtended = getDistance(thumbTip, wrist) > palmSize * 0.85;

        const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

        // ========== PINCH DETECTION (3D distance) ==========
        const rawPinchDistance = get3DDistance(thumbTip, indexTip);
        const pinchDistance = pinchFilterRef.current.filter(rawPinchDistance);
        const normalizedPinch = pinchDistance / palmSize;

        // ========== GESTURE DETECTION ==========
        let rawGesture = 'none';
        let gestureConfidence = 0;

        // PINCH: Thumb and index tips close (< 0.45 palm size)
        if (normalizedPinch < 0.45 && !middleExtended && !ringExtended) {
            rawGesture = 'pinch';
            gestureConfidence = Math.min(1, (0.45 - normalizedPinch) / 0.3);
        }
        // POINT: Only index extended
        else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
            rawGesture = 'point';
            gestureConfidence = 0.9;
        }
        // OPEN: 4+ fingers extended including thumb
        else if (extendedCount >= 3 && thumbExtended) {
            rawGesture = 'open';
            gestureConfidence = 0.85;
        }
        // FIST: No fingers extended
        else if (extendedCount === 0 && !thumbExtended) {
            rawGesture = 'fist';
            gestureConfidence = 0.8;
        }

        // Apply gesture state machine for stability
        const stableGesture = gestureStateMachineRef.current.update(rawGesture);
        setCurrentGesture(stableGesture);
        setConfidence(gestureConfidence);
        onGestureDetected?.(stableGesture);

        // ========== GESTURE ACTIONS ==========

        // PINCH ZOOM: Fingers apart = zoom IN, fingers together = zoom OUT
        if (stableGesture === 'pinch') {
            if (lastPinchRef.current > 0) {
                // Now: positive delta when fingers move APART (normalizedPinch increases)
                const delta = (normalizedPinch - lastPinchRef.current) * 15; // Higher sensitivity
                const smoothedDelta = zoomFilterRef.current.filter(delta);

                if (Math.abs(smoothedDelta) > 0.002) {
                    setZoomLevel(prev => {
                        // Fingers apart (positive delta) = zoom in (increase)
                        // Fingers together (negative delta) = zoom out (decrease)
                        const newZoom = Math.max(0.5, Math.min(3, prev + smoothedDelta));
                        onZoomChange?.(newZoom);
                        return newZoom;
                    });
                }
            }
            lastPinchRef.current = normalizedPinch;
        } else {
            lastPinchRef.current = 0;
            zoomFilterRef.current.reset(0);
        }

        // OPEN: Hand position for rotation + swipe
        if (stableGesture === 'open') {
            // Smooth hand position
            const smoothX = handXFilterRef.current.filter(wrist.x);
            const smoothY = handYFilterRef.current.filter(wrist.y);
            onHandPosition?.(smoothX, smoothY);

            // Velocity-based swipe detection
            wristVelocityRef.current.add(wrist.x);
            const velocity = wristVelocityRef.current.getVelocity();

            if (Date.now() > swipeCooldownRef.current) {
                // High velocity = swipe (velocity > 0.8 = fast movement)
                if (Math.abs(velocity) > 0.6) {
                    onSwipe?.(velocity > 0 ? 'right' : 'left');
                    swipeCooldownRef.current = Date.now() + 600; // 600ms cooldown
                    wristVelocityRef.current.reset();
                }
            }
        } else {
            handXFilterRef.current.reset(0.5);
            handYFilterRef.current.reset(0.5);
            wristVelocityRef.current.reset();
        }

        // ========== DRAW VISUALIZATION ==========
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Draw connections
            const connections = [
                [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
                [0, 5], [5, 6], [6, 7], [7, 8],  // Index
                [0, 9], [9, 10], [10, 11], [11, 12], // Middle
                [0, 13], [13, 14], [14, 15], [15, 16], // Ring
                [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
                [5, 9], [9, 13], [13, 17] // Palm
            ];

            ctx.strokeStyle = stableGesture === 'open' ? '#22c55e' :
                stableGesture === 'pinch' ? '#f59e0b' :
                    stableGesture === 'point' ? '#3b82f6' : '#888888';
            ctx.lineWidth = 2;

            for (const [i, j] of connections) {
                const p1 = smoothedLandmarks[i];
                const p2 = smoothedLandmarks[j];
                ctx.beginPath();
                ctx.moveTo(p1.x * canvasRef.current.width, p1.y * canvasRef.current.height);
                ctx.lineTo(p2.x * canvasRef.current.width, p2.y * canvasRef.current.height);
                ctx.stroke();
            }

            // Draw landmarks
            for (let i = 0; i < smoothedLandmarks.length; i++) {
                const lm = smoothedLandmarks[i];
                ctx.beginPath();
                ctx.arc(lm.x * canvasRef.current.width, lm.y * canvasRef.current.height, 4, 0, 2 * Math.PI);
                ctx.fillStyle = i === 4 || i === 8 ? '#ff4444' : '#ffffff'; // Highlight thumb/index tips
                ctx.fill();
            }
        }
    }, [onZoomChange, onGestureDetected, onSwipe, onHandPosition]);

    const startTracking = async () => {
        if (isTracking) return;
        setIsLoading(true);
        setError(null);

        try {
            // Check for MediaPipe
            let attempts = 0;
            while (!window.HandLandmarker && attempts < 20) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }

            if (!window.HandLandmarker) {
                throw new Error('MediaPipe not loaded');
            }

            // Initialize HandLandmarker
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

            // Get camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            isTrackingRef.current = true; // Set ref BEFORE state
            setIsTracking(true);
            setIsLoading(false);

            // Detection loop - use ref to avoid stale closure
            const detect = () => {
                if (!isTrackingRef.current || !videoRef.current || !handLandmarkerRef.current) return;

                try {
                    const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
                    processLandmarks(results);
                } catch (e) {
                    console.error('Detection error:', e);
                }

                animationFrameRef.current = requestAnimationFrame(detect);
            };

            detect();
        } catch (err: any) {
            setError(err.message || 'Failed to start tracking');
            setIsLoading(false);
            console.error(err);
        }
    };

    const stopTracking = () => {
        isTrackingRef.current = false; // Stop the loop first
        setIsTracking(false);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        landmarkSmootherRef.current.reset();
        gestureStateMachineRef.current.reset();
    };

    useEffect(() => {
        return () => stopTracking();
    }, []);

    const gestureEmoji = currentGesture === 'open' ? '✋' :
        currentGesture === 'pinch' ? '🤏' :
            currentGesture === 'point' ? '👆' :
                currentGesture === 'fist' ? '✊' : '👋';

    return (
        <>
            {/* Camera in-use notification - fixed at top */}
            <AnimatePresence>
                {isTracking && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-red-500/90 text-white rounded-full shadow-lg"
                    >
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <Camera className="w-4 h-4" />
                        <span className="text-sm font-medium">Camera Active</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                className={cn(
                    "fixed bottom-4 right-4 z-50 rounded-xl overflow-hidden",
                    "bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl"
                )}
                animate={{ width: isExpanded ? 280 : 180 }}
            >
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5"
                >
                    <div className="flex items-center gap-2">
                        <Hand className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">HAND TRACKER</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", isTracking ? "bg-green-500 animate-pulse" : "bg-gray-500")} />
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
                            <div className="p-3 space-y-3">
                                {error && (
                                    <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{error}</div>
                                )}

                                <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" playsInline muted />
                                    <canvas ref={canvasRef} width={280} height={210} className="absolute inset-0 w-full h-full transform scale-x-[-1]" />
                                    {!isTracking && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <Camera className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    {isTracking && (
                                        <div className="absolute top-1 right-1 text-[10px] bg-black/50 px-1 rounded">
                                            {fps} FPS
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={isTracking ? stopTracking : startTracking}
                                    disabled={isLoading}
                                    className={cn(
                                        "w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                                        isTracking
                                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                            : "bg-green-500/20 text-green-400 hover:bg-green-500/30",
                                        isLoading && "opacity-50 cursor-wait"
                                    )}
                                >
                                    {isLoading ? (
                                        <span className="animate-pulse">Initializing...</span>
                                    ) : isTracking ? (
                                        <>
                                            <VideoOff className="w-4 h-4" />
                                            Stop Tracking
                                        </>
                                    ) : (
                                        <>
                                            <Video className="w-4 h-4" />
                                            Start Tracking
                                        </>
                                    )}
                                </button>

                                {isTracking && (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-white/5 rounded p-2">
                                            <div className="text-muted-foreground">Gesture</div>
                                            <div className="font-medium flex items-center gap-1">
                                                <span className="text-lg">{gestureEmoji}</span>
                                                <span className="capitalize">{currentGesture}</span>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded p-2">
                                            <div className="text-muted-foreground">Zoom</div>
                                            <div className="font-mono font-medium text-primary">{zoomLevel.toFixed(1)}x</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
}
