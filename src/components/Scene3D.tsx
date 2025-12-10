import { useFrame } from '@react-three/fiber';
import { Physics, useBox, usePlane, useSphere } from '@react-three/cannon';
import { useRef, useState, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { Environment, ContactShadows, Text, Float, Grid, Stars } from '@react-three/drei';

// --- MATERIALS (CYBERPUNK) ---
const materials = {
  robotBase: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.9 }), 
  robotOrange: new THREE.MeshStandardMaterial({ 
    color: '#f97316', 
    roughness: 0.2, 
    metalness: 0.5,
    emissive: '#f97316',
    emissiveIntensity: 0.5
  }), 
  robotWhite: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.3, metalness: 0.8 }),
  robotJoint: new THREE.MeshStandardMaterial({ color: '#020617', roughness: 0.5, metalness: 1.0 }), 
  gripper: new THREE.MeshStandardMaterial({ color: '#000000', roughness: 0.2, metalness: 1.0 }), 
  bucket: new THREE.MeshStandardMaterial({ 
    color: '#1e293b', 
    roughness: 0.2,
    metalness: 0.8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9
  }),
  pad: new THREE.MeshStandardMaterial({ 
    color: '#0ea5e9', 
    roughness: 0.1, 
    metalness: 0.5,
    emissive: '#0ea5e9',
    emissiveIntensity: 0.2
  }),
};

// --- UTILS ---
const solveIK = (target: THREE.Vector3, l1: number, l2: number) => {
  const x = target.x || 0;
  const y = target.y || 5;
  const z = target.z || 5;

  const thetaBase = Math.atan2(x, z);
  const r = Math.sqrt(x * x + z * z);
  const d = Math.sqrt(r * r + y * y);
  const reach = Math.min(d, l1 + l2 - 0.01);
  
  const cosTheta2 = (reach * reach - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const theta2 = Math.acos(Math.max(-1, Math.min(1, cosTheta2)));
  
  const alpha = Math.atan2(y, r);
  const cosBeta = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach);
  const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));
  
  const theta1 = alpha + beta; 
  
  return { 
    baseRot: thetaBase, 
    shoulderRot: Math.PI / 2 - theta1, 
    elbowRot: theta2 
  };
};

// --- COMPONENTS ---

const Floor = () => {
  const [ref] = usePlane(() => ({ 
    rotation: [-Math.PI / 2, 0, 0], 
    position: [0, -0.01, 0],
    material: { friction: 0.5, restitution: 0.2 }
  }));
  
  return (
    <group>
      <mesh ref={ref as any} visible={false}>
        <planeGeometry args={[100, 100]} />
      </mesh>
      {/* Glowing Cyber Grid */}
      <Grid 
        position={[0, 0.01, 0]} 
        args={[100, 100]} 
        cellColor="#0ea5e9" 
        sectionColor="#0ea5e9" 
        fadeDistance={50} 
        cellSize={2}
        sectionSize={10}
        sectionThickness={1.5}
        cellThickness={0.6}
      />
      {/* Subtle floor reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
         <planeGeometry args={[100, 100]} />
         <meshStandardMaterial color="#020617" roughness={0.1} metalness={0.8} />
      </mesh>
    </group>
  );
};

const Walls = () => {
  usePlane(() => ({ position: [0, 0, -25], rotation: [0, 0, 0] })); 
  usePlane(() => ({ position: [0, 0, 25], rotation: [0, Math.PI, 0] })); 
  usePlane(() => ({ position: [-30, 0, 0], rotation: [0, Math.PI/2, 0] })); 
  usePlane(() => ({ position: [30, 0, 0], rotation: [0, -Math.PI/2, 0] })); 
  return null;
};

const Bucket = ({ position }: { position: [number, number, number] }) => {
  const size = 5;
  const height = 4;
  const thickness = 0.3;
  
  useBox(() => ({ position: [position[0], height/2, position[2]], args: [size, thickness, size], type: 'Static' })); 
  useBox(() => ({ position: [position[0] - size/2, height/2 + 2, position[2]], args: [thickness, height, size], type: 'Static' })); 
  useBox(() => ({ position: [position[0] + size/2, height/2 + 2, position[2]], args: [thickness, height, size], type: 'Static' })); 
  useBox(() => ({ position: [position[0], height/2 + 2, position[2] - size/2], args: [size, height, thickness], type: 'Static' })); 
  useBox(() => ({ position: [position[0], height/2 + 2, position[2] + size/2], args: [size, height, thickness], type: 'Static' })); 

  useBox(() => ({
    isTrigger: true,
    position: [position[0], height/2 + 1, position[2]],
    args: [size - 1, 1, size - 1],
    onCollide: (e) => {
      if (e.body.name.startsWith('obj-')) {
        useGameStore.getState().incrementScore(1);
        const api = e.body;
        api.position.set((Math.random() - 0.5) * 15, 10, (Math.random() - 0.5) * 10 + 5);
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
      }
    }
  }));

  return (
    <group position={position}>
       <mesh position={[0, height/2, 0]} castShadow receiveShadow material={materials.bucket}>
          <boxGeometry args={[size + 0.2, height, size + 0.2]} />
       </mesh>
       {/* Glowing Rim */}
       <mesh position={[0, height, 0]}>
          <boxGeometry args={[size + 0.4, 0.1, size + 0.4]} />
          <meshBasicMaterial color="#0ea5e9" />
       </mesh>
       <mesh position={[0, 0.1, 0]} receiveShadow material={materials.pad}>
         <boxGeometry args={[size, 0.2, size]} />
       </mesh>
       
       <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
         <group position={[0, 6, 0]}>
            <Text 
                fontSize={0.6} 
                color="#0ea5e9" 
                anchorX="center" 
                anchorY="middle"
                font="https://fonts.gstatic.com/s/jetbrainsmono/v13/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0Pn5.woff"
            >
                CONTAINMENT
            </Text>
         </group>
       </Float>
    </group>
  );
};

const useObjectLogic = (api: any, ref: any, targetPos: THREE.Vector3, isGripping: boolean) => {
    const isGrabbed = useRef(false);
    const lastPos = useRef(new THREE.Vector3());
  
    useFrame(() => {
      if (!ref.current) return;
      const myPos = new THREE.Vector3(ref.current.position.x, ref.current.position.y, ref.current.position.z);
      
      if (myPos.y < -5) {
          api.position.set((Math.random() - 0.5) * 12, 8, (Math.random() - 0.5) * 8 + 5);
          api.velocity.set(0,0,0);
          api.angularVelocity.set(0,0,0);
          isGrabbed.current = false;
          return;
      }
  
      const dist = myPos.distanceTo(targetPos);
      if (isGripping && !isGrabbed.current && dist < 2.0) {
        isGrabbed.current = true;
      }
  
      if (!isGripping && isGrabbed.current) {
        isGrabbed.current = false;
        const throwVel = targetPos.clone().sub(lastPos.current).multiplyScalar(30);
        throwVel.clampLength(0, 25);
        api.velocity.set(throwVel.x, throwVel.y, throwVel.z);
      }
  
      if (isGrabbed.current) {
        api.position.set(targetPos.x, targetPos.y - 0.8, targetPos.z);
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
        lastPos.current.copy(targetPos);
      }
    });
};

const InteractiveBox = ({ position, color, name, targetPos, isGripping }: any) => {
    const [ref, api] = useBox(() => ({ mass: 2, position, args: [1.5, 1.5, 1.5], linearDamping: 0.5, angularDamping: 0.5 }));
    useObjectLogic(api, ref, targetPos, isGripping);
    return (
        <mesh ref={ref as any} castShadow receiveShadow name={`obj-${name}`}>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} emissive={color} emissiveIntensity={0.4} />
        </mesh>
    );
};

const InteractiveSphere = ({ position, color, name, targetPos, isGripping }: any) => {
    const [ref, api] = useSphere(() => ({ mass: 2, position, args: [0.9], linearDamping: 0.5, angularDamping: 0.5 }));
    useObjectLogic(api, ref, targetPos, isGripping);
    return (
        <mesh ref={ref as any} castShadow receiveShadow name={`obj-${name}`}>
            <sphereGeometry args={[0.9]} />
            <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} emissive={color} emissiveIntensity={0.4} />
        </mesh>
    );
};

const PhysicsManager = ({ targetPos, isGripping }: { targetPos: THREE.Vector3, isGripping: boolean }) => {
  const [objects] = useState(() => [
    { id: 'obj-1', pos: [-6, 5, 8] as [number, number, number], color: '#f59e0b', type: 'box' as const }, 
    { id: 'obj-2', pos: [-2, 5, 6] as [number, number, number], color: '#3b82f6', type: 'sphere' as const }, 
    { id: 'obj-3', pos: [2, 5, 9] as [number, number, number], color: '#10b981', type: 'box' as const }, 
    { id: 'obj-4', pos: [6, 5, 7] as [number, number, number], color: '#ef4444', type: 'sphere' as const }, 
    { id: 'obj-5', pos: [0, 5, 10] as [number, number, number], color: '#8b5cf6', type: 'box' as const }, 
  ]);

  return (
    <>
      {objects.map(obj => (
        obj.type === 'box' ? (
            <InteractiveBox key={obj.id} {...obj} name={obj.id} position={obj.pos} targetPos={targetPos} isGripping={isGripping} />
        ) : (
            <InteractiveSphere key={obj.id} {...obj} name={obj.id} position={obj.pos} targetPos={targetPos} isGripping={isGripping} />
        )
      ))}
    </>
  );
};

const RobotArmModel = ({ targetPos, isGripping }: { targetPos: THREE.Vector3, isGripping: boolean }) => {
  const l1 = 8; 
  const l2 = 8; 
  const { baseRot, shoulderRot, elbowRot } = solveIK(targetPos, l1, l2);

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={materials.robotBase}>
        <cylinderGeometry args={[2, 2.5, 1, 32]} />
      </mesh>
      {/* Neon Ring Base */}
      <mesh position={[0, 0.2, 0]}>
         <torusGeometry args={[2.6, 0.1, 16, 32]} />
         <meshBasicMaterial color="#0ea5e9" />
      </mesh>

      <group rotation={[0, baseRot, 0]}>
         <mesh position={[0, 1.5, 0]} castShadow material={materials.robotWhite}>
            <cylinderGeometry args={[1.5, 1.5, 2, 32]} />
         </mesh>
         <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI/2]} castShadow material={materials.robotJoint}>
             <cylinderGeometry args={[1.2, 1.2, 3.5, 32]} />
         </mesh>
         <group position={[0, 2.5, 0]} rotation={[shoulderRot, 0, 0]}>
            <mesh position={[0, l1/2, 0]} castShadow material={materials.robotWhite}>
               <boxGeometry args={[1.5, l1, 1.5]} />
            </mesh>
            {/* Emissive Strip */}
            <mesh position={[0, l1/2, 0.76]}>
               <boxGeometry args={[0.5, l1 - 1, 0.1]} />
               <meshBasicMaterial color="#0ea5e9" />
            </mesh>

            <mesh position={[0, l1, 0]} rotation={[0, 0, Math.PI/2]} castShadow material={materials.robotJoint}>
               <cylinderGeometry args={[1, 1, 3, 32]} />
            </mesh>
            <group position={[0, l1, 0]} rotation={[elbowRot, 0, 0]}>
               <mesh position={[0, l2/2, 0]} castShadow material={materials.robotOrange}>
                  <boxGeometry args={[1.2, l2, 1.2]} />
               </mesh>
               <mesh position={[0, l2, 0]} castShadow material={materials.robotJoint}>
                  <cylinderGeometry args={[0.8, 0.8, 1, 32]} />
               </mesh>
               <group position={[0, l2 + 0.5, 0]}>
                  <mesh position={[0, 0.2, 0]} castShadow material={materials.gripper}>
                     <boxGeometry args={[2, 0.4, 0.8]} />
                  </mesh>
                  <group>
                     <mesh position={[isGripping ? 0.4 : 0.8, 1, 0]} castShadow material={materials.gripper}>
                        <boxGeometry args={[0.2, 1.5, 0.5]} />
                     </mesh>
                     {/* Glowing Tips */}
                     <mesh position={[isGripping ? 0.4 : 0.8, 0.4, 0]}>
                        <boxGeometry args={[0.22, 0.2, 0.52]} />
                        <meshBasicMaterial color="#f97316" />
                     </mesh>

                     <mesh position={[isGripping ? -0.4 : -0.8, 1, 0]} castShadow material={materials.gripper}>
                        <boxGeometry args={[0.2, 1.5, 0.5]} />
                     </mesh>
                     <mesh position={[isGripping ? -0.4 : -0.8, 0.4, 0]}>
                        <boxGeometry args={[0.22, 0.2, 0.52]} />
                        <meshBasicMaterial color="#f97316" />
                     </mesh>
                  </group>
               </group>
            </group>
         </group>
      </group>
    </group>
  );
};

const TargetCursor = ({ position, isGripping }: { position: THREE.Vector3, isGripping: boolean }) => {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={isGripping ? "#f97316" : "#0ea5e9"} />
      </mesh>
      <mesh position={[0, -position.y + 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <ringGeometry args={[0.4, 0.5, 32]} />
         <meshBasicMaterial color={isGripping ? "#f97316" : "#0ea5e9"} transparent opacity={0.6} />
      </mesh>
      {/* Laser Line */}
      <mesh position={[0, -position.y/2, 0]}>
         <cylinderGeometry args={[0.02, 0.02, position.y, 8]} />
         <meshBasicMaterial color={isGripping ? "#f97316" : "#0ea5e9"} transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

const SceneEnvironment = () => {
    return (
        <>
            <Environment preset="city" />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </>
    );
};

export const Scene3D = () => {
  const { handPosition, isGripping } = useGameStore();
  
  const targetPos = useMemo(() => {
    if (!handPosition) return new THREE.Vector3(0, 8, 8); 
    const x = (handPosition.x - 0.5) * 24; 
    const y = -(handPosition.y - 0.5) * 16 + 8; 
    const z = 8 - Math.abs(x) * 0.1; 
    const clampedY = Math.max(0.5, y);
    return new THREE.Vector3(x, clampedY, z);
  }, [handPosition]);

  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 40, 120]} />

      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#0ea5e9" />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#f97316" />
      
      <Suspense fallback={null}>
         <SceneEnvironment />
      </Suspense>

      <Physics gravity={[0, -20, 0]}>
        <Floor />
        <Bucket position={[12, 0, 8]} />
        <PhysicsManager targetPos={targetPos} isGripping={isGripping} />
        <Walls />
      </Physics>
      
      <RobotArmModel targetPos={targetPos} isGripping={isGripping} />
      <TargetCursor position={targetPos} isGripping={isGripping} />
      
      <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={100} blur={2} far={4} color="#000000" />
    </>
  );
};
