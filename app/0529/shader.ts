export const monoShader = {
  vertexShader: `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uBpmKick;
    uniform float uIsBirdsEye;
    uniform float uMode;
    uniform float uBpm;

    mat3 rotateX(float angle) {
      float c = cos(angle), s = sin(angle);
      return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
      );
    }
    mat3 rotateY(float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return mat3(
        c, 0., s,
        0., 1., 0.,
        -s, 0., c
      );
    }
    mat3 rotateZ(float a) {
      float c = cos(a), s = sin(a);
      return mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
    }

    float getSquare(float wave) {
      return mix(-1., 1., step(.5, wave));
    }
    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }

    float getTri(float freq) {
      float wave = fract(vUv.x * freq);//[0, 1]
      wave -= .5; //[-0.5, 0.5]
      wave = abs(wave); //[0, .5];
      wave *= 4.;//[0, 2]
      wave -= 1.; //[-1, 1]
      return wave;
    }

    vec3 getBirdsEyePos(vec3 pos) {
      float clock = uBpm/60. * uTime;
      float freq = max(floor(rand1(floor(clock)) * 30.), 3.);
      float amp = rand1(floor(vUv.x * freq / 6.28)) * .6 + .1;

      pos *= .25 + uBpmKick * .7;
      pos = pos * rotateX(uTime*.8);
      pos = pos * rotateY(uTime*.5);
      pos.x += sin(uTime*.8) * .4;
      // pos.z += sin(uTime*.5) * .8;
      // pos.x *= .1 + rand1(floor(uTime)) * .5;

      float mode = mod(clock, 3.);

      float wave = sin(vUv.x * freq);
      if(mode < 1.) wave = wave;
      else if(mode < 2.) wave = getSquare(wave);
      else if(mode < 3.) wave = getTri(freq);

      pos.y = wave * amp;
      pos.y += sin(uTime*.6) * .3;



      return pos;
    }


    void main() {
      vUv = uv;

      vec3 pos = mix(position,getBirdsEyePos(position), uIsBirdsEye);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D uAudioTex;
    uniform float uTime;
    uniform float uLoopNum;
    uniform float uBold;
    uniform float uIsCircle;
    uniform float uBpmKick;
    uniform float uBpm;
    uniform float uIsBirdsEye;

    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }
    vec3 pallet2PI(float i, vec3 p) {
      float zeroStart = -1.57;
      vec3 sinP = vec3(
        sin(i*6.28 + p.x+zeroStart) * .5 + .5,
        sin(i*6.28 + p.y+zeroStart)*.5 + .5,
        sin(i*6.28 + p.z + zeroStart) * .5 + .5
      );
      // vec3 sinP = vec3(abs(sin(i*6.28 + p.x)), abs(sin(i*6.28 + p.y)), abs(sin(i*6.28 + p.z)));
      return sinP;
    }

    void main() {
      vec2 uv = vUv;
      // uv.x = (uv.x - .5)*16./9. + .5;

      uv.x = mix(uv.x, (uv.x - .5)*16./9. + .5, uIsCircle);
      uv = mix(uv, (uv-.5)*2.+.5, uIsCircle);

      // uv = fract(uv * 1.);
      float a = atan(uv.y-.5, uv.x-.5);
      a = (a + 3.14) / 6.28;
      float dist = length(uv-.5);

      vec3 outputColor;

      for(float i = 0.; i < uLoopNum; i++) {
        vec2 sampleUv = vec2(i/uLoopNum + uv.x/uLoopNum, .5);
        vec2 sampleUvAngle = vec2(i/uLoopNum + a/uLoopNum, .5);
        vec2 mixUv = mix(sampleUv, sampleUvAngle, uIsCircle);
        float audio = (texture2D(uAudioTex, mixUv).r * 1.);
        audio = clamp(audio, -1., 1.);
        audio = audio * .5 + .5;
        audio = mix(audio, audio, uIsCircle);

        float diffUv = uv.y; //kick反応させてみてもいいかも
        float diff = mix(abs(diffUv - audio), abs(dist - audio), uIsCircle);
        float edge = smoothstep(uBold*.5 * (1.-i/uLoopNum), uBold*(1.-i/uLoopNum), diff);
        // float edge = step(.1 * (1.-i/uLoopNum), diff);
        float timing =step(.3, uBpmKick);
        float bpmTime = uBpm/60. * uTime;
        vec3 kickColor = pallet2PI(i/uLoopNum, vec3(bpmTime*2., bpmTime, bpmTime*1.5)) * 2.5;
        kickColor = mix(vec3(1.), kickColor, .8);
        kickColor = mix(vec3(1.), kickColor, 1.-step(.1, uIsBirdsEye));
        // vec3 kickColor = vec3(1., 0., 0.);

        vec3 edgeColor = mix(vec3(edge), kickColor * vec3(edge), timing);
        outputColor = vec3(abs(outputColor - edgeColor));
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
    uniform float uTime;

    void main() {
      vUv = uv;

      vec3 pos = position;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }

  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D uAudioTex[2];
    uniform float uTime;
    uniform float uLoopNum;
    uniform float uBold;
    uniform float uIsCircle;
    uniform float uBpmKick;
    uniform float uBpm;

    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }
    vec3 pallet2PI(float i, vec3 p) {
      float zeroStart = -1.57;
      vec3 sinP = vec3(
        sin(i*6.28 + p.x+zeroStart) * .5 + .5,
        sin(i*6.28 + p.y+zeroStart)*.5 + .5,
        sin(i*6.28 + p.z + zeroStart) * .5 + .5
      );
      // vec3 sinP = vec3(abs(sin(i*6.28 + p.x)), abs(sin(i*6.28 + p.y)), abs(sin(i*6.28 + p.z)));
      return sinP;
    }

    void main() {
    vec2 uv = vUv;


    uv.x = mix(uv.x, (uv.x - .5)*16./9. + .5, uIsCircle);
    uv = mix(uv, (uv-.5)*2.+.5, uIsCircle);
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
      vec2 mixUv = mix(sampleUv, sampleUvAngle, uIsCircle);
      float audio = (texture2D(uAudioTex[0], mixUv).r * 1.);
      audio = clamp(audio, -1., 1.);
      audio = audio * .5 + .5;
      audio = mix(audio, audio, uIsCircle);

      float diffUv = uv.y; //kick反応させてみてもいいかも
      float diff = mix(abs(diffUv - audio), abs(dist - audio), uIsCircle);
      float edge = smoothstep(uBold*.5 * (1.-i/uLoopNum), uBold*(1.-i/uLoopNum), diff);
      // float edge = step(.1 * (1.-i/uLoopNum), diff);
      float timing =step(.3, uBpmKick);
      float bpmTime = uBpm/60. * uTime;
      vec3 kickColor = vec3(1.);
      // vec3 kickColor = vec3(1., 0., 0.);

      vec3 edgeColor0 = mix(vec3(edge), kickColor * vec3(edge), timing);
      outputColor0 = vec3(abs(outputColor0 - edgeColor0));
    }

    for(float i = 0.; i < uLoopNum; i++) {
      vec2 sampleUv = vec2(i/uLoopNum + uv.x/uLoopNum, .5);
      vec2 sampleUvAngle = vec2(i/uLoopNum + a/uLoopNum, .5);
      vec2 mixUv = mix(sampleUv, sampleUvAngle, uIsCircle);
      float audio = (texture2D(uAudioTex[1], mixUv).r * 1.);
      audio = clamp(audio, -1., 1.);
      audio = audio * .5 + .5;
      audio = mix(audio, audio, uIsCircle);

      float diffUv = uv.y; //kick反応させてみてもいいかも
      float diff = mix(abs(diffUv - audio), abs(dist - audio), uIsCircle);
      float edge = smoothstep(uBold*.5 * (1.-i/uLoopNum), uBold*(1.-i/uLoopNum), diff);
      // float edge = step(.1 * (1.-i/uLoopNum), diff);
      float timing =step(.3, uBpmKick);
      float bpmTime = uBpm/60. * uTime;
      // vec3 kickColor = pallet2PI(i/uLoopNum, vec3(bpmTime*1.1, bpmTime, bpmTime*1.05)) * 1.5;
      vec3 kickColor = pallet2PI(i/uLoopNum, vec3(fract(bpmTime*1.1)*2., fract(bpmTime*.5)*.5, fract(bpmTime*1.05))) * 1.5;
      // vec3 kickColor = vec3(1., 0., 0.);

      vec3 edgeColor1 = mix(vec3(edge), kickColor * vec3(edge), timing);
      outputColor1 = vec3(abs(outputColor1 - edgeColor1));
    }

    outputColor = vec3(abs(outputColor0-outputColor1)) * 2.;
    // outputColor = vec3(clamp(outputColor0 + outputColor1, 0., 1.));
    // outputColor = vec3(outputColor0 + outputColor1);
    float isEven = 1.-mod(uLoopNum, 2.);
    // outputColor = mix(1.-outputColor, outputColor, isEven);

    // float audio = texture2D(uAudioTex[0], vUv ).r * .5 + .5;
    // float col = abs(vUv.y - audio);
    //  col = step(.01, col);
    gl_FragColor = vec4(outputColor, 1.);
    // gl_FragColor = vec4(vec3(col), 1.);
    }
  `,
};

export const PinpongShader = {
  uniforms: {
    tDiffuse: { value: null },
    tPrev: { value: null },
    uAlpha: { value: 0 },
    uPinpong: { value: 0 },
    uIsBirdsEye: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      // gl_Position = vec4(position, 1.);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D tPrev;
    uniform float uAlpha;
    uniform float uPinpong;
    uniform float uIsCircle;

    float lumi(vec3 color) {
      return dot(color, vec3(0.3, 0.59, 0.11));
    }

    void main() {
      vec3 diffuse = texture2D(tDiffuse, vUv).rgb;
      vec3 prev = texture2D(tPrev, vUv).rgb;

      float diffuseLumi = lumi(diffuse);
      float prevLumi = lumi(prev);

      float diff = length(abs(diffuse-prev));
      diff = clamp(diff, 0., 1.);

      vec3 diffuseStep = step(.5, vec3(diffuse));
      vec3 prevStep = step(.5, vec3(prev));

      vec3 normalColor = mix(diffuse, prev, 0.);
      vec3 pingPongColor = mix(diffuse, prev, diff * .996);
      // vec3 pingPongColor = abs(diffuseStep-prevStep-diff);

      vec3 color = mix(normalColor, pingPongColor, uPinpong);

      float alpha = step(0.01, lumi(color));
      // float alpha = 1.;
      // alpha = (1., alpha, uIsBirdsEye);

      gl_FragColor = vec4(color, alpha * uAlpha);
    }
  `,
};
