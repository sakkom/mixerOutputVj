export const CircleMove = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIsCircleMove: { value: 0 },
    uAspect: { value: 0 },
    uScene: { value: 0 },
    uColor: { value: 0 },
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
    uniform float uTime;
    uniform float uAspect;
    uniform float uIsCircleMove;
    uniform float uScene;
    uniform float uColor;

    float lumi(vec3 color) {
      return dot(color, vec3(0.3, 0.59, 0.11));
    }
    float rand2(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    vec2 getOffset2(vec2 p) {
      return vec2(rand2(p) - 0.5, rand2(p * 12.34) - 0.5);
    }
    float rand1(float y) {
      return fract(sin(y * 12.9898) * 43758.5453123);
    }
    vec2 getOffset1(float index) {
      return vec2(rand1(index) - 0.5, rand1(index + 12.34) - 0.5);
    }
    vec2 rotatePos(vec2 p, float a) {
      return p * mat2(cos(a), -sin(a), sin(a), cos(a));
    }
    float opSmoothUnion(float d1, float d2, float k) {
      k *= 4.0;
      float h = max(k - abs(d1 - d2), 0.0);
      return min(d1, d2) - h * h * 0.25 / k;
    }


    vec3 scene0(vec2 uv, float t, float r, vec2 offsetXs) {
      vec3 diffuse = texture2D(tDiffuse, vUv).rgb;

      vec3 op;
      for(float i = 0.; i < 2.; i++) {
        uv += getOffset2(uv) * .1;
        vec2 uvLocal = uv;

        uvLocal.x += i < 1. ? offsetXs.r : offsetXs.g;
        float dist = length(uvLocal);
        dist = clamp(dist, 0., 1.);
        float radius = max(1. - fract(t), r);
        float fill = 1. - step(dist, radius);
        op += mix(diffuse, vec3(0.), fill);
      }

      return op;
    }

    //seedは常にランダムになるように
    vec2 getMove(float i, float t, float clock) {

      float amp = rand1(i + floor(clock)) * .5 + .1;
      float speed = rand1(i + floor(clock)+uScene + 2.34) * 1.5;
      speed = i < 3. ? -speed : speed;

      float wave = sin(t*9.42+i) * amp;
      wave = rand1(floor(clock+i)) > .5 ? wave : ((step(0., wave) - .5) * 2.) * amp;
      return vec2(t * speed, wave);
    }

    vec3 pallet2PI(float i, vec3 p) {
      float zeroStart = -1.57;
      vec3 sinP = vec3(
        sin(i*6.28 + p.x + zeroStart) * .5 + .5,
        sin(i*6.28 + p.y + zeroStart) * .5 + .5,
        sin(i*6.28 + p.z + zeroStart) * .5 + .5
      );
      return sinP;
    }
    vec3 scene1(vec2 uv, float t, float r, float clock, vec2 offsetXs) {
      vec3 diffuse = texture2D(tDiffuse, vUv).rgb;

      uv += getOffset2(uv) * 0.05;

      vec3 op;
      float opEdge = 100.;
      vec3 opColor;
      float loopNum = floor(rand1(floor(clock)+uScene) * 10.)+5.;
      for(float i = 0.; i < loopNum; i++) {
        vec2 uvLocal = uv;
        uvLocal = rotatePos(uv, rand1(floor(clock)+uScene)*6.28);
        uvLocal.x += i < 3. ? offsetXs.r : offsetXs.g;
        vec2 move = getMove(i, t, clock);
        float dist = length(uvLocal  - move);
        float isBall = step(dist, r * (rand1(i+floor(clock)) + .5));
        // vec3 ballCol = vec3(rand1(i), rand1(i+.2), rand1(i+.1)) * diffuse;
        // op += mix(vec3(0.), ballCol, isBall);
        opEdge = opSmoothUnion(dist, opEdge, 0.1);
        float tmpEdge = 1.-smoothstep(r/2., r, opEdge);
        vec3 colorP = pallet2PI(i/loopNum, vec3(fract(clock*1.5+uScene), fract(clock+uScene), fract(clock*2.5))) * 2.;
        colorP = mix(vec3(1.), colorP, uColor);
        vec3 tmpColor = tmpEdge * colorP;
        opColor = abs(tmpColor-opColor);
      }

      float isDark = 1. - step(0.01, length(opColor));
      vec3 outputColor = mix(opColor*5., diffuse, isDark);
      return outputColor;
    }

    void main() {
      vec2 uv = vUv - .5;
      // uv *= .8;
      uv.x *= uAspect;

      float clock = uTime * .5;
      float index = mod(clock, 2.);
      float t = fract(index);

      float r = rand1(floor(clock)) * .2 + .01;


      float seed = floor(clock / 2.);
      vec2 offsetXs;
      offsetXs.r = (rand1(floor(seed)) - 1.) * .5;
      offsetXs.g = - offsetXs.r;
      // uv = rotatePos(uv, rand1(seed) * 6.28);
      // uv -= offset;

      vec3 color;

      if(index < 1.) color = scene0(uv, t, r, offsetXs);
      else if(index < 2.) color = scene1(uv, t, r, clock, offsetXs);

      vec3 diffuse = texture2D(tDiffuse, vUv).rgb;
      vec3 finalColor = mix(color, diffuse, 1.-uIsCircleMove);

      gl_FragColor = vec4(finalColor, 1.);
    }
    `,
};
