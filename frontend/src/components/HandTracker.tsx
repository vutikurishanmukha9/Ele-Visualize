import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  ChevronDown,
  Eye,
  EyeOff,
  Hand,
  RefreshCw,
  Video,
  VideoOff,
  Zap,
} from 'lucide-react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { LandmarkFilterBank, OneEuroFilter1D } from '@/lib/handTracking/oneEuroFilter';
import { analyzeBiomechanics, KineticVelocityTracker } from '@/lib/handTracking/biomechanics';
import { GestureClassifier, GestureType } from '@/lib/handTracking/gestureClassifier';
import { HandHudRenderer, GESTURE_COLORS } from '@/lib/handTracking/hudRenderer';
import { GestureTutorial } from './GestureTutorial';
import { cn } from '@/lib/utils';

export interface HandTrackerProps {
  onZoomChange?: (zoomLevel: number | ((prev: number) => number)) => void;
  onGestureDetected?: (gesture: string) => void;
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void;
  onHandPosition?: (x: number, y: number, roll?: number) => void;
  onFreeze?: (isFrozen: boolean) => void;
}

export const HandTracker = memo(function HandTracker({
  onZoomChange,
  onGestureDetected,
  onSwipe,
  onHandPosition,
  onFreeze,
}: HandTrackerProps) {
  // UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('none');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [handedness, setHandedness] = useState<string>('Right');
  const [fps, setFps] = useState(0);

  // Settings & Toggles
  const [showVideo, setShowVideo] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [mirrorMode, _setMirrorMode] = useState(true);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [showTutorial, setShowTutorial] = useState(false);

  // DOM & Media Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isTrackingRef = useRef<boolean>(false);

  // Signal Processing & Math Engines
  const landmarkFilterBankRef = useRef(new LandmarkFilterBank());
  const gestureClassifierRef = useRef(new GestureClassifier({ entryThresholdFrames: 3, exitThresholdFrames: 2 }));
  const velocityTrackerRef = useRef(new KineticVelocityTracker(220));
  const pinchFilterRef = useRef(new OneEuroFilter1D({ minCutoff: 1.0, beta: 0.01 }));
  const hudRendererRef = useRef(new HandHudRenderer());

  // High-frequency loop state
  const lastPinchRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);

  // -------------------------------------------------------------
  // Frame Processing Pipeline
  // -------------------------------------------------------------
  const processHandResults = useCallback((results: any) => {
    const now = performance.now();

    // FPS Meter
    frameCountRef.current++;
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    // No Hand Detected in Frame
    if (!results.landmarks || results.landmarks.length === 0) {
      landmarkFilterBankRef.current.reset();
      gestureClassifierRef.current.reset();
      velocityTrackerRef.current.reset();
      pinchFilterRef.current.reset();
      lastPinchRef.current = 0;

      setCurrentGesture('none');
      setConfidence(0);
      onGestureDetected?.('none');
      onFreeze?.(false);

      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    // 1. Extract Handedness
    const detectedHand = (results.handedness?.[0]?.[0]?.categoryName as 'Right' | 'Left') || 'Right';
    setHandedness(detectedHand);

    // 2. 3D Adaptive One-Euro Landmark Smoothing (Zero Jitter, Zero Lag)
    const rawLandmarks = results.landmarks[0];
    const smoothedLandmarks = landmarkFilterBankRef.current.update(rawLandmarks, now);

    // 3. Biomechanical Kinematics Analysis
    const bio = analyzeBiomechanics(smoothedLandmarks, detectedHand);

    // 4. Kinetic Velocity Tracking
    velocityTrackerRef.current.add(bio.palmCenter, now);
    const velocity = velocityTrackerRef.current.getVelocity();

    // 5. Gesture Classification & Hysteresis State Machine
    const classification = gestureClassifierRef.current.update(bio, velocity);
    setCurrentGesture(classification.gesture);
    setConfidence(classification.confidence);
    onGestureDetected?.(classification.gesture);

    // 6. Action Dispatching
    // A. Fist Gesture = Freeze
    if (classification.gesture === 'fist') {
      onFreeze?.(true);
    } else {
      onFreeze?.(false);
    }

    // B. Swipe Gesture = Trigger Directional Swipe
    if (classification.gesture.startsWith('swipe_')) {
      const dir = classification.gesture.replace('swipe_', '') as 'left' | 'right' | 'up' | 'down';
      onSwipe?.(dir);
    }

    // C. Open Palm or Point = Continuous 3D Steering
    if (classification.gesture === 'open' || classification.gesture === 'point') {
      const x = mirrorMode ? 1.0 - bio.palmCenter.x : bio.palmCenter.x;
      const y = bio.palmCenter.y;
      onHandPosition?.(x, y, bio.orientation.roll);
    }

    // D. Pinch Gesture = Precision Continuous Zoom
    if (classification.gesture === 'pinch') {
      const rawPinch = bio.indexPinchDistance;
      const smoothPinch = pinchFilterRef.current.filter(rawPinch, now);

      if (lastPinchRef.current > 0) {
        // Delta > 0: Fingers moving apart = Zoom In
        // Delta < 0: Fingers closing = Zoom Out
        const delta = (smoothPinch - lastPinchRef.current) * 12.0 * sensitivity;

        if (Math.abs(delta) > 0.001) {
          onZoomChange?.((prev) => {
            const next = Math.max(0.4, Math.min(3.5, prev + delta));
            return next;
          });
        }
      }
      lastPinchRef.current = smoothPinch;
    } else {
      lastPinchRef.current = 0;
      pinchFilterRef.current.reset();
    }

    // 7. Holographic HUD Canvas Rendering
    if (ctx && canvas && showSkeleton) {
      hudRendererRef.current.render(
        ctx,
        canvas.width,
        canvas.height,
        smoothedLandmarks,
        bio,
        classification.gesture,
        classification.confidence,
        mirrorMode
      );
    } else if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [mirrorMode, onFreeze, onGestureDetected, onHandPosition, onSwipe, onZoomChange, sensitivity, showSkeleton]);

  // -------------------------------------------------------------
  // Camera & MediaPipe Initialization Engine
  // -------------------------------------------------------------
  const startTracking = async () => {
    if (isTracking || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Initialize MediaPipe Vision Tasks with GPU & CPU Fallback
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
      );

      try {
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.65,
          minHandPresenceConfidence: 0.65,
          minTrackingConfidence: 0.65,
        });
      } catch (gpuErr) {
        console.warn('[HandTracker] GPU delegate failed, falling back to CPU:', gpuErr);
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
      }

      // 2. Request Camera Stream with multi-resolution fallback
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      isTrackingRef.current = true;
      setIsTracking(true);
      setIsLoading(false);

      // 3. Ultra-Smooth 60 FPS Throttled Vision Loop with Mutex Protection
      let lastVideoTime = -1;
      let isInferenceInFlight = false;

      const detectLoop = () => {
        if (!isTrackingRef.current || !videoRef.current || !handLandmarkerRef.current) return;

        const video = videoRef.current;
        if (
          !video.paused &&
          video.readyState >= 2 &&
          video.videoWidth > 0
        ) {
          const currentTime = video.currentTime;
          if (currentTime !== lastVideoTime && !isInferenceInFlight) {
            lastVideoTime = currentTime;
            isInferenceInFlight = true;
            try {
              const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
              processHandResults(results);
            } catch (e) {
              console.warn('[HandTracker] Frame inference skipped:', e);
            } finally {
              isInferenceInFlight = false;
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(detectLoop);
      };

      detectLoop();
    } catch (err: any) {
      console.error('[HandTracker] Initialization error:', err);
      setError(err.message || 'Unable to access camera or load hand tracking model.');
      setIsLoading(false);
      stopTracking();
    }
  };

  const stopTracking = () => {
    isTrackingRef.current = false;
    setIsTracking(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (handLandmarkerRef.current) {
      try {
        handLandmarkerRef.current.close();
      } catch (err) {
        console.debug('HandLandmarker close error:', err);
      }
      handLandmarkerRef.current = null;
    }

    landmarkFilterBankRef.current.reset();
    gestureClassifierRef.current.reset();
    velocityTrackerRef.current.reset();
    pinchFilterRef.current.reset();

    setCurrentGesture('none');
    setConfidence(0);
    onGestureDetected?.('none');
    onFreeze?.(false);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gestureColor = GESTURE_COLORS[currentGesture] || GESTURE_COLORS.none;

  return (
    <>
      {/* Active Camera Floating Pill */}
      <AnimatePresence>
        {isTracking && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-cyan-500/40 text-cyan-300 shadow-glow backdrop-blur-md text-xs font-mono"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <Camera className="w-3.5 h-3.5" />
            <span className="font-semibold">Vision Tracking Active</span>
            <span className="text-[10px] text-slate-400 border-l border-white/20 pl-1.5">{fps} FPS</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Precision Hand Tracker Widget */}
      <motion.div
        drag
        dragMomentum={false}
        className={cn(
          'fixed z-40 rounded-2xl overflow-hidden shadow-lg backdrop-blur-xl border transition-all select-none',
          'bottom-4 right-4 sm:bottom-6 sm:right-6',
          'bg-white/90 border-black/[0.08] text-slate-900',
          isTracking ? 'ring-2 ring-[#16a875]/40 shadow-[0_10px_25px_-5px_rgba(22,168,117,0.25)]' : 'shadow-[0_4px_20px_-2px_rgba(15,30,25,0.08)]'
        )}
        style={{
          width: isExpanded ? 300 : 250,
        }}
      >
        {/* Widget Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-black/[0.06] bg-slate-50/50 cursor-move">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#e6f6ef] border border-[#bce8d5] flex items-center justify-center text-[#16a875]">
              <Hand className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-800 font-sans">QUANTUM HAND HUD</span>
              <span className="flex items-center gap-1 text-[9px] font-bold font-mono text-[#16a875]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16a875] animate-pulse" />
                {isTracking ? 'TRACKING' : 'IDLE'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowTutorial(true)}
              className="p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
              title="Gesture Guide"
            >
              <VideoOff className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
              title={isExpanded ? 'Collapse' : 'Options'}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <span className="text-slate-400 font-bold text-xs px-0.5">⋮</span>}
            </button>
          </div>
        </div>

        {/* Video & Skeleton Viewport */}
        {isExpanded && (
          <div className="p-3 space-y-2.5">
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
              {/* Hidden or visible video element */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn(
                  'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
                  mirrorMode ? '-scale-x-100' : '',
                  showVideo && isTracking ? 'opacity-80' : 'opacity-0'
                )}
              />

              {/* Holographic Skeleton 2D Canvas */}
              <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />

              {/* Inactive Standby Overlay */}
              {!isTracking && !isLoading && (
                <div className="text-center p-4 z-20 space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-400 mx-auto flex items-center justify-center">
                    <Zap className="w-4 h-4 text-sky-400" />
                  </div>
                  <p className="text-xs text-white font-semibold">Vision Control Ready</p>
                  <p className="text-[10px] text-slate-400">Enable webcam to control atoms</p>
                </div>
              )}

              {/* Loading Spinner */}
              {isLoading && (
                <div className="text-center p-4 z-20 space-y-1.5">
                  <RefreshCw className="w-5 h-5 animate-spin text-sky-400 mx-auto" />
                  <p className="text-xs text-slate-200 font-mono">Initializing Vision...</p>
                </div>
              )}

              {/* Viewport Floating Controls */}
              {isTracking && (
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className={cn('p-1 rounded text-xs', showVideo ? 'text-sky-400' : 'text-slate-500')}
                    title="Toggle Video Stream"
                  >
                    {showVideo ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => setShowSkeleton(!showSkeleton)}
                    className={cn('p-1 rounded text-xs', showSkeleton ? 'text-sky-400' : 'text-slate-500')}
                    title="Toggle Holographic Skeleton"
                  >
                    {showSkeleton ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
              )}

              {/* Live Handedness Badge */}
              {isTracking && confidence > 0 && (
                <div className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-mono text-slate-300 border border-white/10">
                  {handedness} Hand ({Math.round(confidence * 100)}%)
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Live Gesture Detection Banner */}
            {isTracking && (
              <div
                className="p-2 rounded-xl border flex items-center justify-between"
                style={{
                  backgroundColor: `${gestureColor.primary}12`,
                  borderColor: `${gestureColor.primary}40`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ backgroundColor: gestureColor.primary, boxShadow: `0 0 8px ${gestureColor.primary}` }}
                  />
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Command</div>
                    <div className="text-xs font-bold" style={{ color: gestureColor.primary }}>
                      {gestureColor.text}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-600">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            )}

            {/* Quick Sensitivity Controls */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Sensitivity</span>
                <span className="text-slate-800 font-bold">{sensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer h-1.5 bg-slate-200 rounded"
              />
            </div>

            {/* Main Action Buttons */}
            <div className="pt-1 flex gap-2">
              {!isTracking ? (
                <button
                  onClick={startTracking}
                  disabled={isLoading}
                  className="flex-1 py-2 px-3 rounded-xl font-sans text-xs font-bold bg-[#16a875] text-white hover:bg-[#087f5b] transition-all flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(22,168,117,0.25)]"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Enable Vision Control
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  className="flex-1 py-2 px-3 rounded-xl font-sans text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all flex items-center justify-center gap-1.5"
                >
                  <VideoOff className="w-3.5 h-3.5" />
                  Stop Vision
                </button>
              )}
            </div>
          </div>
        )}

        {/* Collapsed Pill State */}
        {!isExpanded && (
          <div className="px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-sans font-semibold text-slate-600">
                {isTracking ? gestureColor.text : 'Vision Off'}
              </span>
            </div>

            <button
              onClick={isTracking ? stopTracking : startTracking}
              disabled={isLoading}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-sans font-bold transition-all shadow-xs',
                isTracking
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-[#16a875] text-white hover:bg-[#087f5b] shadow-[0_2px_8px_rgba(22,168,117,0.25)]'
              )}
            >
              {isLoading ? '...' : isTracking ? 'Stop' : 'Start'}
            </button>
          </div>
        )}
      </motion.div>

      {/* Gesture Tutorial Guide Modal */}
      {showTutorial && <GestureTutorial onClose={() => setShowTutorial(false)} />}
    </>
  );
});
