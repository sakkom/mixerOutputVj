import * as THREE from "three";
export function SphericalSpiral() {
  let scheme = new Float32Array(0);
  const uniforms = {
    // uAudioTex: { value: new THREE.DataTexture() },
    mode: { value: 0 },
    move: { value: 0 },
  };
  let spiralMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      attribute vec3 planeScheme;
      attribute vec3 scheme;
      varying vec2 vUv;
      uniform float mode;
      uniform float move;

      void main() {
        vUv = uv;

        vec3 pos;
        if(mode == 0.) {
        pos = mix(planeScheme, scheme, move * 10.);
        }
        else if(mode == 1.) {
        pos = position;
        }

        gl_PointSize = 10.;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
      `,
    fragmentShader: `
      varying vec2 vUv;

      void main() {
        vec2 pointUv = gl_PointCoord - .5;
        if(length(pointUv) > .5) discard;
        gl_FragColor = vec4(vec3(1.0), 1.);
      }
      `,
  });
  spiralMaterial.name = "spiral";
  let basedMaterial: THREE.ShaderMaterial;
  let planeScheme: Float32Array<ArrayBuffer> = new Float32Array(0);
  let bpmKickScheme = new Float32Array(0);
  let prevBpmKickScheme = new Float32Array(0);
  let bpmCounter = -1;

  //mono or stereo
  function init(basedPointsMaterial: THREE.ShaderMaterial) {
    basedMaterial = basedPointsMaterial;
    basedMaterial.name = "based";
  }

  function updateScheme(
    positions: THREE.TypedArray,
    pointsNum: number,
    mesh: THREE.Mesh,
    geometry: THREE.PlaneGeometry,
  ) {
    if (positions.length !== scheme.length) {
      planeScheme = mesh.geometry
        .getAttribute("position")
        .array.slice() as Float32Array<ArrayBuffer>;

      basedMaterial.uniforms.uPointsCount.value = pointsNum;
      for (let i = 0; i < pointsNum; i++) {
        const index = i * 3;
        const theta = i * 0.0055;
        const phi = theta * 10;
        positions[index] = Math.sin(theta) * Math.cos(phi);
        positions[index + 1] = Math.sin(theta) * Math.sin(phi);
        positions[index + 2] = Math.cos(theta);
      }
      scheme = positions.slice() as Float32Array<ArrayBuffer>;

      bpmKickScheme = scheme.slice();
      prevBpmKickScheme = scheme.slice();

      geometry.setAttribute(
        "planeScheme",
        new THREE.BufferAttribute(planeScheme, 3),
      );
      geometry.setAttribute(
        "bpmKickScheme",
        new THREE.BufferAttribute(bpmKickScheme, 3),
      );
      geometry.setAttribute(
        "prevBpmKickScheme",
        new THREE.BufferAttribute(prevBpmKickScheme, 3),
      );
    }
  }

  function update(
    points: THREE.Points,
    texBuffer: Float32Array<ArrayBuffer>,
    rms: number,
    threshold: number,
    mesh: THREE.Mesh,
    bpm: number,
    time: number,
    bpmKick: number,
    morphSpeed: number,
  ) {
    const geometry = points.geometry;
    const attribute = geometry.getAttribute("position");
    const positions = attribute.array;
    updateScheme(
      positions,
      attribute.count,
      mesh,
      points.geometry as THREE.PlaneGeometry,
    );

    if (threshold > 0.01) {
      for (let i = 0; i < attribute.count; i++) {
        const index = i * 3;
        const amp = texBuffer[i] * 2.5;
        // const ampFreq = Math.sin(t * 0.05) * 40 + Math.sin(t * 0.05) * 10;
        positions[index] = scheme[index] * amp * rms;
        positions[index + 1] = scheme[index + 1] * amp * rms;
        positions[index + 2] = scheme[index + 2] * amp * rms;
      }
      attribute.needsUpdate = true;
    }

    if (threshold > 0.01) {
      points.rotation.y += 0.01;
      points.rotation.x += 0.02;
      points.rotation.z += 0.03;
    } else {
      points.rotation.y = 0;
      points.rotation.x = 0;
      points.rotation.z = 0;
    }

    basedMaterial.uniforms.uThreshold.value = threshold;
    basedMaterial.uniforms.uMorphSpeed.value = morphSpeed;

    const bpmTime = ((bpm * morphSpeed) / 60) * time;
    const nowCount = Math.floor(bpmTime * morphSpeed);

    if (bpmCounter !== nowCount) {
      prevBpmKickScheme =
        bpmKickScheme.length === 0
          ? (positions.slice() as Float32Array<ArrayBuffer>)
          : bpmKickScheme.slice();
      bpmKickScheme = positions.slice() as Float32Array<ArrayBuffer>;
      geometry.setAttribute(
        "prevBpmKickScheme",
        new THREE.BufferAttribute(prevBpmKickScheme, 3),
      );
      geometry.setAttribute(
        "bpmKickScheme",
        new THREE.BufferAttribute(bpmKickScheme, 3),
      );
      basedMaterial.uniforms.uSpiralMode.value = 0;

      if (threshold < 0.1) {
        geometry.setAttribute(
          "bpmKickScheme",
          new THREE.BufferAttribute(bpmKickScheme, 3),
        );
        geometry.setAttribute(
          "planeScheme",
          new THREE.BufferAttribute(planeScheme, 3),
        );
        basedMaterial.uniforms.uSpiralMode.value = 1;
      }

      bpmCounter = nowCount;
    }
  }

  return { init, updateScheme, update };
}
//
