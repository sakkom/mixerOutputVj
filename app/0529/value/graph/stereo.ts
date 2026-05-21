import * as THREE from "three";

export const space0Shader = {
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
    uniform sampler2D uAudioTex[2];
    uniform float uTime;
    uniform float uShaderAmp;

    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }

    void main() {
      float bpmTime = (141. / 60.) * uTime;
      vec2 uv = vUv;

      float audioL = (texture2D(uAudioTex[0], uv).r * uShaderAmp);
      audioL = clamp(audioL, -1., 1.);
      audioL = audioL * .5 + .5;
      float audioR = (texture2D(uAudioTex[1], uv).r * uShaderAmp);
      audioR = clamp(audioR, -1., 1.);
      audioR = audioR * .5 + .5;

      float waveL = abs((vUv.y) - audioL);
      waveL = step(0.01, waveL);
      vec3 lColor = (1.-waveL) * vec3(0., 0., 1.);

      float waveR = abs((vUv.y) - audioR);
      waveR = step(0.01, waveR);
      vec3 rColor = (1. - waveR) * vec3(1., 0., 0.);

      vec3 color = vec3(abs(rColor - lColor));

      gl_FragColor = vec4(vec3((color)), 1.);
    }
  `,
};

export const stereoScene = (scene: THREE.Scene) => {
  const group = new THREE.Group();
  let t: THREE.Timer;

  const uniforms = {
    uTime: { value: 0 },
    uAudioTex: { value: [new THREE.DataTexture(), new THREE.DataTexture()] },
    uShaderAmp: { value: 1 },
  };

  const init = (audioTexStereo: THREE.DataTexture[]) => {
    t = new THREE.Timer();

    uniforms.uAudioTex.value = audioTexStereo;
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: space0Shader.vertexShader,
      fragmentShader: space0Shader.fragmentShader,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    scene.add(group);
  };

  const update = (shaderAmp: number, audioTexStereo?: THREE.DataTexture[]) => {
    t.update();
    uniforms.uTime.value = t.getElapsed();
    uniforms.uShaderAmp.value = shaderAmp;
    if (audioTexStereo) {
      uniforms.uAudioTex.value = audioTexStereo;
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
