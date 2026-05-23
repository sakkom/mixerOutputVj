export const SketchShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform float uTime;

    void main() {
      vec2 uv = vUv - .5;
      float ball = length(uv) - .5 * fract(-uTime);
      float col = step(abs(ball), .05);

      gl_FragColor = vec4(vec3(col, 0., 0.), 1.);
    }
  `,
};

export const SketchShader1 = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform float uTime;

    void main() {
      vec2 uv = vUv - .5;
      float ball = length(uv) - .5 * fract(uTime);
      float col = step(abs(ball), .05);

      gl_FragColor = vec4(vec3(0., col, 0.), 1.);
    }
  `,
};
