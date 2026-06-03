import * as THREE from "three";
import { PinpongShader } from "../shader";
import {
  EffectComposer,
  RenderPass,
  ShaderPass,
} from "three/examples/jsm/Addons.js";
import { Effector0 } from "../effector/effector0";
import { CircleMove } from "../effector/circleMove";

export interface EdgeInterface {
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  mat: THREE.ShaderMaterial;
  rts: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  flip: boolean;
}

export const createPinPong = (): EdgeInterface => {
  const rtA = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
  );
  const rtB = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
  );
  // const camera = new THREE.PerspectiveCamera(-1, 1, 1, -1, 0, 1);
  const camera = new THREE.PerspectiveCamera(45, 1 / 1, 0.1, 100);
  camera.position.z = 1 / Math.tan(THREE.MathUtils.degToRad(45 / 2));

  const scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(PinpongShader.uniforms),
    vertexShader: PinpongShader.vertexShader,
    fragmentShader: PinpongShader.fragmentShader,
    transparent: true,
    depthTest: false,
  });
  const geo = new THREE.PlaneGeometry(2, 2, 32, 32);
  scene.add(new THREE.Mesh(geo, mat));
  return { camera, scene, mat, rts: [rtA, rtB], flip: false };
};

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

export function output(
  edge: EdgeInterface,
  composer: EffectComposer,
  renderer: THREE.WebGLRenderer,
) {
  const readBuffer = edge.flip ? edge.rts[0] : edge.rts[1];
  const writeBuffer = edge.flip ? edge.rts[1] : edge.rts[0];

  composer.renderToScreen = false;
  composer.render();

  edge.mat.uniforms.tDiffuse.value = composer.readBuffer.texture;
  edge.mat.uniforms.tPrev.value = readBuffer.texture;
  renderer.setRenderTarget(writeBuffer);
  renderer.render(edge.scene, edge.camera);

  edge.flip = !edge.flip;
}

export function updateMonoTex(
  tex: THREE.DataTexture,
  texBuffer: Float32Array<ArrayBuffer>,
  audioTexUniform: { value: THREE.DataTexture },
) {
  if (tex.image.width !== texBuffer.length) {
    tex.dispose();
    tex = createTex(texBuffer);
    audioTexUniform.value = tex;
  }
  tex.image.data = texBuffer;
  tex.needsUpdate = true;
  return tex;
}

export function updateStereoTex(
  texs: [THREE.DataTexture, THREE.DataTexture],
  texsBuffer: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>],
  audioTexUniform: { value: THREE.DataTexture[] },
) {
  texs.forEach((tex, i) => {
    if (tex.image.width !== texsBuffer[i].length) {
      texs[i].dispose();
      texs[i] = createTex(texsBuffer[i]);
      audioTexUniform.value = texs;
    }
    texs[i].image.data = texsBuffer[i];
    texs[i].needsUpdate = true;
  });
  return texs;
}

export const createComposer = (
  renderer: THREE.WebGLRenderer,
  uniforms: { [uniform: string]: THREE.IUniform },
  shader: { vertexShader: string; fragmentShader: string },
) => {
  const composer = new EffectComposer(renderer);
  // const camera = new THREE.PerspectiveCamera(-1, 1, 1, -1, 0, 1);
  const camera = new THREE.PerspectiveCamera(45, 1 / 1, 0.1, 100);
  camera.position.z = 1 / Math.tan(THREE.MathUtils.degToRad(45 / 2));
  const scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    uniforms,
    ...shader,
    // wireframe: true,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.PlaneGeometry(2, 2, 500, 500);
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  composer.addPass(new RenderPass(scene, camera));
  const pass0 = new ShaderPass(Effector0);
  composer.addPass(pass0);
  const circleMovePass = new ShaderPass(CircleMove);
  composer.addPass(circleMovePass);

  return { composer, circleMovePass };
};
