export const monoShader = {
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
    uniform float uShaderAmp;

    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }

    void main() {
      float bpmTime = (141. / 60.) * uTime;
      vec2 uv = vUv;

      float audio = (texture2D(uAudioTex, uv).r * uShaderAmp);
      audio = clamp(audio, -1., 1.);
      audio = audio * .5 + .5;

      float wave = abs((vUv.y) - audio);
      wave = step(0.01, wave);

      gl_FragColor = vec4(vec3(1.-wave), 1.);
    }
  `,
};

export const stereoShader = {
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

export const PinpongShader = {
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

      float alpha = step(0.1, lumi(color));

      gl_FragColor = vec4(color, alpha);
    }
  `,
};
