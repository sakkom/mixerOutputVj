export const stereoShader = {
  vertexShader: `
    attribute vec3 planeScheme;
    attribute vec3 scheme;
    attribute vec3 prevBpmKickScheme;
    attribute vec3 bpmKickScheme;
    varying vec2 vUv;
    varying float vId;
    varying float vZ;

    uniform float uSpiralMode;
    uniform float uThreshold;
    uniform float uTime;
    uniform float uBpmKick;
    uniform float uIsBirdsEye;
    uniform float uMode;
    uniform float uBpm;
    uniform float uPointsCount;
    uniform float uMorphSpeed;
    uniform float uBold;
    uniform bool uIsPoints;

    void main() {
      vUv = uv;

      vec3 pos = position;
      if(uIsPoints) {
        if(uSpiralMode == 1.) {
          pos = mix(planeScheme, bpmKickScheme, uThreshold*10.);
          gl_PointSize = pow(30. - log2(uPointsCount), 1.2);
        }
        else if(uSpiralMode == 0.) {
          float bpmTime = uBpm*uMorphSpeed / 60. * uTime;
          pos = mix(prevBpmKickScheme, bpmKickScheme, fract(bpmTime*uMorphSpeed));
          float pointNum = 15. * (uBold*2.) + 15.;
          float basePoint = pow(pointNum - log2(uPointsCount), 2.);
          gl_PointSize = abs(pos.z) * basePoint + 1.;
        }
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }

  `,
  fragmentShader: `
  varying vec2 vUv;
  varying float vId;
  varying float vZ;
  uniform sampler2D uAudioTex[2];
  uniform float uTime;
  uniform float uLoopNum;
  uniform float uBold;
  uniform float uIsCircle;
  uniform float uBpmKick;
  uniform float uBpm;
  uniform float uIsBirdsEye;
  uniform float uSpiralMode;
  uniform float uThreshold;
  uniform bool uIsPoints;

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
    float rand2(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    vec2 getOffset2(vec2 p) {
      return vec2(rand2(p) - 0.5, rand2(p * 12.34) - 0.5);
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

    float loopNum = ceil(uLoopNum / 2.);
    float bold = uBold * 3.;

    for(float i = 0.; i < loopNum; i++) {
      vec2 sampleUv = vec2(i/loopNum + uv.x/loopNum, .5);
      vec2 sampleUvAngle = vec2(i/loopNum + a/loopNum, .5);
      vec2 mixUv = mix(sampleUv, sampleUvAngle, uIsCircle);
      float audio = (texture2D(uAudioTex[0], mixUv).r * 1.);
      audio = clamp(audio, -1., 1.);
      audio = audio * .5 + .5;
      audio = mix(audio, audio, uIsCircle);

      float diffUv = uv.y; //kick反応させてみてもいいかも
      float diff = mix(abs(diffUv - audio), abs(dist - audio), uIsCircle);
      float edge = smoothstep(bold*.5 * (1.-i/loopNum), bold*(1.-i/loopNum), diff);
      // float edge = step(.1 * (1.-i/loopNum), diff);
      float timing =step(.3, uBpmKick);
      float bpmTime = uBpm/60. * uTime;
      vec3 kickColor = vec3(1.);
      // vec3 kickColor = vec3(1., 0., 0.);

      vec3 edgeColor0 = mix(vec3(edge), kickColor * vec3(edge), timing);
      outputColor0 = vec3(abs(outputColor0 - edgeColor0));
    }

    for(float i = 0.; i < loopNum; i++) {
      vec2 sampleUv = vec2(i/loopNum + uv.x/loopNum, .5);
      vec2 sampleUvAngle = vec2(i/loopNum + a/loopNum, .5);
      vec2 mixUv = mix(sampleUv, sampleUvAngle, uIsCircle);
      float audio = (texture2D(uAudioTex[1], mixUv).r * 1.);
      audio = clamp(audio, -1., 1.);
      audio = audio * .5 + .5;
      audio = mix(audio, audio, uIsCircle);

      float diffUv = uv.y; //kick反応させてみてもいいかも
      float diff = mix(abs(diffUv - audio), abs(dist - audio), uIsCircle);
      float edge = smoothstep(bold*.5 * (1.-i/loopNum), bold*(1.-i/loopNum), diff);
      // float edge = step(.1 * (1.-i/loopNum), diff);
      float timing =step(.3, uBpmKick);
      float bpmTime = uBpm/60. * uTime;
      // vec3 kickColor = pallet2PI(i/loopNum, vec3(bpmTime*1.1, bpmTime, bpmTime*1.05)) * 1.5;
      vec3 kickColor = pallet2PI(i/loopNum, vec3(fract(bpmTime*1.1)*2., fract(bpmTime*.5)*.5, fract(bpmTime*1.05))) * 1.5;
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

    if(uIsPoints) {
      vec2 pointUv = gl_PointCoord - vec2(.5);
      pointUv += getOffset2(pointUv) * .25;
      if(length(pointUv) > .5) discard;
    }

    gl_FragColor = vec4(outputColor, 1.);

    if(uThreshold > .25) {
      float nZ = 1.-abs(vZ);
      nZ = pow(nZ, 2.);
      gl_FragColor = vec4(vec3(1.), 1.);
    }
    }
  `,
};
