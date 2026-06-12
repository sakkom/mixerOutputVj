import * as THREE from "three";
import { EffectComposer, ShaderPass } from "three/examples/jsm/Addons.js";
import { stereoShader } from "./shader/stereoShader";
import {
  createComposer,
  createPinPong,
  createTex,
  EdgeInterface,
  output,
  setupObject,
  updateByFFTSize,
} from "../utils/visual";
import {
  DoubleDataTexture,
  ObjectType,
  SpiralInterface,
  VisualParams,
} from "../value/utils/interface";
import { Layer } from "../store/visualParamsStore";
import { SphericalSpiral } from "./spherical-spiral/mono";

export const stereoVisual = () => {
  let edge: EdgeInterface;
  let composer: EffectComposer;
  let texs: [THREE.DataTexture, THREE.DataTexture];
  let circleMovePass: ShaderPass;
  const objects: [THREE.Mesh, THREE.Points][] = [];
  const sphericalSpiralL = SphericalSpiral();
  const sphericalSpiralR = SphericalSpiral();

  const uniforms = {
    uTime: { value: 0 },
    /*wave params */
    uAudioTex: { value: [new THREE.DataTexture(), new THREE.DataTexture()] },
    uLoopNum: { value: 1 },
    uBold: { value: 0.005 },
    uIsCircle: { value: 1 },
    uBpmKick: { value: 0 },
    uBpm: { value: 0 },
    uIsBirdsEye: { value: 0 },
    uMode: { value: 0 },
    //
    uThreshold: { value: 0 },
    uSpiralMode: { value: 0 },
    uPointsCount: { value: 0 },
    uMorphSpeed: { value: 1 },
    uIsPoints: { value: false },
  };

  const init = (
    renderer: THREE.WebGLRenderer,
    stereoBuffer: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>],
  ) => {
    objects[0] = setupObject(uniforms, stereoShader);
    objects[1] = setupObject(uniforms, stereoShader);
    const result = createComposer(renderer, objects);
    composer = result.composer;
    circleMovePass = result.circleMovePass;
    circleMovePass.uniforms.uAspect.value =
      window.innerWidth / window.innerHeight;
    circleMovePass.uniforms.uScene.value = 0;

    sphericalSpiralL.init(objects[0][1].material as THREE.ShaderMaterial);
    sphericalSpiralR.init(objects[1][1].material as THREE.ShaderMaterial);

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
    layer: Layer,
    spiralData: SpiralInterface,
  ) => {
    texs = updateByFFTSize(
      { texs, texsBuffer },
      uniforms.uAudioTex,
      objects,
    ) as DoubleDataTexture;
    updateObject(visualParams.objectType!);

    const rms = 1;
    if (visualParams.objectType! === "Points") {
      sphericalSpiralL.update(
        objects[0][1],
        texsBuffer[0],
        rms,
        spiralData.threshold,
        objects[0][0],
        bpm,
        time,
        bpmKick,
        spiralData.morphSpeed,
      );
    }
    if (visualParams.objectType! === "Points") {
      sphericalSpiralR.update(
        objects[1][1],
        texsBuffer[1],
        rms,
        spiralData.threshold,
        objects[1][0],
        bpm,
        time,
        bpmKick,
        spiralData.morphSpeed,
      );
    }
    const isPoints = visualParams.objectType === "Points";
    uniforms.uIsPoints.value = isPoints;

    uniforms.uTime.value = time;

    uniforms.uTime.value = time;
    //
    // console.log(visualParams);
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
    edge.mat.uniforms.uTopLayer.value =
      layer.pattern === "sm" ? true : layer.pattern === "ms" ? false : false;
    //
    output(edge, composer, renderer);
  };

  function updateObject(mode: ObjectType) {
    objects[0][0].visible = mode === "Mesh";
    objects[1][0].visible = mode === "Mesh";
    objects[0][1].visible = mode === "Points";
    objects[1][1].visible = mode === "Points";
  }

  const render = (renderer: THREE.WebGLRenderer) => {
    renderer.render(edge.scene, edge.camera);
  };

  return { init, update, render };
};
