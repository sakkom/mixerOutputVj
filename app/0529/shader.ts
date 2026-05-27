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
    uniform float uLoopNum;
    uniform float uBold;

    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;
      // uv.x = (uv.x - .5)*16./9. + .5;

      float isCircle = 0.;

      uv.x = mix(uv.x, (uv.x - .5)*16./9. + .5, isCircle);
      uv = mix(uv, (uv-.5)*2.+.5, isCircle);

      // uv = fract(uv * 1.);
      float a = atan(uv.y-.5, uv.x-.5);
      a = (a + 3.14) / 6.28;
      float dist = length(uv-.5);

      vec3 outputColor;

      for(float i = 0.; i < uLoopNum; i++) {
        vec2 sampleUv = vec2(i/uLoopNum + uv.x/uLoopNum, .5);
        vec2 sampleUvAngle = vec2(i/uLoopNum + a/uLoopNum, .5);
        vec2 mixUv = mix(sampleUv, sampleUvAngle, isCircle);
        float audio = (texture2D(uAudioTex, mixUv).r * 1.);
        audio = clamp(audio, -1., 1.);
        audio = audio * .5 + .5;
        audio = mix(audio, audio, isCircle);

        float diffUv = uv.y; //kick反応させてみてもいいかも
        float diff = mix(abs(diffUv - audio), abs(dist - audio), isCircle);
        float edge = smoothstep(uBold*.5 * (1.-i/uLoopNum), uBold*(1.-i/uLoopNum), diff);
        // float edge = step(.1 * (1.-i/uLoopNum), diff);
        outputColor = vec3(abs(outputColor - vec3(edge)));
      }

      float isEven = 1.-mod(uLoopNum, 2.);
      vec3 color = mix(1.-outputColor, outputColor, isEven);
      gl_FragColor = vec4(color, 1.);
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
    uniform float uLoopNum;
    uniform float uBold;

    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }

    void main() {
    vec2 uv = vUv;

    float isCircle = 1.;

    uv.x = mix(uv.x, (uv.x - .5)*16./9. + .5, isCircle);
    uv = mix(uv, (uv-.5)*2.+.5, isCircle);
    // uv = fract(uv * 1.);
    float a = atan(uv.y-.5, uv.x-.5);
    a = (a + 3.14) / 6.28;
    float dist = length(uv-.5);

    vec3 outputColor;
    vec3 outputColor0;
    vec3 outputColor1;

    for(float i = 0.; i < uLoopNum; i++) {
      vec2 sampleUv = vec2(i/uLoopNum + uv.x/uLoopNum, .5);
      vec2 sampleUvAngle = vec2(i/uLoopNum + a/uLoopNum, .5);
      vec2 mixUv = mix(sampleUv, sampleUvAngle, isCircle);
      float audio = (texture2D(uAudioTex[0], mixUv).r * 1.);
      audio = clamp(audio, -1., 1.);
      audio = audio * .5 + .5;
      audio = mix(audio, audio, isCircle);

      float diffUv = uv.y; //kick反応させてみてもいいかも
      float diff = mix(abs(diffUv - audio), abs(dist - audio), isCircle);
      float edge = smoothstep(uBold*.5 * (1.-i/uLoopNum), uBold*(1.-i/uLoopNum), diff);
      // float edge = step(.1 * (1.-i/uLoopNum), diff);
      outputColor0 = vec3(abs(outputColor0 - vec3(edge)));
    }

    for(float i = 0.; i < uLoopNum; i++) {
      vec2 sampleUv = vec2(i/uLoopNum + uv.x/uLoopNum, .5);
      vec2 sampleUvAngle = vec2(i/uLoopNum + a/uLoopNum, .5);
      vec2 mixUv = mix(sampleUv, sampleUvAngle, isCircle);
      float audio = (texture2D(uAudioTex[1], mixUv).r * 1.);
      audio = clamp(audio, -1., 1.);
      audio = audio * .5 + .5;
      audio = mix(audio, audio, isCircle);

      float diffUv = uv.y; //kick反応させてみてもいいかも
      float diff = mix(abs(diffUv - audio), abs(dist - audio), isCircle);
      float edge = smoothstep(uBold*.5 * (1.-i/uLoopNum), uBold*(1.-i/uLoopNum), diff);
      // float edge = step(.1 * (1.-i/uLoopNum), diff);
      outputColor1 = vec3(abs(outputColor1 - vec3(edge)));
    }

    outputColor = vec3(abs(outputColor0-outputColor1));

    gl_FragColor = vec4(outputColor, 1.);
    }
  `,
};

export const PinpongShader = {
  uniforms: {
    tDiffuse: { value: null },
    tPrev: { value: null },
    uAlpha: { value: 0 },
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
    uniform float uAlpha;

    float lumi(vec3 color) {
      return dot(color, vec3(0.3, 0.59, 0.11));
    }

    void main() {
      vec3 diffuse = texture2D(tDiffuse, vUv).rgb;
      vec3 prev = texture2D(tPrev, vUv).rgb;

      float diffuseLumi = lumi(diffuse);
      float prevLumi = lumi(prev);

      float diff = length(abs(diffuse-prev));
      diff = clamp(diff, 0., 0.95);

      vec3 diffuseStep = step(.5, vec3(diffuse));
      vec3 prevStep = step(.5, vec3(prev));

      vec3 color = mix(diffuse, prev, 0.0);
      // vec3 color = abs(diffuseStep-prevStep-diff);

      float alpha = step(0.01, lumi(color));

      gl_FragColor = vec4(color, alpha * uAlpha);
    }
  `,
};
