import React, { useEffect, useRef, useState, Suspense } from 'react';
import Webcam from 'react-webcam';
import { Canvas } from '@react-three/fiber';
import { Scene3D } from './components/Scene3D';
import { initializeHandLandmarker, detectHands } from './utils/handTracking';
import { useGameStore } from './store';
import { Loader2, AlertCircle, Play, Hand, Box, RefreshCw, Cpu, Activity, Target } from 'lucide-react';

// Loading fallback for 3D scene
const SceneLoader = () => (
  <group>
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#0ea5e9" wireframe />
    </mesh>
  </group>
);

function App() {
  const videoRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [showForceStart, setShowForceStart] = useState(false);
  
  const score = useGameStore((state) => state.score);
  const isGripping = useGameStore((state) => state.isGripping);
  const handPosition = useGameStore((state) => state.handPosition);

  // 1. Initialize AI Model with Timeout
  useEffect(() => {
    const init = async () => {
      const forceStartTimer = setTimeout(() => setShowForceStart(true), 5000);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Initialization timed out")), 15000)
      );

      try {
        await Promise.race([initializeHandLandmarker(), timeoutPromise]);
        setModelReady(true);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("AI Model Load Failed (Network Timeout)");
        setLoading(false);
      } finally {
        clearTimeout(forceStartTimer);
      }
    };
    init();
  }, []);

  // 2. Detection Loop
  useEffect(() => {
    if (!cameraActive || !modelReady || demoMode) return;

    let animationFrameId: number;
    let lastTime = -1;

    const loop = () => {
      const video = videoRef.current?.video;
      if (video && video.readyState >= 2) {
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          const results = detectHands(video, performance.now());
          
          if (results && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            
            const dist = Math.sqrt(
              Math.pow(thumbTip.x - indexTip.x, 2) + 
              Math.pow(thumbTip.y - indexTip.y, 2)
            );
            const gripping = dist < 0.1; 

            useGameStore.getState().setHandData(
              { x: 1 - indexTip.x, y: indexTip.y, z: 0 }, 
              gripping
            );
          }
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [cameraActive, modelReady, demoMode]);

  // Demo Mode Loop
  useEffect(() => {
    if (!demoMode) return;
    let time = 0;
    const interval = setInterval(() => {
      time += 0.02;
      const x = 0.5 + Math.sin(time) * 0.3;
      const y = 0.5 + Math.cos(time * 1.5) * 0.3;
      const gripping = Math.sin(time * 3) > 0.5;
      useGameStore.getState().setHandData({ x, y, z: 0 }, gripping);
    }, 16);
    return () => clearInterval(interval);
  }, [demoMode]);

  return (
    <div className="relative w-full h-screen bg-cyber-bg overflow-hidden font-mono select-none text-cyber-text">
      
      {/* Scanline Overlay */}
      <div className="scanlines"></div>

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0, 25, 45], fov: 35 }}>
           <Suspense fallback={<SceneLoader />}>
              <Scene3D />
           </Suspense>
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between">
        
        {/* Header / Score */}
        <div className="flex justify-between items-start">
           <div className="hud-panel p-4 flex items-center gap-4 hud-border">
              <div className="bg-cyber-primary/20 p-2 rounded-sm border border-cyber-primary/50">
                 <Box className="w-6 h-6 text-cyber-primary" />
              </div>
              <div>
                 <div className="text-[10px] font-bold text-cyber-muted uppercase tracking-widest">Units Processed</div>
                 <div className="text-3xl font-black text-white tracking-widest tabular-nums font-mono shadow-neon-blue drop-shadow-lg">
                    {score.toString().padStart(3, '0')}
                 </div>
              </div>
           </div>

           <div className="hud-panel px-8 py-4 border-b-2 border-cyber-accent">
              <h1 className="text-2xl font-bold text-white tracking-widest flex items-center gap-3">
                <Cpu className="w-6 h-6 text-cyber-accent animate-pulse" />
                CYBER<span className="text-cyber-accent">ARM</span>.OS
              </h1>
              <div className="text-[10px] text-right text-cyber-muted mt-1">V.9.0.1 // ONLINE</div>
           </div>
        </div>

        {/* Bottom Area */}
        <div className="flex justify-between items-end w-full mt-auto">
            
            {/* Instructions */}
            <div className="hud-panel p-5 max-w-xs space-y-4 border-l-2 border-cyber-accent">
               <div className="flex items-center gap-2 text-cyber-accent font-bold border-b border-slate-800 pb-2 uppercase tracking-wider text-xs">
                  <Activity className="w-4 h-4" /> Control Protocols
               </div>
               <div className="space-y-3 text-xs text-cyber-muted font-mono">
                  <div className="flex justify-between items-center">
                     <span>&gt; Move Hand</span>
                     <span className="text-white bg-slate-800 px-2 py-0.5 rounded-sm">POSITION</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span>&gt; Pinch Fingers</span>
                     <span className="text-cyber-bg bg-cyber-accent px-2 py-0.5 rounded-sm font-bold">GRAB</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span>&gt; Release</span>
                     <span className="text-white bg-slate-800 px-2 py-0.5 rounded-sm">THROW</span>
                  </div>
               </div>
               <button 
                  onClick={() => window.location.reload()}
                  className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyber-primary text-xs font-bold rounded-sm transition-all pointer-events-auto flex items-center justify-center gap-2 uppercase tracking-wider hover:border-cyber-primary"
               >
                  <RefreshCw className="w-3 h-3" /> Reboot System
               </button>
            </div>

            {/* Status Indicator */}
            <div className="mb-6 flex flex-col items-center gap-3">
               <div className={`
                  px-8 py-2 rounded-sm font-bold text-xs shadow-lg transition-all duration-300 flex items-center gap-3 border
                  ${handPosition 
                    ? 'bg-cyber-primary/10 border-cyber-primary text-cyber-primary shadow-neon-blue' 
                    : 'bg-slate-900/80 border-slate-700 text-slate-500'}
               `}>
                  <Target className={`w-4 h-4 ${handPosition ? 'animate-spin' : ''}`} />
                  {handPosition ? "TARGET LOCKED" : "SEARCHING SIGNAL..."}
               </div>
               
               {isGripping && (
                  <div className="bg-cyber-accent text-cyber-bg px-6 py-1 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] shadow-neon-orange animate-pulse border border-white/20">
                     MAGNETIC LOCK ACTIVE
                  </div>
               )}
            </div>

            {/* Webcam Feed */}
            {cameraActive && !demoMode && (
              <div className="relative w-64 h-48 bg-black rounded-sm overflow-hidden shadow-2xl border border-cyber-primary/30 pointer-events-auto group">
                <Webcam
                  ref={videoRef}
                  mirrored
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity grayscale contrast-125"
                  videoConstraints={{ facingMode: "user" }}
                />
                {/* HUD Overlay on Camera */}
                <div className="absolute inset-0 border-2 border-cyber-primary/20 m-1"></div>
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyber-primary"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyber-primary"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyber-primary"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyber-primary"></div>
                
                <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1 text-[10px] text-cyber-primary font-mono border border-cyber-primary/30">
                   CAM_FEED_01 // LIVE
                </div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>
            )}
        </div>
      </div>

      {/* Loading / Start Screen */}
      {(!cameraActive && !demoMode) && (
        <div className="absolute inset-0 z-50 bg-cyber-bg flex flex-col items-center justify-center p-4">
          <div className="scanlines"></div>
          
          {loading && !error && (
             <div className="text-center flex flex-col items-center z-10">
                <div className="relative">
                    <div className="absolute inset-0 bg-cyber-primary/20 blur-xl rounded-full"></div>
                    <Loader2 className="w-16 h-16 text-cyber-primary animate-spin mb-6 relative z-10" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-widest font-mono">INITIALIZING CYBERNETICS</h2>
                <p className="text-cyber-primary/60 text-sm mt-2 font-mono animate-pulse">Calibrating neural sensors...</p>
                
                {showForceStart && (
                  <button 
                    onClick={() => { setDemoMode(true); setCameraActive(true); }}
                    className="mt-12 flex items-center gap-2 px-8 py-3 bg-transparent border border-cyber-muted hover:border-white hover:bg-white/5 text-white font-bold transition-all rounded-sm uppercase tracking-widest text-xs"
                  >
                    <Play className="w-4 h-4" /> Bypass Sequence (Demo)
                  </button>
                )}
             </div>
          )}

          {error && (
             <div className="text-center max-w-md bg-slate-900/90 p-8 rounded-sm shadow-2xl border border-red-500/50 z-10 backdrop-blur-xl">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2 font-mono">SYSTEM FAILURE</h2>
                <p className="text-slate-400 text-sm mb-8 font-mono">{error}</p>
                <div className="flex gap-4 justify-center">
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-sm text-white font-bold text-xs uppercase tracking-wider"
                    >
                      Retry Boot
                    </button>
                    <button 
                      onClick={() => { setDemoMode(true); setCameraActive(true); }}
                      className="px-6 py-2 bg-cyber-accent hover:bg-orange-600 text-cyber-bg rounded-sm font-bold text-xs uppercase tracking-wider"
                    >
                      Enter Safe Mode
                    </button>
                </div>
             </div>
          )}

          {!loading && !error && !cameraActive && (
             <div className="bg-slate-900/80 backdrop-blur-xl p-12 rounded-sm shadow-2xl max-w-2xl w-full text-center border border-cyber-primary/30 z-10 relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-primary to-transparent opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-accent to-transparent opacity-50"></div>

                <div className="w-24 h-24 bg-cyber-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-cyber-primary/30 shadow-neon-blue">
                   <Cpu className="w-12 h-12 text-cyber-primary" />
                </div>
                
                <h1 className="text-4xl font-black text-white mb-4 tracking-tighter font-mono">
                   CYBER<span className="text-cyber-primary">ARM</span> INTERFACE
                </h1>
                <p className="text-slate-400 mb-10 leading-relaxed font-mono text-sm max-w-md mx-auto">
                   Neural link established. Hand gesture protocols active. 
                   <br/>
                   <span className="text-cyber-accent">Mission: Sort hazardous materials into the containment unit.</span>
                </p>
                
                <div className="space-y-4 max-w-xs mx-auto">
                    <button 
                      onClick={() => setCameraActive(true)}
                      className="w-full py-4 bg-cyber-primary hover:bg-cyan-400 text-cyber-bg rounded-sm font-bold text-sm uppercase tracking-widest shadow-neon-blue transition-all flex items-center justify-center gap-3"
                    >
                      <Activity className="w-4 h-4" /> Engage Link
                    </button>
                    
                    <button 
                      onClick={() => { setDemoMode(true); setCameraActive(true); }}
                      className="w-full py-3 text-slate-500 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors border border-transparent hover:border-slate-700 rounded-sm"
                    >
                      Run Simulation
                    </button>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
