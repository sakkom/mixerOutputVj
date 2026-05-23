import * as THREE from "three";
import { EffectComposer, RenderPass } from "three/examples/jsm/Addons.js";
import { SketchShader, SketchShader1 } from "./shader";

const PinpongShader = {
  uniforms: {
    tDiffuse: { value: null },
    tPrev: { value: null },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D tPrev;

    float lumi(vec3 color) {
      return dot(color, vec3(0.3, 0.59, 0.11));
    }

    void main() {
      vec3 diffuse = texture2D(tDiffuse, vUv).rgb;
      vec3 prev = texture2D(tPrev, vUv).rgb;

      vec3 color = mix(diffuse, prev, 0.);

      float alpha = step(0.2, lumi(color));

      gl_FragColor = vec4(color, alpha);
    }
  `,
};

const createPinPong = (): EdgeInterface => {
  const rtA = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
  );
  const rtB = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
  );
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(PinpongShader.uniforms),
    vertexShader: PinpongShader.vertexShader,
    fragmentShader: PinpongShader.fragmentShader,
    transparent: true,
    depthTest: false,
  });
  const geo = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geo, mat));
  return { camera, scene, mat, rts: [rtA, rtB], flip: false };
};

interface EdgeInterface {
  camera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  mat: THREE.ShaderMaterial;
  rts: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  flip: boolean;
}

export const stereoVisual = () => {
  let edge: EdgeInterface;
  let composer: EffectComposer;

  const uniforms = {
    uTime: { value: 0 },
  };

  const createComposer = (renderer: THREE.WebGLRenderer) => {
    const composer = new EffectComposer(renderer);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({
      uniforms,
      ...SketchShader,
    });
    const geo = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    composer.addPass(new RenderPass(scene, camera));
    return composer;
  };

  const init = (renderer: THREE.WebGLRenderer) => {
    composer = createComposer(renderer);
    edge = createPinPong();
  };

  const update = (time: number, renderer: THREE.WebGLRenderer) => {
    uniforms.uTime.value = time;
    const readBuffer = edge.flip ? edge.rts[0] : edge.rts[1];
    const writeBuffer = edge.flip ? edge.rts[1] : edge.rts[0];

    composer.renderToScreen = false;
    composer.render();

    edge.mat.uniforms.tDiffuse.value = composer.readBuffer.texture;
    edge.mat.uniforms.tPrev.value = readBuffer.texture;
    renderer.setRenderTarget(writeBuffer);
    renderer.render(edge.scene, edge.camera);

    edge.flip = !edge.flip;
  };

  const render = (renderer: THREE.WebGLRenderer) => {
    renderer.render(edge.scene, edge.camera);
  };

  return { init, update, render };
};

export const monoVisual = () => {
  let edge: EdgeInterface;
  let composer: EffectComposer;

  const uniforms = {
    uTime: { value: 0 },
  };

  const createComposer = (renderer: THREE.WebGLRenderer) => {
    const composer = new EffectComposer(renderer);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({
      uniforms,
      ...SketchShader1,
    });
    const geo = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    composer.addPass(new RenderPass(scene, camera));
    return composer;
  };

  const init = (renderer: THREE.WebGLRenderer) => {
    composer = createComposer(renderer);
    edge = createPinPong();
  };

  const update = (time: number, renderer: THREE.WebGLRenderer) => {
    uniforms.uTime.value = time;
    const readBuffer = edge.flip ? edge.rts[0] : edge.rts[1];
    const writeBuffer = edge.flip ? edge.rts[1] : edge.rts[0];

    composer.renderToScreen = false;
    composer.render();

    edge.mat.uniforms.tDiffuse.value = composer.readBuffer.texture;
    edge.mat.uniforms.tPrev.value = readBuffer.texture;
    renderer.setRenderTarget(writeBuffer);
    renderer.render(edge.scene, edge.camera);

    edge.flip = !edge.flip;
  };

  const render = (renderer: THREE.WebGLRenderer) => {
    renderer.render(edge.scene, edge.camera);
  };

  return { init, update, render };
};
