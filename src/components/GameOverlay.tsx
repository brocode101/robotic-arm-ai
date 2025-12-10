import React, { useEffect, useRef, useState } from 'react';
import { RobotArm } from './RobotArm';
import { Point, distance } from '../utils/geometry';
import { motion, AnimatePresence } from 'framer-motion';

interface GameOverlayProps {
  handPosition: Point | null; // Normalized 0-1
  isGripping: boolean;
  width: number;
  height: number;
}

interface GameObject {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isGrabbed: boolean;
  type: 'ball' | 'cube';
}

const GRAVITY = 0.5;
const FRICTION = 0.98;
const BOUNCE = 0.7;
const THROW_MULTIPLIER = 0.3; // Sensitivity of throw

export const GameOverlay: React.FC<GameOverlayProps> = ({
  handPosition,
  isGripping,
  width,
  height,
}) => {
  const [objects, setObjects] = useState<GameObject[]>([
    { id: '1', x: 200, y: 300, vx: 0, vy: 0, color: '#F59E0B', isGrabbed: false, type: 'cube' },
    { id: '2', x: 300, y: 300, vx: 0, vy: 0, color: '#3B82F6', isGrabbed: false, type: 'ball' },
    { id: '3', x: 400, y: 300, vx: 0, vy: 0, color: '#10B981', isGrabbed: false, type: 'cube' },
  ]);
  const [score, setScore] = useState(0);
  const [lastHandPos, setLastHandPos] = useState<Point | null>(null);
  
  // Ref to store mutable state for the animation loop to avoid dependency staleness
  const stateRef = useRef({
    objects,
    handPosition,
    isGripping,
    lastHandPos,
    score
  });

  // Sync refs
  useEffect(() => {
    stateRef.current.handPosition = handPosition;
    stateRef.current.isGripping = isGripping;
    stateRef.current.objects = objects;
    stateRef.current.score = score;
  }, [handPosition, isGripping, objects, score]);

  // Physics Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      const { handPosition, isGripping, objects, lastHandPos } = stateRef.current;
      
      // Calculate hand velocity for throwing
      let handVx = 0;
      let handVy = 0;
      
      const currentHandPosPx = handPosition ? { x: handPosition.x * width, y: handPosition.y * height } : null;

      if (currentHandPosPx && lastHandPos) {
        handVx = (currentHandPosPx.x - lastHandPos.x);
        handVy = (currentHandPosPx.y - lastHandPos.y);
      }
      
      // Update last hand pos for next frame
      stateRef.current.lastHandPos = currentHandPosPx;


      const newObjects = objects.map(obj => {
        let { x, y, vx, vy, isGrabbed } = obj;

        // Interaction Logic
        if (currentHandPosPx) {
          const distToHand = distance({ x, y }, currentHandPosPx);
          
          // Grabbing logic
          if (isGripping && !isGrabbed && distToHand < 60) {
             // Check if we are already holding something? For simplicity, allow holding one or multiple if close
             // Ideally we filter to find the closest one.
             // Let's just grab if close.
             isGrabbed = true;
          }
          
          // Releasing logic
          if (!isGripping && isGrabbed) {
            isGrabbed = false;
            // Add throw velocity
            vx = handVx * THROW_MULTIPLIER * 60; // Scale up for effect
            vy = handVy * THROW_MULTIPLIER * 60;
          }

          // If grabbed, follow hand
          if (isGrabbed) {
            x = currentHandPosPx.x;
            y = currentHandPosPx.y;
            vx = 0;
            vy = 0;
          }
        } else {
            // Hand lost, drop object
            if (isGrabbed) isGrabbed = false;
        }

        // Physics if not grabbed
        if (!isGrabbed) {
          vy += GRAVITY;
          vx *= FRICTION;
          vy *= FRICTION;

          x += vx;
          y += vy;

          // Floor collision
          if (y > height - 40) {
            y = height - 40;
            vy *= -BOUNCE;
          }
          // Wall collision
          if (x < 20) { x = 20; vx *= -BOUNCE; }
          if (x > width - 20) { x = width - 20; vx *= -BOUNCE; }
        }

        return { ...obj, x, y, vx, vy, isGrabbed };
      });

      // Check bucket condition (Bucket is at bottom right)
      const bucketX = width - 100;
      const bucketY = height - 80;
      const bucketW = 120;
      
      const remainingObjects: GameObject[] = [];
      let newScore = stateRef.current.score;

      newObjects.forEach(obj => {
         // Check if inside bucket
         if (!obj.isGrabbed && obj.x > bucketX - bucketW/2 && obj.x < bucketX + bucketW/2 && obj.y > bucketY - 20) {
             newScore += 10;
             // Respawn object at top random
             remainingObjects.push({
                 ...obj,
                 x: Math.random() * (width - 200) + 50,
                 y: -50,
                 vx: 0,
                 vy: 0,
                 isGrabbed: false
             });
         } else {
             remainingObjects.push(obj);
         }
      });

      if (newScore !== stateRef.current.score) {
          setScore(newScore);
      }
      
      // Optimization: Only update state if something changed significantly or every frame?
      // React state updates every frame can be heavy.
      // But for < 10 objects it's usually fine on modern devices.
      setObjects(remainingObjects);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [width, height]); // Re-bind if dimensions change

  const currentHandPosPx = handPosition ? { x: handPosition.x * width, y: handPosition.y * height } : { x: width / 2, y: height / 2 };
  const basePos = { x: width / 2, y: height };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg width="100%" height="100%" className="absolute inset-0 z-10">
        {/* Robot Arm */}
        <RobotArm 
            target={currentHandPosPx} 
            isGripping={isGripping} 
            basePosition={basePos}
            armLength1={height * 0.35}
            armLength2={height * 0.3}
        />
        
        {/* Bucket */}
        <defs>
            <linearGradient id="bucketGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4B5563" />
                <stop offset="100%" stopColor="#1F2937" />
            </linearGradient>
        </defs>
        <path 
            d={`M ${width - 160} ${height} L ${width - 140} ${height - 100} L ${width - 40} ${height - 100} L ${width - 20} ${height} Z`} 
            fill="url(#bucketGrad)" 
            stroke="#374151" 
            strokeWidth={4}
        />
        <text x={width - 90} y={height - 50} textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">BUCKET</text>
      </svg>

      {/* Objects */}
      {objects.map(obj => (
        <div
          key={obj.id}
          className="absolute flex items-center justify-center shadow-lg"
          style={{
            transform: `translate(${obj.x - 25}px, ${obj.y - 25}px)`,
            width: 50,
            height: 50,
            backgroundColor: obj.color,
            borderRadius: obj.type === 'ball' ? '50%' : '8px',
            border: '2px solid rgba(255,255,255,0.5)',
            zIndex: 20
          }}
        >
            {obj.type === 'cube' ? '📦' : '⚽'}
        </div>
      ))}

      {/* Score */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-xl z-30 border border-gray-200">
        <div className="text-sm text-gray-500 uppercase tracking-wider font-bold">Score</div>
        <div className="text-4xl font-black text-indigo-600">{score}</div>
      </div>
      
      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white p-4 rounded-xl max-w-xs z-30">
        <h3 className="font-bold mb-1">How to play</h3>
        <ul className="text-sm space-y-1 opacity-90">
            <li>👋 Move hand to control robot</li>
            <li>✊ Pinch/Close fist to GRAB</li>
            <li>🖐 Open hand to THROW</li>
            <li>🎯 Drop items in the bucket!</li>
        </ul>
      </div>
    </div>
  );
};
