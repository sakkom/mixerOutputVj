export const PinpongShader = {
  uniforms: {
    tDiffuse: { value: null },
    tPrev: { value: null },
    uAlpha: { value: 0 },
    uPinpong: { value: 0 },
    uTopLayer: { value: false },
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
    uniform bool uTopLayer;

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

      vec3 normalColor = mix(diffuse, prev, 0.9);
      vec3 pingPongColor = mix(diffuse, prev, diff * .9);
      // vec3 pingPongColor = abs(diffuseStep-prevStep-diff);

      // vec3 color = mix(normalColor, pingPongColor, uPinpong);

      // float alpha = 1.;
      // alpha = (1., alpha, uIsBirdsEye);

      // gl_FragColor = vec4(color, alpha * uAlpha);

      vec3 color = mix(normalColor, diffuse, 1.-uPinpong);

      float alpha = 1.;
      if(uTopLayer) {
       alpha = 1.-step(0.1, lumi(color));
      }

      gl_FragColor = vec4(color, uAlpha * alpha);
    }
  `,
};
