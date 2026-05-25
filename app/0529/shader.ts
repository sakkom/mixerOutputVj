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

    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;
      // uv.x = (uv.x - .5)*16./9. + .5;

      float isCircle = 0.;
      float bold = .1;

      uv.x = mix(uv.x, (uv.x - .5)*16./9. + .5, isCircle);
      uv = mix(uv, (uv-.5)*2.+.5, isCircle);

      // uv = fract(uv * 1.);
      float a = atan(uv.y-.5, uv.x-.5);
      a = (a + 3.14) / 6.28;
      float dist = length(uv-.5);

      float loop = 5.;
      vec3 outputColor;

      for(float i = 0.; i < loop; i++) {
        vec2 sampleUv = vec2(i/loop + uv.x/loop, .5);
        vec2 sampleUvAngle = vec2(i/loop + a/loop, .5);
        vec2 mixUv = mix(sampleUv, sampleUvAngle, isCircle);
        float audio = (texture2D(uAudioTex, mixUv).r * 1.);
        audio = clamp(audio, -1., 1.);
        audio = audio * .5 + .5;
        audio = mix(audio, audio, isCircle);

        float diffUv = uv.y; //kick反応させてみてもいいかも
        float diff = mix(abs(diffUv - audio), abs(dist - audio), isCircle);
        float edge = smoothstep(bold*.5 * (1.-i/loop), bold*(1.-i/loop), diff);
        // float edge = step(.1 * (1.-i/loop), diff);
        outputColor = vec3(abs(outputColor - vec3(edge)));
      }

      // outputColor *= vec3(1., 0., 0.);
      gl_FragColor = vec4(outputColor, 1.);
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

    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }

    void main() {
    vec2 uv = vUv;

    uv.x = (uv.x - .5)*4./3. + .5;
    // uv = fract(uv * 1.);
    float a = atan(uv.y-.5, uv.x-.5);
    a = (a + 3.14) / 6.28;
    float dist = length(uv-.5);

    float loop = 6.;
    vec3 outputColor;
    vec3 outputColor0;
    vec3 outputColor1;

    for(float i = 0.; i < loop; i++) {
      vec2 sampleUv = vec2(i/loop + uv.x/loop, .5);
      vec2 sampleUvAngle = vec2(i/loop + a/loop, .5);
      vec2 mixUv = mix(sampleUv, sampleUvAngle, 1.);
      float audio = (texture2D(uAudioTex[0], mixUv).r * 1.);
      audio = clamp(audio, -1., 1.);
      audio = audio * .5 + .5;
      audio = mix(audio, audio*.5, 1.0);

      float diffUv = uv.y; //kick反応させてみてもいいかも
      float diff = mix(abs(diffUv - audio), abs(dist - audio), 1.);
      float edge = smoothstep(.1 * (1.-i/loop), .2*(1.-i/loop), diff);
      // float edge = step(.1 * (1.-i/loop), diff);
      outputColor0 = vec3(abs(outputColor0 - vec3(edge)));
      // outputColor0 *= vec3(0., 1., 0.);

    }

    for(float i = 0.; i < loop; i++) {
      vec2 sampleUv = vec2(i/loop + uv.x/loop, .5);
      vec2 sampleUvAngle = vec2(i/loop + a/loop, .5);
      vec2 mixUv = mix(sampleUv, sampleUvAngle, 1.);
      float audio = (texture2D(uAudioTex[1], mixUv).r * 1.);
      audio = clamp(audio, -1., 1.);
      audio = audio * .5 + .5;
      audio = mix(audio, audio*.5, 1.0);

      float diffUv = uv.y; //kick反応させてみてもいいかも
      float diff = mix(abs(diffUv - audio), abs(dist - audio), 1.);
      float edge = smoothstep(.1 * (1.-i/loop), .2*(1.-i/loop), diff);
      // float edge = step(.1 * (1.-i/loop), diff);
      outputColor1 = vec3(abs(outputColor1 - vec3(edge)));
      // outputColor1 *= vec3(1., 1., 0.);
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

      float diffuseLumi = lumi(diffuse);
      float prevLumi = lumi(prev);

      float diff = length(abs(diffuse-prev));
      diff = clamp(diff, 0., 0.95);

      vec3 diffuseStep = step(.5, vec3(diffuse));
      vec3 prevStep = step(.5, vec3(prev));

      vec3 color = mix(diffuse, prev, 0.0);
      // vec3 color = abs(diffuseStep-prevStep-diff);

      float alpha = step(0.01, lumi(color));

      gl_FragColor = vec4(color, alpha);
    }
  `,
};
