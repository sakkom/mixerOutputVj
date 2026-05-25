import * as THREE from "three";

export interface AudioRefProps {
  audioCtx: AudioContext;
  analyser: [AnalyserNode, AnalyserNode];
  buffer: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>];
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
