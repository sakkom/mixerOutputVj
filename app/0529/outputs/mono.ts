import * as THREE from "three";
import {
  EffectComposer,
  OrbitControls,
  ShaderPass,
} from "three/examples/jsm/Addons.js";
import { monoShader } from "./shader/monoShader";
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
  ObjectType,
  SpiralInterface,
  VisualParams,
} from "../value/utils/interface";
import { BirdsEyeProps } from "../store/birdsEyeStore";
import { SphericalSpiral } from "./spherical-spiral/mono";
import { Layer } from "../store/visualParamsStore";

export const monoVisual = () => {
  let edge: EdgeInterface;
  let composer: EffectComposer;
  let tex: THREE.DataTexture;
  //composer pass uniforms
  let circleMovePass: ShaderPass;
  /*new object sketch start 0610 */
  let objects: [THREE.Mesh, THREE.Points];
  const sphericalSpiral = SphericalSpiral();
  // let orbitCamera: OrbitControls;

  const uniforms: { [key: string]: THREE.IUniform } = {
    uTime: { value: 0 },
    /*wave params */
    uAudioTex: { value: [new THREE.DataTexture()] },
    uLoopNum: { value: 1 },
    uBold: { value: 0.005 },
    uIsCircle: { value: 1 },
    uBpmKick: { value: 0 },
    //
    uIsBirdsEye: { value: 0 },
    uMode: { value: 0 },
    uBpm: { value: 0 },
    //
    uThreshold: { value: 0 },
    uSpiralMode: { value: 0 },
    uPointsCount: { value: 0 },
    uMorphSpeed: { value: 1 },
    uIsPoints: { value: false },
  };

  const init = (
    renderer: THREE.WebGLRenderer,
    monoBuffer: Float32Array<ArrayBuffer>,
  ) => {
    /*初期値はobjectはTHREE.Mesh */
    objects = setupObject(uniforms, monoShader);
    objects[0].frustumCulled = false;
    objects[1].frustumCulled = false;
    sphericalSpiral.init(objects[1].material as THREE.ShaderMaterial);
    const result = createComposer(renderer, [objects]);
    composer = result.composer;
    circleMovePass = result.circleMovePass;
    circleMovePass.uniforms.uAspect.value =
      window.innerWidth / window.innerHeight;
    circleMovePass.uniforms.uScene.value = 1;

    edge = createPinPong();
    tex = createTex(monoBuffer);
    // uniforms.uAudioTex.value[0] = tex;
    // orbitCamera = new OrbitControls(edge.camera, renderer.domElement);
  };

  const update = (
    time: number,
    renderer: THREE.WebGLRenderer,
    texBuffer: Float32Array<ArrayBuffer>,
    visualParams: VisualParams,
    bpmKick: number,
    birdsEyeProps: BirdsEyeProps,
    bpm: number,
    layer: Layer,
    spiralData: SpiralInterface,
  ) => {
    // orbitCamera.update();
    tex = updateByFFTSize(
      { texs: [tex], texsBuffer: [texBuffer] },
      uniforms.uAudioTex,
      [objects],
    )[0];
    updateObject(visualParams.objectType!);

    // console.log(objects[1].geometry.getAttribute("position").count);
    const rms = 1.0;
    // const threshold = (time * 0.1) % 0.5;
    if (visualParams.objectType! === "Points") {
      sphericalSpiral.update(
        objects[1],
        texBuffer,
        rms,
        spiralData.threshold,
        objects[0],
        bpm,
        time,
        bpmKick,
        spiralData.morphSpeed,
      );
    }
    const isPoints = visualParams.objectType === "Points";
    uniforms.uIsPoints.value = isPoints;

    uniforms.uTime.value = time;

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
    edge.mat.uniforms.uTopLayer.value =
      layer.pattern === "sm" ? false : layer.pattern === "ms" ? true : false;
    output(edge, composer, renderer);
  };

  function updateObject(mode: ObjectType) {
    objects[0].visible = mode === "Mesh";
    objects[1].visible = mode === "Points";
  }

  const render = (renderer: THREE.WebGLRenderer) => {
    renderer.render(edge.scene, edge.camera);
  };

  return { init, update, render };
};
