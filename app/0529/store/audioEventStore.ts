import { create } from "zustand";

interface VisualParamsStore {
  bpm: number;
  updateBpm: (bpm: number) => void;
  isActive: boolean;
  bpmKick: number;
  updateIsActive: (isActive: boolean) => void;
  updateBpmKick: (bpmKick: number) => void;
  rms: number;
  updateRms: (rmsKick: number) => void;
}

export const useAudioEventStore = create<VisualParamsStore>((set) => ({
  bpm: 0,
  updateBpm: (bpm) => set({ bpm }),
  isActive: false,
  updateIsActive: (isActive: boolean) => set({ isActive }),
  bpmKick: 0,
  updateBpmKick: (bpmKick) => set({ bpmKick }),
  rms: 0,
  updateRms: (rms) => set({ rms }),
}));
