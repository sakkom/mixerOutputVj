"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BpmDetector } from "@/app/tools/bpmDetector";
import { useAudioValueStore } from "../store/audioValueStore";
import {
  ampEffect,
  pmAverEffect,
  smoothEffect,
  updateMonoBuffer,
} from "./utils/wave";
import { playAudio } from "./utils/play";
import {
  createTex,
  initAudioTexs,
  initObserver,
  setThree,
  updateCanvas,
} from "./utils/three";
import { AudioRefProps, AudioTexs, ThreeFloat32Array } from "./utils/interface";

function waveProcessor(
  audioRef: AudioRefProps,
  visualBuffer: [
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
  ],
  outputBuffer: [
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
  ],
) {
  for (let ch = 0; ch < 2; ch++) {
    audioRef.analyser[ch].getFloatTimeDomainData(audioRef.buffer[ch]);
  }

  const amp = useAudioValueStore.getState().amp;
  ampEffect(audioRef, amp, 0);
  ampEffect(audioRef, amp, 1);

  smoothEffect(
    visualBuffer,
    audioRef.buffer,
    0,
    "before",
    useAudioValueStore.getState().smooths,
  );
  smoothEffect(
    visualBuffer,
    audioRef.buffer,
    1,
    "before",
    useAudioValueStore.getState().smooths,
  );

  const window = useAudioValueStore.getState().pmAverWindow;
  pmAverEffect(visualBuffer[0], window);
  pmAverEffect(visualBuffer[1], window);

  smoothEffect(
    outputBuffer,
    visualBuffer,
    0,
    "after",
    useAudioValueStore.getState().smooths,
  );
  smoothEffect(
    outputBuffer,
    visualBuffer,
    1,
    "after",
    useAudioValueStore.getState().smooths,
  );
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioRefProps | null>(null);
  const [isInit, setIsInit] = useState<boolean>(false);
  const visualBufferRef = useRef<ThreeFloat32Array>([
    new Float32Array(2048),
    new Float32Array(2048),
    new Float32Array(2048),
  ]);
  const outputBufferRef = useRef<ThreeFloat32Array>([
    new Float32Array(2048),
    new Float32Array(2048),
    new Float32Array(2048),
  ]);
  const audioTexsRef = useRef<AudioTexs>([null, null, null]);

  const fftSize = useAudioValueStore((s) => s.fftSize);
  const sampleRate = useAudioValueStore((s) => s.sampleRate);
  const smooths = useAudioValueStore((s) => s.smooths);
  const pmAverWindow = useAudioValueStore((s) => s.pmAverWindow);
  const amp = useAudioValueStore((s) => s.amp);

  const bpm = useAudioValueStore((s) => s.bpm);

  useEffect(() => {
    const handleClick = async () => {
      audioRef.current = await playAudio(44100, fftSize);
      setIsInit(true);
    };
    window.addEventListener("click", handleClick, { once: true });
  }, []);

  useEffect(() => {
    let animId: number;
    const channel = new BroadcastChannel("mixerOutputVj");

    if (!canvasRef.current) return;
    if (!audioRef.current) return;
    if (!isInit) return;

    const { renderer, camera, W, H } = setThree(canvasRef.current);

    initAudioTexs(audioTexsRef.current, outputBufferRef.current);
    const { stereoObserver, monoObserver, scene0, scene1 } = initObserver(
      audioTexsRef.current,
    );

    //bpmdetector専用のanalyser必要
    const bpmDetector = BpmDetector.createBpm();
    bpmDetector.init(audioRef.current.analyser[0]);

    const clock = new THREE.Clock();

    // let lastTime = 0;
    // let frameCount = 0;
    const loop = () => {
      // frameCount++;
      // const now = performance.now();
      // if (now - lastTime >= 1000) {
      //   console.log(`FPS: ${frameCount}`);
      //   frameCount = 0;
      //   lastTime = now;
      // }

      const time = clock.getElapsedTime();
      const detectedBpm = bpmDetector.update(time);
      // console.log(bpm);
      if (bpm !== detectedBpm) {
        useAudioValueStore.getState().updateBpm(detectedBpm);
      }

      if (audioRef.current) {
        //stereo
        waveProcessor(
          audioRef.current,
          visualBufferRef.current,
          outputBufferRef.current,
        );
        //mono
        updateMonoBuffer(outputBufferRef.current);

        updateCanvas(
          audioTexsRef.current as [
            THREE.DataTexture,
            THREE.DataTexture,
            THREE.DataTexture,
          ],
          stereoObserver,
          monoObserver,
        );
      }

      renderer.setViewport(0, 0, W, H);
      renderer.setScissor(0, 0, W, H);
      renderer.render(scene0, camera);
      renderer.setViewport(W, 0, W, H);
      renderer.setScissor(W, 0, W, H);
      renderer.render(scene1, camera);

      channel.postMessage({
        buffers: outputBufferRef.current.slice(),
      });

      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      channel.close();
    };
  }, [isInit]);

  const handleFftSizeChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    ch: 0 | 1,
  ) => {
    if (!audioRef.current) return;
    const fftSize = Number(e.target.value);
    audioRef.current.analyser[ch].fftSize = fftSize;
    audioRef.current.buffer[ch] = new Float32Array(fftSize);
    visualBufferRef.current[ch] = new Float32Array(fftSize);
    outputBufferRef.current[ch] = new Float32Array(fftSize);
    const maxSize = Math.max(
      visualBufferRef.current[0].length,
      visualBufferRef.current[1].length,
    );
    visualBufferRef.current[2] = new Float32Array(maxSize);
    outputBufferRef.current[2] = new Float32Array(maxSize);
    audioTexsRef.current[ch]?.dispose();
    audioTexsRef.current[ch] = createTex(outputBufferRef.current[ch]);
    audioTexsRef.current[2]?.dispose();
    audioTexsRef.current[2] = createTex(outputBufferRef.current[2]);
    useAudioValueStore.getState().updateFftSize(ch, fftSize);
  };

  const handleSampleRateChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!audioRef.current) return;
    if (audioRef.current.audioCtx.state === "closed") return;
    const sr = Number(e.target.value);
    await audioRef.current.audioCtx.close();
    audioRef.current = await playAudio(sr, fftSize);
    useAudioValueStore.getState().updateSampleRate(sr);
  };

  const handleSmoothChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const smooths = useAudioValueStore.getState().smooths.slice() as [
      number,
      number,
    ];
    smooths[index] = Number(e.target.value);
    useAudioValueStore.getState().updateSmooth(smooths);
  };

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <canvas style={{ width: "80%" }} ref={canvasRef} />
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2>bpm</h2>
        <div>{bpm}</div>
      </div>
      <div>
        <h2>fftSize</h2>
        <div style={{ display: "flex" }}>
          <div>left</div>
          <select
            value={fftSize[0]}
            onChange={(e) => handleFftSizeChange(e, 0)}
          >
            {[32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384].map(
              (v, i) => (
                <option key={i} value={v}>
                  {v}
                </option>
              ),
            )}
          </select>
          <div>{fftSize[0]}</div>
        </div>
        <div style={{ display: "flex" }}>
          <div>right</div>
          <select
            value={fftSize[1]}
            onChange={(e) => handleFftSizeChange(e, 1)}
          >
            {[32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384].map(
              (v, i) => (
                <option key={i} value={v}>
                  {v}
                </option>
              ),
            )}
          </select>
          <div>{fftSize[1]}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2>sampleRate</h2>
        <input
          type="range"
          min={3000}
          max={768000}
          step={1000}
          value={sampleRate}
          onChange={(e) => handleSampleRateChange(e)}
        />
        <div>{sampleRate}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2>smooth0</h2>
        <input
          type="range"
          min={0.5}
          max={1}
          step={0.001}
          value={smooths[0]}
          onChange={(e) => handleSmoothChange(e, 0)}
        />
        <div>{smooths[0]}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2>smooth1</h2>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={smooths[1]}
          onChange={(e) => handleSmoothChange(e, 1)}
        />
        <div>{smooths[1]}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2>pmAver</h2>
        <input
          type="range"
          min={1}
          max={1000}
          step={1}
          value={pmAverWindow}
          onChange={(e) =>
            useAudioValueStore
              .getState()
              .updatePmAverWindow(Number(e.target.value))
          }
        />
        <div>{pmAverWindow}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2>amp</h2>
        <input
          type="range"
          min={1}
          max={200}
          step={1}
          value={amp}
          onChange={(e) =>
            useAudioValueStore.getState().updateAmp(Number(e.target.value))
          }
        />
        <div>{amp}</div>
      </div>
    </div>
  );
}
