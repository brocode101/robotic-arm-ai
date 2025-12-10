// Utility functions for geometry and physics

export type Point = { x: number; y: number };
export type Vector = { x: number; y: number };

export const distance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Simple Inverse Kinematics for a 2-joint arm
// Returns angles for shoulder and elbow
export const solveIK = (
  target: Point,
  base: Point,
  L1: number,
  L2: number
): { theta1: number; theta2: number } | null => {
  // Translate target to base frame
  const x = target.x - base.x;
  const y = target.y - base.y;

  const dist = Math.sqrt(x * x + y * y);

  // Target unreachable
  if (dist > L1 + L2) {
    // Just point towards the target
    const angle = Math.atan2(y, x);
    return { theta1: angle, theta2: 0 };
  }

  // Law of Cosines
  const cos2 = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  const theta2 = Math.acos(Math.max(-1, Math.min(1, cos2))); // Clamp for safety

  const k1 = L1 + L2 * Math.cos(theta2);
  const k2 = L2 * Math.sin(theta2);
  const theta1 = Math.atan2(y, x) - Math.atan2(k2, k1);

  return { theta1, theta2 };
};

export const radToDeg = (rad: number) => (rad * 180) / Math.PI;
