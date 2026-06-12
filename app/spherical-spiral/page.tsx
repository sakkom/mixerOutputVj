"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

function drawSphericalSpiral(canvas: HTMLCanvasElement) {
  let aniId: number;
  const { renderer, camera, orbit, timer } = setupRender(canvas);
  // canvas = renderer.domElement;
  const observer = SphericalSpiral();
  const scene = observer.scene;
  function loop() {
    orbit.update();
    timer.update();
    observer.update(timer.getElapsed());
    renderer.render(scene, camera);
    aniId = requestAnimationFrame(loop);
  }
  loop();
  return () => {
    cancelAnimationFrame(aniId);
  };
}

function SphericalSpiral() {
  const geo = new THREE.PlaneGeometry(2, 2, 99, 99);
  // const mat = new THREE.ShaderMaterial();
  const mat = new THREE.PointsMaterial({ size: 0.01 });
  const mat2 = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    // wireframe: true,
  });
  const object = new THREE.Points(geo, mat);
  const mesh = new THREE.Mesh(geo, mat2);
  let scene = new THREE.Scene();
  // scene.add(object);
  scene.add(mesh);
  // console.log(scene.children);
  console.log(object);
  const attribute = geo.getAttribute("position");
  const positions = attribute.array;
  let scheme = new Float32Array(positions.length);

  // console.log(geo);
  // console.log(geo.getAttribute("position"));
  // const positions = geo.attributes.position;

  // geo.setAttribute("position", new THREE.BufferAttribute(positions, 3, false));

  attribute.needsUpdate = true;

  for (let i = 0; i < attribute.count; i++) {
    const index = i * 3;
    const theta = i * 0.0025;
    const phi = theta * 10;
    positions[index] = Math.sin(theta) * Math.cos(phi);
    positions[index + 1] = Math.sin(theta) * Math.sin(phi);
    positions[index + 2] = Math.cos(theta);
  }
  scheme = positions.slice() as Float32Array<ArrayBuffer>;

  function update(t: number) {
    for (let i = 0; i < attribute.count; i++) {
      const index = i * 3;
      // const thetaParmas = (Math.sin(t * 0.1 + 0.5) * 0.5 + 0.5) * 0.01;
      const theta = i * 0.0025;
      const phiParmas = Math.sin(t * 0.01 + 0.25) * 10;
      const phi = theta * phiParmas;
      positions[index] = Math.sin(theta) * Math.cos(phi);
      positions[index + 1] = Math.sin(theta) * Math.sin(phi);
      positions[index + 2] = Math.cos(theta);
    }
    scheme = positions.slice() as Float32Array<ArrayBuffer>;

    for (let i = 0; i < attribute.count; i++) {
      const index = i * 3;
      const ampFreq = Math.sin(t * 0.05) * 40 + Math.sin(t * 0.05) * 10;
      const amp = Math.sin((i / attribute.count) * ampFreq + t) * 1;
      positions[index] = scheme[index] * amp;
      positions[index + 1] = scheme[index + 1] * amp;
      positions[index + 2] = scheme[index + 2] * amp;
    }
    attribute.needsUpdate = true;
  }

  return { scene, update };
}

function setupRender(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  camera.position.z = 3;
  const orbit = new OrbitControls(camera, canvas);
  const timer = new THREE.Timer();
  return { renderer, camera, orbit, timer };
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawSphericalSpiral(canvasRef.current);
  }, []);

  return <canvas ref={canvasRef} />;
}
