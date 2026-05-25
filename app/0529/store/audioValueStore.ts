import { create } from "zustand";

interface AudioValueStore {
  bpm: number;
  updateBpm: (bpm: number) => void;
  sampleRate: number;
  updateSampleRate: (sampleRate: number) => void;
  fftSize: [number, number];
  updateFftSize: (ch: 0 | 1, fftSize: number) => void;
  smooths: [number, number];
  updateSmooth: (smooths: [number, number]) => void;
  pmAverWindow: number;
  updatePmAverWindow: (widows: number) => void;
  amp: number;
  updateAmp: (amp: number) => void;
}

export const useAudioValueStore = create<AudioValueStore>((set) => ({
  bpm: 0,
  updateBpm: (bpm) => set({ bpm }),
  sampleRate: 44100,
  updateSampleRate: (sampleRate) => set({ sampleRate }),
  fftSize: [2048, 2048],
  updateFftSize: (ch, fftSize) =>
    set((s) => {
      const now = [...s.fftSize] as [number, number];
      now[ch] = fftSize;
      return { fftSize: now };
    }),
  smooths: [0.5, 0],
  updateSmooth: (smooths) => set({ smooths }),
  pmAverWindow: 10,
  updatePmAverWindow: (widow) => set({ pmAverWindow: widow }),
  amp: 1,
  updateAmp: (amp) => set({ amp: amp }),
}));
