import { create } from "zustand";
import { ObjectType, VisualParams } from "../value/utils/interface";

export type Selector = "s" | "m" | "sm";
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
  isCircle: [number, number]; //button
  updateIsCircle: (isCircle: [number, number]) => void;
  isPinpong: [number, number];
  updateIsPingPong: (isPinpong: [number, number]) => void;
  isCircleMove: [number, number];
  updateIsCiecleMove: (isCircleMove: [number, number]) => void;
  isCircleMoveColor: [number, number];
  updateIsCiecleMoveColor: (isCircleMoveColor: [number, number]) => void;
  monoObjectType: ObjectType;
  updateMonoObjectType: (types: ObjectType) => void;
  stereoObjectType: ObjectType;
  updateStereoObjectType: (types: ObjectType) => void;
}

export const useVisualParamsStore = create<VisualParamsStore>((set) => ({
  stereo: { loopNum: 1, bold: 0.005, isCircle: 0 },
  updateStereo: (value) => set({ stereo: value }),
  mono: { loopNum: 1, bold: 0.005, isCircle: 1 },
  updateMono: (value) => set({ mono: value }),
  selector: "s",
  updateSelector: (selector) => set({ selector }),
  layer: { pattern: null, alphas: [0, 0] },
  // layer: { pattern: , alphas: [1, 1] },
  updateLayer: (layer) => set({ layer }),
  isCircle: [0, 1] as [number, number],
  updateIsCircle: (isCircle: [number, number]) => set({ isCircle }),
  isPinpong: [0, 0] as [number, number],
  updateIsPingPong: (isPinpong: [number, number]) => set({ isPinpong }),
  isCircleMove: [0, 0] as [number, number],
  updateIsCiecleMove: (isCircleMove: [number, number]) => set({ isCircleMove }),
  isCircleMoveColor: [0, 0] as [number, number],
  updateIsCiecleMoveColor: (isCircleMoveColor: [number, number]) =>
    set({ isCircleMoveColor }),
  monoObjectType: "Mesh",
  updateMonoObjectType: (type) => set({ monoObjectType: type }),
  stereoObjectType: "Mesh",
  updateStereoObjectType: (type) => set({ stereoObjectType: type }),
}));
