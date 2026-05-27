import { create } from "zustand";
import { VisualParams } from "../value/utils/interface";

type Selector = "s" | "m" | "sm" | null;
export type LayerPattern = "s" | "m" | "sm" | "ms" | null;

export interface Layer {
  pattern: LayerPattern;
  alphas: number[];
}

interface VisualParamsStore {
  stereo: VisualParams;
  updateStereo: (value: VisualParams) => void;
  mono: VisualParams;
  updateMono: (value: VisualParams) => void;
  selector: Selector;
  updateSelector: (selector: Selector) => void;
  layer: Layer;
  updateLayer: (layer: Layer) => void;
}

export const useVisualParamsStore = create<VisualParamsStore>((set) => ({
  stereo: { loopNum: 1, bold: 0.005 },
  updateStereo: (value) => set({ stereo: value }),
  mono: { loopNum: 1, bold: 0.005 },
  updateMono: (value) => set({ mono: value }),
  selector: null,
  updateSelector: (selector) => set({ selector }),
  layer: { pattern: null, alphas: [0, 0] },
  updateLayer: (layer) => set({ layer }),
}));
