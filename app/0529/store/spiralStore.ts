import { create } from "zustand";
import { ObjectType } from "../value/utils/interface";

interface SpiralStore {
  threshold: number;
  updateThreshold: (threshold: number) => void;
  speed: number;
  updateSpeed: (speed: number) => void;
}

export const useSpiralStore = create<SpiralStore>((set) => ({
  threshold: 0,
  updateThreshold: (threshold) => set({ threshold }),
  speed: 1,
  updateSpeed: (speed) => set({ speed }),
}));
