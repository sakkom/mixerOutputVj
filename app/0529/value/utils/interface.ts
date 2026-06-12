import * as THREE from "three";
import { Layer } from "../../store/visualParamsStore";
import { BirdsEyeProps } from "../../store/birdsEyeStore";

export interface AudioRefProps {
  audioCtx: AudioContext;
  analyser: [AnalyserNode, AnalyserNode];
  buffer: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>];
}

export interface OriginAudioRefProps {
  audioCtx: AudioContext;
  analyser: AnalyserNode;
  domainBuffer: Float32Array<ArrayBuffer>;
  fftBuffer: Uint8Array<ArrayBuffer>;
  gain: number;
}

export type ThreeFloat32Array = [
  Float32Array<ArrayBuffer>,
  Float32Array<ArrayBuffer>,
  Float32Array<ArrayBuffer>,
];

export type AudioTexs = [
  THREE.DataTexture | null,
  THREE.DataTexture | null,
  THREE.DataTexture | null,
];

export interface VisualParams {
  loopNum: number;
  bold: number;
  isCircle: number;
  alphas?: number[];
  isPinPong?: number;
  isCircleMove?: number;
  isCircleMoveColor?: number;
  objectType?: ObjectType;
}

export interface OutputVisualParams {
  stereo: VisualParams;
  mono: VisualParams;
  layer: Layer;
  bpmKick: number;
  birdsEye: BirdsEyeProps;
  bpm: number;
}

export type ObjectType = "Mesh" | "Points";
// export type ObjectClass = THREE.Mesh | THREE.Points;

/*0610
visual.tsで主に使用。ただcontroller側のtex更新にも使えるかも
*/
export interface UpdateTexInterface {
  texs: THREE.DataTexture[];
  texsBuffer: Float32Array<ArrayBuffer>[];
}

export type DoubleDataTexture = [THREE.DataTexture, THREE.DataTexture];

export interface SpiralInterface {
  threshold: number;
  morphSpeed: number;
}
