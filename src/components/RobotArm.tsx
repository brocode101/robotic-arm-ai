import React, { useMemo } from 'react';
import { Point, solveIK, radToDeg } from '../utils/geometry';
import { motion } from 'framer-motion';

interface RobotArmProps {
  target: Point; // The position the arm is trying to reach
  isGripping: boolean;
  basePosition: Point;
  armLength1?: number;
  armLength2?: number;
}

export const RobotArm: React.FC<RobotArmProps> = ({
  target,
  isGripping,
  basePosition,
  armLength1 = 180,
  armLength2 = 160,
}) => {
  // Calculate Joint Angles
  const angles = useMemo(() => {
    // Invert Y for calculation because SVG Y grows downwards, but math usually assumes Y up.
    // However, our screen coordinates are Y down, so we just pass them in.
    // We might need to adjust the base logic depending on where (0,0) is.
    return solveIK(target, basePosition, armLength1, armLength2);
  }, [target, basePosition, armLength1, armLength2]);

  if (!angles) return null;

  const { theta1, theta2 } = angles;

  // Calculate joint positions for visualization
  const elbowX = basePosition.x + armLength1 * Math.cos(theta1);
  const elbowY = basePosition.y + armLength1 * Math.sin(theta1);

  const wristX = elbowX + armLength2 * Math.cos(theta1 + theta2);
  const wristY = elbowY + armLength2 * Math.sin(theta1 + theta2);

  // Rotation for the gripper (pointing slightly down or towards movement could be cool, keeping it simple)
  const gripperRotation = radToDeg(theta1 + theta2);

  return (
    <g className="pointer-events-none">
      {/* Base */}
      <circle cx={basePosition.x} cy={basePosition.y} r={20} fill="#374151" stroke="#1F2937" strokeWidth={4} />
      
      {/* Upper Arm */}
      <line
        x1={basePosition.x}
        y1={basePosition.y}
        x2={elbowX}
        y2={elbowY}
        stroke="#4B5563"
        strokeWidth={24}
        strokeLinecap="round"
      />
      <line
        x1={basePosition.x}
        y1={basePosition.y}
        x2={elbowX}
        y2={elbowY}
        stroke="#9CA3AF"
        strokeWidth={8}
        strokeLinecap="round"
        className="opacity-20"
      />

      {/* Elbow Joint */}
      <circle cx={elbowX} cy={elbowY} r={15} fill="#374151" stroke="#1F2937" strokeWidth={3} />

      {/* Forearm */}
      <line
        x1={elbowX}
        y1={elbowY}
        x2={wristX}
        y2={wristY}
        stroke="#6B7280"
        strokeWidth={18}
        strokeLinecap="round"
      />
       <line
        x1={elbowX}
        y1={elbowY}
        x2={wristX}
        y2={wristY}
        stroke="#D1D5DB"
        strokeWidth={6}
        strokeLinecap="round"
        className="opacity-20"
      />

      {/* Wrist Joint */}
      <circle cx={wristX} cy={wristY} r={12} fill="#374151" />

      {/* Gripper */}
      <g transform={`translate(${wristX}, ${wristY}) rotate(${gripperRotation})`}>
        {/* Gripper Base */}
        <rect x={-10} y={-15} width={20} height={30} fill="#1F2937" rx={4} />
        
        {/* Left Finger */}
        <motion.path
          d="M -8 -5 L -8 -35 L -18 -45"
          stroke="#EF4444"
          strokeWidth={6}
          fill="none"
          animate={{ rotate: isGripping ? 15 : -15, translateX: isGripping ? 5 : 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
        
        {/* Right Finger */}
        <motion.path
          d="M 8 -5 L 8 -35 L 18 -45"
          stroke="#EF4444"
          strokeWidth={6}
          fill="none"
          animate={{ rotate: isGripping ? -15 : 15, translateX: isGripping ? -5 : 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
      </g>
    </g>
  );
};
