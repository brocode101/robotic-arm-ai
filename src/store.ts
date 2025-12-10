import { create } from 'zustand';

interface GameState {
  score: number;
  incrementScore: (val: number) => void;
  handPosition: { x: number; y: number; z: number } | null; // Normalized 3D coords
  isGripping: boolean;
  setHandData: (pos: { x: number; y: number; z: number } | null, gripping: boolean) => void;
}

// Standard Zustand Hook Store
export const useGameStore = create<GameState>((set) => ({
  score: 0,
  incrementScore: (val) => set((state) => ({ score: state.score + val })),
  handPosition: null,
  isGripping: false,
  setHandData: (pos, gripping) => set({ handPosition: pos, isGripping: gripping }),
}));
