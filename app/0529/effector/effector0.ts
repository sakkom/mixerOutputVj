export const Effector0 = {
  uniforms: {
    tDiffuse: { value: null },
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

    float lumi(vec3 color) {
      return dot(color, vec3(0.3, 0.59, 0.11));
    }

    void main() {
      vec3 diffuse = texture2D(tDiffuse, vUv).rgb;

      float diffuseLumi = lumi(diffuse);

      float diff = length(abs(diffuse));

      vec3 diffuseStep = step(.5, vec3(diffuse));

      vec3 color = vec3(step(.5, diffuseLumi));

      gl_FragColor = vec4(diffuse, 1.);
      // gl_FragColor = vec4(color, 1.);
    }
    `,
};
