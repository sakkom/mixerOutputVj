import * as THREE from "three";
import { EffectComposer, ShaderPass } from "three/examples/jsm/Addons.js";
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
import { CircleMove } from "./effector/circleMove";
import { BirdsEyeProps } from "./store/birdsEyeStore";

export const stereoVisual = () => {
  let edge: EdgeInterface;
  let composer: EffectComposer;
  let texs: [THREE.DataTexture, THREE.DataTexture];
  let circleMovePass: ShaderPass;

  const uniforms = {
    uTime: { value: 0 },
    /*wave params */
    uAudioTex: { value: [new THREE.DataTexture(), new THREE.DataTexture()] },
    uLoopNum: { value: 1 },
    uBold: { value: 0.005 },
    uIsCircle: { value: 1 },
    uBpmKick: { value: 0 },
    uBpm: { value: 0 },
  };

  const init = (
    renderer: THREE.WebGLRenderer,
    stereoBuffer: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>],
  ) => {
    const result = createComposer(renderer, uniforms, stereoShader);
    composer = result.composer;
    circleMovePass = result.circleMovePass;
    circleMovePass.uniforms.uAspect.value =
      window.innerWidth / window.innerHeight;
    circleMovePass.uniforms.uScene.value = 0;

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
    bpmKick: number,
    bpm: number,
  ) => {
    texs = updateStereoTex(texs, texsBuffer, uniforms.uAudioTex);
    uniforms.uTime.value = time;
    //
    console.log(visualParams);
    uniforms.uLoopNum.value = visualParams.loopNum;
    uniforms.uBold.value = visualParams.bold;
    uniforms.uIsCircle.value = visualParams.isCircle;
    uniforms.uBpmKick.value = bpmKick;
    uniforms.uBpm.value = bpm;
    circleMovePass.uniforms.uTime.value = time;
    circleMovePass.uniforms.uIsCircleMove.value = visualParams.isCircleMove;
    circleMovePass.uniforms.uColor.value = visualParams.isCircleMoveColor;
    edge.mat.uniforms.uAlpha.value = visualParams.alphas![0];
    edge.mat.uniforms.uPinpong.value = visualParams.isPinPong;
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
  //composer pass uniforms
  let circleMovePass: ShaderPass;

  const uniforms = {
    uTime: { value: 0 },
    /*wave params */
    uAudioTex: { value: new THREE.DataTexture() },
    uLoopNum: { value: 1 },
    uBold: { value: 0.005 },
    uIsCircle: { value: 1 },
    uBpmKick: { value: 0 },
    //
    uIsBirdsEye: { value: 0 },
    uMode: { value: 0 },
    uBpm: { value: 0 },
  };

  const init = (
    renderer: THREE.WebGLRenderer,
    monoBuffer: Float32Array<ArrayBuffer>,
  ) => {
    const result = createComposer(renderer, uniforms, monoShader);
    composer = result.composer;
    circleMovePass = result.circleMovePass;
    circleMovePass.uniforms.uAspect.value =
      window.innerWidth / window.innerHeight;
    circleMovePass.uniforms.uScene.value = 1;

    edge = createPinPong();
    tex = createTex(monoBuffer);
    uniforms.uAudioTex.value = tex;
  };

  const update = (
    time: number,
    renderer: THREE.WebGLRenderer,
    texBuffer: Float32Array<ArrayBuffer>,
    visualParams: VisualParams,
    bpmKick: number,
    birdsEyeProps: BirdsEyeProps,
    bpm: number,
  ) => {
    tex = updateMonoTex(tex, texBuffer, uniforms.uAudioTex);
    uniforms.uTime.value = time;
    //
    // console.log(bpmKick);
    uniforms.uLoopNum.value = visualParams.loopNum;
    uniforms.uBold.value = visualParams.bold;
    uniforms.uIsCircle.value = visualParams.isCircle;
    uniforms.uBpmKick.value = bpmKick;
    uniforms.uIsBirdsEye.value = birdsEyeProps.isBirdsEye;
    uniforms.uBpm.value = bpm;
    circleMovePass.uniforms.uTime.value = time;
    circleMovePass.uniforms.uIsCircleMove.value = visualParams.isCircleMove;
    circleMovePass.uniforms.uColor.value = visualParams.isCircleMoveColor;
    edge.mat.uniforms.uAlpha.value = visualParams.alphas![1];
    edge.mat.uniforms.uPinpong.value = visualParams.isPinPong;
    edge.mat.uniforms.uIsBirdsEye.value = birdsEyeProps.isBirdsEye;
    output(edge, composer, renderer);
  };

  const render = (renderer: THREE.WebGLRenderer) => {
    renderer.render(edge.scene, edge.camera);
  };

  return { init, update, render };
};
