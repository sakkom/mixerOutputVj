import { create } from "zustand";

export interface BirdsEyeProps {
  isBirdsEye: number;
}

interface BirdsEyeStore {
  isBirdsEye: number;
  updateIsBirdEye: (isBirdsEye: number) => void;
}

export const useBirdsEyeStore = create<BirdsEyeStore>((set) => ({
  isBirdsEye: 0,
  updateIsBirdEye: (isBirdsEye) => set({ isBirdsEye }),
}));
