import * as THREE from "three";
import { stereoScene } from "../graph/stereo";
import { monoScene } from "../graph/mono";
import { AudioTexs, ThreeFloat32Array } from "./interface";

export function setThree(canvas: HTMLCanvasElement) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(W * 2, H, false);
  renderer.setScissorTest(true);
  return { camera, renderer, W, H };
}

export function createTex(fBuffer: Float32Array<ArrayBuffer>) {
  const texture = new THREE.DataTexture(
    fBuffer,
    fBuffer.length,
    1,
    THREE.RedFormat,
    THREE.FloatType,
  );
  texture.needsUpdate = true;
  return texture;
}

type StereoObserver = ReturnType<typeof stereoScene>;
type MonoObserver = ReturnType<typeof monoScene>;
export function updateCanvas(
  audioTexs: [THREE.DataTexture, THREE.DataTexture, THREE.DataTexture],
  stereoObserver: StereoObserver,
  monoObserver: MonoObserver,
) {
  audioTexs.forEach((tex) => {
    if (tex) {
      tex.needsUpdate = true;
    }
  });

  stereoObserver.update([audioTexs[0]!, audioTexs[1]!]);
  monoObserver.update(audioTexs[2]!);
}

export function initObserver(aduioTexs: AudioTexs) {
  const scene0 = new THREE.Scene();
  const scene1 = new THREE.Scene();
  const stereoObserver = stereoScene(scene0);
  stereoObserver.init([aduioTexs[0]!, aduioTexs[1]!]);
  const monoObserver = monoScene(scene1);
  monoObserver.init(aduioTexs[2]!);

  return { stereoObserver, monoObserver, scene0, scene1 };
}

export function initAudioTexs(
  aduioTexs: AudioTexs,
  outputBuffer: ThreeFloat32Array,
) {
  for (let ch = 0; ch < 2; ch++) {
    const tex = createTex(outputBuffer[ch]);
    aduioTexs[ch] = tex;
  }
  const tex = createTex(outputBuffer[2]);
  aduioTexs[2] = tex;
}
