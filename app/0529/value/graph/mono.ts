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
    uniform sampler2D uAudioTex;
    uniform float uTime;

    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }

    void main() {
      float bpmTime = (141. / 60.) * uTime;
      vec2 uv = vUv;

      float audio = (texture2D(uAudioTex, uv).r * 1.);
      audio = clamp(audio, -1., 1.);
      audio = audio * .5 + .5;

      float wave = abs((vUv.y) - audio);
      wave = step(0.01, wave);

      gl_FragColor = vec4(vec3(1.-wave), 1.);
    }
  `,
};

export const monoScene = (scene: THREE.Scene) => {
  const group = new THREE.Group();
  let t: THREE.Timer;

  const uniforms = {
    uTime: { value: 0 },
    uAudioTex: { value: new THREE.DataTexture() },
  };

  const init = (audioTexStereo: THREE.DataTexture) => {
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

  const update = (audioTexStereo?: THREE.DataTexture) => {
    t.update();
    uniforms.uTime.value = t.getElapsed();
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
