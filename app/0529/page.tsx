"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { monoVisual, stereoVisual } from "./output";
import { OutputVisualParams, VisualParams } from "./value/utils/interface";

export async function setRecorder(canvas: HTMLCanvasElement) {
  const audioCtx = new AudioContext();
  const audioInput = (await navigator.mediaDevices.enumerateDevices())
    .filter((d) => d.kind == "audioinput")
    .find((d) => d.label.includes("Steinberg UR22mkII"));

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: audioInput?.deviceId },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      // sampleRate: 44100,
      channelCount: 2,
    },
  });
  const audioDest = audioCtx.createMediaStreamDestination();
  const source = audioCtx.createMediaStreamSource(stream);
  // const source = audioCtx.createMediaElementSource(videoMain);
  const gain = audioCtx.createGain();
  gain.gain.value = 0.1;
  source.connect(gain);
  source.connect(audioCtx.destination);
  source.connect(audioDest);
  //
  const recStream = new MediaStream([
    ...canvas.captureStream().getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);
  const recorder = new MediaRecorder(recStream, {
    // mimeType: "video/webm; codecs=vp9,opus",
    mimeType: "video/mp4; codecs=avc1",
    // videoBitsPerSecond: 20_000_000,
    videoBitsPerSecond: 8_000_000,
    audioBitsPerSecond: 320_000,
  });
  return { recorder };
}

export interface waveParams {
  texsBuffer: [
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
  ];
}

export function createRenderer(canvas: HTMLCanvasElement) {
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

export function setObserver(
  renderer: THREE.WebGLRenderer,
  texsBuffer: [
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
  ],
) {
  const stereoVisualObserver = stereoVisual();
  const monoVisualObserver = monoVisual();
  // console.log(texsBuffer);
  stereoVisualObserver.init(renderer, [texsBuffer[0], texsBuffer[1]]);
  monoVisualObserver.init(renderer, texsBuffer[2]);
  return { stereoVisualObserver, monoVisualObserver };
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveParams = useRef<waveParams | null>(null);
  const visualParams = useRef<OutputVisualParams | null>(null);
  const [isInit, setIsInit] = useState<boolean>(false);
  const chunkRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel("mixerOutputVj");
    channel.onmessage = (e) => {
      // console.log(e.data);
      waveParams.current = {
        texsBuffer: e.data.buffers,
      };
      visualParams.current = e.data.visualParamsData;
      // console.log(visualParams.current);
      if (!isInit) setIsInit(true);
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    let aniId: number;
    if (!canvasRef.current || !waveParams.current) return;

    const renderer = createRenderer(canvasRef.current);
    // console.log(visualParams.current);
    const { stereoVisualObserver, monoVisualObserver } = setObserver(
      renderer,
      waveParams.current?.texsBuffer,
    );

    const clock = new THREE.Clock();
    let lastTime = 0;
    let frameCount = 0;
    let counter = 0;
    const loop = () => {
      // console.log(
      //   visualParams.current?.mono.isCircleMove,
      //   visualParams.current?.stereo.isCircleMove,
      // );
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        // console.log(`FPS: ${frameCount}`);
        frameCount = 0;
        lastTime = now;
      }
      if (waveParams.current) {
        // console.log(visualParams.current!.mono);
        stereoVisualObserver.update(
          clock.getElapsedTime(),
          renderer,
          [waveParams.current.texsBuffer[0], waveParams.current.texsBuffer[1]],
          visualParams.current!.stereo,
          visualParams.current!.bpmKick,
          visualParams.current!.bpm,
        );
        monoVisualObserver.update(
          clock.getElapsedTime(),
          renderer,
          waveParams.current.texsBuffer[2],
          visualParams.current!.mono,
          visualParams.current!.bpmKick,
          visualParams.current!.birdsEye,
          visualParams.current!.bpm,
        );

        /*layer pattern */
        if (counter % 2 === 0) {
          renderer.setRenderTarget(null);
          renderer.clear();
          const pattern = visualParams.current?.layer.pattern;
          if (pattern === "sm") {
            monoVisualObserver.render(renderer);
            stereoVisualObserver.render(renderer);
          } else if (pattern === "ms") {
            stereoVisualObserver.render(renderer);
            monoVisualObserver.render(renderer);
          } else if (pattern === "s") {
            stereoVisualObserver.render(renderer);
          } else if (pattern === "m") {
            monoVisualObserver.render(renderer);
          }
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

  const handlePlay = async () => {
    if (!canvasRef.current) return;
    const { recorder } = await setRecorder(canvasRef.current);
    recorderRef.current = recorder;
    recorderRef.current.ondataavailable = (e) => chunkRef.current.push(e.data);
    recorderRef.current.start(30000);
  };
  const handleDownload = () => {
    const blob = new Blob(chunkRef.current, { type: "video/mp4" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    // console.log(a);
    a.download = "43aspectHard.mp4";
    a.click();
    recorderRef.current?.stop();
  };

  return (
    <div
      style={{
        backgroundColor: "black",
        width: "100vw",
        height: "100vh",
        // overflow: "hidden",
      }}
    >
      {/*<h1>{smooth}</h1>*/}
      {/*<div style={{ wordBreak: "break-all" }}>
        <h1>{String(data)}</h1>
      </div>*/}
      <div>
        <canvas ref={canvasRef} />
      </div>
      <div onClick={handlePlay} style={{ color: "white" }}>
        rec
      </div>
      <div onClick={handleDownload} style={{ color: "white" }}>
        download
      </div>
    </div>
  );
}
