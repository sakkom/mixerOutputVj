export const monoShader = {
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
      vId = float(gl_VertexID) / float(uPointsCount);

      // vec3 pos = mix(position,getBirdsEyePos(position), uIsBirdsEye);

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


      vZ = pos.z;


      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vId;
    varying float vZ;
    uniform sampler2D uAudioTex[1];
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
      // vec2 uv = vUv;
      // // uv.x = (uv.x - .5)*16./9. + .5;

      // uv.x = mix(uv.x, (uv.x - .5)*16./9. + .5, uIsCircle);
      // uv = mix(uv, (uv-.5)*2.+.5, uIsCircle);

      // // uv = fract(uv * 1.);
      // float a = atan(uv.y-.5, uv.x-.5);
      // a = (a + 3.14) / 6.28;
      // float dist = length(uv-.5);

      // vec3 outputColor;

      // for(float i = 0.; i < uLoopNum; i++) {
      //   vec2 sampleUv = vec2(i/uLoopNum + uv.x/uLoopNum, .5);
      //   vec2 sampleUvAngle = vec2(i/uLoopNum + a/uLoopNum, .5);
      //   vec2 mixUv = mix(sampleUv, sampleUvAngle, uIsCircle);
      //   float audio = (texture2D(uAudioTex[0], mixUv).r * 1.);
      //   audio = clamp(audio, -1., 1.);
      //   audio = audio * .5 + .5;
      //   audio = mix(audio, audio, uIsCircle);

      //   float diffUv = uv.y; //kick反応させてみてもいいかも
      //   float diff = mix(abs(diffUv - audio), abs(dist - audio), uIsCircle);
      //   float edge = smoothstep(uBold*.5 * (1.-i/uLoopNum), uBold*(1.-i/uLoopNum), diff);
      //   // float edge = step(.1 * (1.-i/uLoopNum), diff);
      //   float timing =step(.3, uBpmKick);
      //   float bpmTime = uBpm/60. * uTime;
      //   vec3 kickColor = pallet2PI(i/uLoopNum, vec3(bpmTime*2., bpmTime, bpmTime*1.5)) * 2.5;
      //   kickColor = mix(vec3(1.), kickColor, .8);
      //   kickColor = mix(vec3(1.), kickColor, 1.-step(.1, uIsBirdsEye));
      //   // vec3 kickColor = vec3(1., 0., 0.);

      //   vec3 edgeColor = mix(vec3(edge), kickColor * vec3(edge), timing);
      //   outputColor = vec3(abs(outputColor - edgeColor));
      // }

      // float isEven = 1.-mod(uLoopNum, 2.);
      // vec3 color = mix(1.-outputColor, outputColor, isEven);
      // gl_FragColor = vec4(color, 1.);

      vec2 uv = vUv;
      float bpmTime = uBpm / 60. * uTime;
      uv.x = rand1(floor(bpmTime + .1)) > .9 ? ((uv.x - .5) * .1) + .5 : uv.x;//seed0
      float audio = texture2D(uAudioTex[0], uv).r;
      uv.y -= .5;


      uv.y += rand1(floor(bpmTime)) > .25 ? getOffset2(uv).y * 0.05  * uBpmKick : 0.;
      float diff = (audio - uv.y);
      float col;
      if(diff > 0.) {
        col = 1.-step(audio+audio, diff);
      } else {
        col = step(audio+audio, diff);
      }

      float seed0 = 1.-step(.9, rand1(floor(bpmTime + .1)));


      float l = step(.5, col);
      vec2 distUv = vUv-.5;
      distUv.x *= (uv.x - .5)  * .2 +.5;
      distUv += getOffset2(distUv) * .005;
      distUv.y += (rand1(floor(bpmTime)) - .5) * .1;
      distUv.x += sin(floor(bpmTime) * .05) * .2;
      float dist = length(distUv) * 100.;
      distUv += getOffset2(distUv) * .2;
      float colorDist = length(distUv) * 100.;
      col = mix(col, -0.5, abs((fract(l * dist) - .5) * 2.) * seed0);

      col = rand1(floor(bpmTime + .1)) > .9 ? (1.- col): col; //seed0

      float circle = 1.-smoothstep(fract(colorDist) * .15, fract(colorDist) * .1, abs((colorDist/100. - .8* fract(bpmTime * .25)) ));
      vec3 baseColor = pallet2PI(colorDist/100., vec3(colorDist/6.28+bpmTime*6.28/10., colorDist/6.28+bpmTime*6.28/3., colorDist/6.28 + bpmTime*6.28/rand1(bpmTime) * 6.28)) * 1.5;
      baseColor = mix(baseColor, vec3(1.), .3);

      vec3 color = mix(vec3(baseColor), vec3(col), 1.-circle * l * seed0 );


      if(uIsPoints) {
        vec2 pointUv = gl_PointCoord - vec2(.5);
        pointUv += getOffset2(pointUv) * .25;
        if(length(pointUv) > .5) discard;
      }


      gl_FragColor = vec4(vec3(circle * baseColor), 1.);
      gl_FragColor = vec4(vec3(color), 1.);


      if(uThreshold > .25) {
        float nZ = 1.-abs(vZ);
        nZ = pow(nZ, 2.);
        gl_FragColor = vec4(vec3(1.), 1.);
      }
    }
  `,
};
