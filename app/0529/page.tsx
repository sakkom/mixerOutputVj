"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { monoVisual, stereoVisual } from "./output";

interface waveParams {
  texsBuffer: [
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
  ];
}

function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
  });
  renderer.autoClear = false;
  // renderer.setPixelRatio(window.devicePixelRatio);fps落ちる
  renderer.setSize(window.innerWidth, window.innerHeight);
  return renderer;
}

function setObserver(
  renderer: THREE.WebGLRenderer,
  texsBuffer: [
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
  ],
) {
  const stereoVisualObserver = stereoVisual();
  const monoVisualObserver = monoVisual();
  stereoVisualObserver.init(renderer, [texsBuffer[0], texsBuffer[1]]);
  monoVisualObserver.init(renderer, texsBuffer[2]);
  return { stereoVisualObserver, monoVisualObserver };
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveParams = useRef<waveParams | null>(null);
  const [isInit, setIsInit] = useState<boolean>(false);

  useEffect(() => {
    const channel = new BroadcastChannel("mixerOutputVj");
    channel.onmessage = (e) => {
      waveParams.current = {
        texsBuffer: e.data.buffers,
      };
      if (!isInit) setIsInit(true);
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    let aniId: number;
    if (!canvasRef.current || !waveParams.current) return;

    const renderer = createRenderer(canvasRef.current);
    const { stereoVisualObserver, monoVisualObserver } = setObserver(
      renderer,
      waveParams.current?.texsBuffer,
    );

    const clock = new THREE.Clock();
    let lastTime = 0;
    let frameCount = 0;
    let counter = 0;
    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        console.log(`FPS: ${frameCount}`);
        frameCount = 0;
        lastTime = now;
      }
      if (waveParams.current) {
        stereoVisualObserver.update(clock.getElapsedTime(), renderer, [
          waveParams.current.texsBuffer[0],
          waveParams.current.texsBuffer[1],
        ]);
        monoVisualObserver.update(
          clock.getElapsedTime(),
          renderer,
          waveParams.current.texsBuffer[2],
        );

        /*layer pattern */
        if (counter % 1 === 0) {
          renderer.setRenderTarget(null);
          renderer.clear();
          monoVisualObserver.render(renderer);
          // stereoVisualObserver.render(renderer);
        }
      }

      aniId = requestAnimationFrame(loop);
      counter++;
    };
    loop();
    return () => {
      cancelAnimationFrame(aniId);
      renderer.dispose();
    };
  }, [isInit]);

  return (
    <div
      style={{
        backgroundColor: "black",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/*<h1>{smooth}</h1>*/}
      {/*<div style={{ wordBreak: "break-all" }}>
        <h1>{String(data)}</h1>
      </div>*/}
      <div>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
