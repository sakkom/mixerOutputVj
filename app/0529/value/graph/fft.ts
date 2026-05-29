import * as THREE from "three";
import { OriginAudioRefProps } from "../utils/interface";

export const fftShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
      // gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D uAudioTex;
    uniform float uTime;

    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }

    void main() {
      float bpmTime = (141. / 60.) * uTime;
      vec2 uv = vUv;

      float audio = (texture2D(uAudioTex, uv).r * 1.);
      // audio = clamp(audio, -1., 1.);


      float wave = ((vUv.y) - audio);
      wave = step(0.05, wave);

      float point = 10. / 1024.;
      float pointCol = abs((vUv.x) - point);
      pointCol = step(0.001, pointCol);

      float finalCol = abs(wave);

      gl_FragColor = vec4(vec3(finalCol), 1.);
    }
  `,
};

export const fftScene = (scene: THREE.Scene) => {
  const group = new THREE.Group();
  let t: THREE.Timer;
  let fftTex: THREE.DataTexture | null;
  let texBuffer: Float32Array<ArrayBuffer>;

  const uniforms = {
    uTime: { value: 0 },
    uAudioTex: { value: new THREE.DataTexture() },
  };

  function createTex(fBuffer: Float32Array<ArrayBuffer>) {
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
  const size = 80;

  const init = (anayerRef: OriginAudioRefProps) => {
    t = new THREE.Timer();
    texBuffer = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const value = anayerRef.fftBuffer[i] / 255;
      // console.log({ value });
      texBuffer[i] = value;
    }
    fftTex = createTex(texBuffer);
    uniforms.uAudioTex.value = fftTex;
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: fftShader.vertexShader,
      fragmentShader: fftShader.fragmentShader,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    scene.add(group);
  };

  const update = (fftBuffer: Uint8Array<ArrayBuffer>) => {
    t.update();
    // texBuffer = new Float32Array(1024);
    for (let i = 0; i < size; i++) {
      const value = fftBuffer[i] / 255;
      // console.log({ value });
      texBuffer[i] = value;
    }
    uniforms.uTime.value = t.getElapsed();
    if (fftTex) {
      fftTex.needsUpdate = true;
    }
  };

  return {
    get mesh() {
      return group;
    },
    init,
    update,
  };
};
