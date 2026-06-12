import * as THREE from "three";
import { PinpongShader } from "../pinpong";
import {
  EffectComposer,
  RenderPass,
  ShaderPass,
  UnrealBloomPass,
} from "three/examples/jsm/Addons.js";
import { Effector0 } from "../effector/effector0";
import { CircleMove } from "../effector/circleMove";
import { UpdateTexInterface } from "../value/utils/interface";
import { Update } from "next/dist/build/swc/types";

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

export function updateTexByFFTSize(
  tex: THREE.DataTexture,
  texBuffer: Float32Array<ArrayBuffer>,
  isSizeChange: boolean,
) {
  if (isSizeChange) {
    tex.dispose();
    tex = createTex(texBuffer);
  } else {
    tex.image.data = texBuffer;
    tex.needsUpdate = true;
  }
  return tex;
}

function calcSegments(fftSize: number) {
  const n = Math.log2(fftSize);
  if (n % 2 === 0) {
    const seg = Math.sqrt(fftSize);
    return { w: seg, h: seg };
  } else {
    const h = 2 ** Math.floor(n / 2);
    const w = 2 ** Math.ceil(n / 2);
    return { w, h };
  }
}

/*べつに[1]のpointsだけ変更でもいいけど */
export function updateSegmentsByFFTSize(
  objects: [THREE.Mesh, THREE.Points],
  isSizeChange: boolean,
  fftSize: number,
) {
  if (objects.length <= 0) return;
  if (isSizeChange) {
    objects[0].geometry.dispose();
    objects[1].geometry.dispose();
    const { w, h } = calcSegments(fftSize);
    const newGeometry = new THREE.PlaneGeometry(2, 2, w - 1, h - 1);
    const newGeometry1 = new THREE.PlaneGeometry(2, 2, w - 1, h - 1);
    objects[0].geometry = newGeometry;
    objects[1].geometry = newGeometry1;
    // console.log(objects[0].geometry == objects[1].geometry);
  }
}

export function updateByFFTSize(
  texInterface: UpdateTexInterface,
  audioUniforms: THREE.IUniform<THREE.DataTexture[]>,
  objectsArray: [THREE.Mesh, THREE.Points][],
) {
  texInterface.texs.forEach((tex, i) => {
    const texBuffer = texInterface.texsBuffer[i];
    const isSizeChange = tex.image.width !== texInterface.texsBuffer[i].length;
    updateSegmentsByFFTSize(objectsArray[i], isSizeChange, texBuffer.length);
    texInterface.texs[i] = updateTexByFFTSize(tex, texBuffer, isSizeChange);
    audioUniforms.value[i] = texInterface.texs[i];
  });
  return texInterface.texs;
}

export const createComposer = (
  renderer: THREE.WebGLRenderer,
  objects: [THREE.Mesh, THREE.Points][],
) => {
  const composer = new EffectComposer(renderer);
  // const camera = new THREE.PerspectiveCamera(-1, 1, 1, -1, 0, 1);
  const camera = new THREE.PerspectiveCamera(45, 1 / 1, 0.1, 100);
  camera.position.z = 1 / Math.tan(THREE.MathUtils.degToRad(45 / 2));
  const scene = new THREE.Scene();
  scene.add(...objects.flat());
  composer.addPass(new RenderPass(scene, camera));
  const pass0 = new ShaderPass(Effector0);
  composer.addPass(pass0);
  const circleMovePass = new ShaderPass(CircleMove);
  composer.addPass(circleMovePass);
  const unrealPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.15,
    0,
    0.9,
  );
  composer.addPass(unrealPass);

  return { composer, circleMovePass };
};

export function setupObject(
  uniforms: { [uniform: string]: THREE.IUniform },
  shader: { vertexShader: string; fragmentShader: string },
): [THREE.Mesh, THREE.Points] {
  const meshMaterial = new THREE.ShaderMaterial({
    uniforms,
    ...shader,
    // wireframe: true,
    side: THREE.DoubleSide,
  });
  const pointsMaterial = new THREE.ShaderMaterial({
    uniforms,
    ...shader,
    // wireframe: true,
    side: THREE.DoubleSide,
  });
  //fft size init [2048, 2048]//
  const geo = new THREE.PlaneGeometry(2, 2, 64 - 1, 32 - 1);
  const geo1 = new THREE.PlaneGeometry(2, 2, 64 - 1, 32 - 1);
  const mesh = new THREE.Mesh(geo, meshMaterial);
  const points = new THREE.Points(geo1, pointsMaterial);
  return [mesh, points];
}
