import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/Addons.js";
import { stereoShader, monoShader } from "./shader";
import {
  createComposer,
  createPinPong,
  createTex,
  EdgeInterface,
  output,
  updateMonoTex,
  updateStereoTex,
} from "./utils/visual";
import { VisualParams } from "./value/utils/interface";

export const stereoVisual = () => {
  let edge: EdgeInterface;
  let composer: EffectComposer;
  let texs: [THREE.DataTexture, THREE.DataTexture];

  const uniforms = {
    uTime: { value: 0 },
    /*wave params */
    uAudioTex: { value: [new THREE.DataTexture(), new THREE.DataTexture()] },
    uLoopNum: { value: 1 },
    uBold: { value: 0.005 },
  };

  const init = (
    renderer: THREE.WebGLRenderer,
    stereoBuffer: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>],
  ) => {
    composer = createComposer(renderer, uniforms, stereoShader);

    edge = createPinPong();
    texs = stereoBuffer.map((buffer) => createTex(buffer)) as [
      THREE.DataTexture,
      THREE.DataTexture,
    ];
    uniforms.uAudioTex.value = texs;
  };

  const update = (
    time: number,
    renderer: THREE.WebGLRenderer,
    texsBuffer: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>],
    visualParams: VisualParams,
  ) => {
    texs = updateStereoTex(texs, texsBuffer, uniforms.uAudioTex);
    uniforms.uTime.value = time;
    //
    // console.log(visualParams);
    uniforms.uLoopNum.value = visualParams.loopNum;
    uniforms.uBold.value = visualParams.bold;
    edge.mat.uniforms.uAlpha.value = visualParams.alphas![0];
    //
    output(edge, composer, renderer);
  };

  const render = (renderer: THREE.WebGLRenderer) => {
    renderer.render(edge.scene, edge.camera);
  };

  return { init, update, render };
};

export const monoVisual = () => {
  let edge: EdgeInterface;
  let composer: EffectComposer;
  let tex: THREE.DataTexture;

  const uniforms = {
    uTime: { value: 0 },
    /*wave params */
    uAudioTex: { value: new THREE.DataTexture() },
    uLoopNum: { value: 1 },
    uBold: { value: 0.005 },
  };

  const init = (
    renderer: THREE.WebGLRenderer,
    monoBuffer: Float32Array<ArrayBuffer>,
  ) => {
    composer = createComposer(renderer, uniforms, monoShader);
    edge = createPinPong();
    tex = createTex(monoBuffer);
    uniforms.uAudioTex.value = tex;
  };

  const update = (
    time: number,
    renderer: THREE.WebGLRenderer,
    texBuffer: Float32Array<ArrayBuffer>,
    visualParams: VisualParams,
  ) => {
    tex = updateMonoTex(tex, texBuffer, uniforms.uAudioTex);
    uniforms.uTime.value = time;
    //
    // console.log(visualParams);
    uniforms.uLoopNum.value = visualParams.loopNum;
    uniforms.uBold.value = visualParams.bold;
    edge.mat.uniforms.uAlpha.value = visualParams.alphas![1];
    output(edge, composer, renderer);
  };

  const render = (renderer: THREE.WebGLRenderer) => {
    renderer.render(edge.scene, edge.camera);
  };

  return { init, update, render };
};
