"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { monoVisual, stereoVisual } from "./output";

function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
  });
  renderer.autoClear = false;
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  return renderer;
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const [smooth, setSmooth] = useState();
  // const [data, setData] = useState();

  // useEffect(() => {
  //   const channel = new BroadcastChannel("mixerOutputVj");
  //   channel.onmessage = (e) => {
  //     console.log(e.data);
  //     setSmooth(e.data.smooth);
  //     setData(e.data.buffers);
  //   };
  //   return () => channel.close();
  // }, []);

  useEffect(() => {
    let aniId: number;
    if (!canvasRef.current) return;

    const renderer = createRenderer(canvasRef.current);

    const stereoVisualObserver = stereoVisual();
    stereoVisualObserver.init(renderer);
    const monoVisualObserver = monoVisual();
    monoVisualObserver.init(renderer);

    const clock = new THREE.Clock();
    const loop = () => {
      stereoVisualObserver.update(clock.getElapsedTime(), renderer);
      monoVisualObserver.update(clock.getElapsedTime(), renderer);

      renderer.setRenderTarget(null);
      renderer.clear();

      stereoVisualObserver.render(renderer);
      monoVisualObserver.render(renderer);

      aniId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(aniId);
  }, []);

  return (
    <div style={{ margin: 0, padding: 0, backgroundColor: "black" }}>
      {/*<h1>{smooth}</h1>*/}
      {/*<div style={{ wordBreak: "break-all" }}>
        <h1>{String(data)}</h1>
      </div>*/}
      <div style={{ width: "100%" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
