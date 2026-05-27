import { create } from "zustand";
import { VisualParams } from "../value/utils/interface";

type Selector = "s" | "m" | "sm" | null;

interface VisualParamsStore {
  stereo: VisualParams;
  updateStereo: (value: VisualParams) => void;
  mono: VisualParams;
  updateMono: (value: VisualParams) => void;
  selector: Selector;
  updateSelector: (status: Selector) => void;
}

export const useVisualParamsStore = create<VisualParamsStore>((set) => ({
  stereo: { loopNum: 1, bold: 0.005 },
  updateStereo: (value) => set({ stereo: value }),
  mono: { loopNum: 1, bold: 0.005 },
  updateMono: (value) => set({ mono: value }),
  selector: null,
  updateSelector: (status) => set({ selector: status }),
}));
