"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BpmDetector } from "@/app/tools/bpmDetector";
import { useAudioValueStore } from "../store/audioValueStore";
import { stereoScene } from "./graph/stereo";
import { monoScene } from "./graph/mono";

interface AudioRefProps {
  audioCtx: AudioContext;
  analyser: [AnalyserNode, AnalyserNode];
  buffer: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>];
}

function setThree(canvas: HTMLCanvasElement) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(W * 2, H, false);
  renderer.setScissorTest(true);
  return { camera, renderer, W, H };
}

async function playAudio(
  sampleRate: number,
  fftSize: [number, number],
): Promise<AudioRefProps> {
  const audioCtx = new AudioContext({ sampleRate }); //[3000, 768000]
  console.log(audioCtx.sampleRate);
  const analyserL = audioCtx.createAnalyser();
  const analyserR = audioCtx.createAnalyser();
  analyserL.fftSize = fftSize[0];
  analyserR.fftSize = fftSize[1];
  const bufferL = new Float32Array(analyserL.fftSize);
  const bufferR = new Float32Array(analyserR.fftSize);

  /* */
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
  /* */
  const splitter = audioCtx.createChannelSplitter(2);
  const source = audioCtx.createMediaStreamSource(stream);
  const gain = audioCtx.createGain();
  gain.gain.value = 1;
  source.connect(gain).connect(splitter);
  splitter.connect(analyserL, 0);
  splitter.connect(analyserR, 1);
  source.connect(audioCtx.destination);

  return {
    audioCtx,
    analyser: [analyserL, analyserR],
    buffer: [bufferL, bufferR],
  };
}

function createTex(fBuffer: Float32Array<ArrayBuffer>) {
  const texture = new THREE.DataTexture(
    fBuffer,
    fBuffer.length,
    1,
    THREE.RedFormat,
    THREE.FloatType,
  );
  texture.needsUpdate = true;
  return texture;
}

function pmAverEffect(fBuffer: Float32Array<ArrayBuffer>) {
  const size = fBuffer.length;
  const temp = new Float32Array(size);
  const window = useAudioValueStore.getState().pmAverWindow;

  for (let i = 0; i < size; i++) {
    let sum = 0;
    let counter = 0;

    const start = Math.max(0, i - window);
    const end = Math.min(size, i + window);
    for (let j = start; j < end; j++) {
      sum += fBuffer[j];
      counter++;
    }
    temp[i] = sum / counter;
  }
  fBuffer.set(temp);
}

function smoothEffect(
  visualBuffer: Float32Array<ArrayBuffer>[],
  audioRef: AudioRefProps,
  ch: 0 | 1,
) {
  const smooth = useAudioValueStore.getState().smooth;
  for (let i = 0; i < audioRef.analyser[ch].fftSize; i++) {
    visualBuffer[ch][i] =
      visualBuffer[ch][i] * smooth + audioRef.buffer[ch][i] * (1 - smooth);
  }
}

function updateMonoBuffer(
  visualBuffer: [
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>,
  ],
) {
  const sizeL = visualBuffer[0].length;
  const sizeR = visualBuffer[1].length;
  const size = Math.max(sizeL, sizeR);

  for (let i = 0; i < size; i++) {
    const v0 = visualBuffer[0][Math.floor((i * sizeL) / size)] * 0.5;
    const v1 = visualBuffer[1][Math.floor((i * sizeR) / size)] * 0.5;
    visualBuffer[2][i] = v0 + v1;
  }
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioRefProps | null>(null);
  const [isInit, setIsInit] = useState<boolean>(false);
  const visualBufferRef = useRef<
    [
      Float32Array<ArrayBuffer>,
      Float32Array<ArrayBuffer>,
      Float32Array<ArrayBuffer>,
    ]
  >([new Float32Array(2048), new Float32Array(2048), new Float32Array(2048)]);
  const audioTexsRef = useRef<
    [
      THREE.DataTexture | null,
      THREE.DataTexture | null,
      THREE.DataTexture | null,
    ]
  >([null, null, null]);
  const fftSize = useAudioValueStore((s) => s.fftSize);
  const sampleRate = useAudioValueStore((s) => s.sampleRate);
  const smooth = useAudioValueStore((s) => s.smooth);
  const pmAverWindow = useAudioValueStore((s) => s.pmAverWindow);
  const shaderAmp = useAudioValueStore((s) => s.shaderAmp);

  const bpm = useAudioValueStore((s) => s.bpm);

  const channel = new BroadcastChannel("mixerOutputVj");

  useEffect(() => {
    const handleClick = async () => {
      audioRef.current = await playAudio(44100, fftSize);
      setIsInit(true);
    };
    window.addEventListener("click", handleClick, { once: true });
  }, []);

  useEffect(() => {
    let animId: number;

    if (!canvasRef.current) return;
    if (!audioRef.current) return;
    if (!isInit) return;

    for (let ch = 0; ch < 2; ch++) {
      const tex = createTex(visualBufferRef.current[ch]);
      audioTexsRef.current[ch] = tex;
    }
    const tex = createTex(visualBufferRef.current[2]);
    audioTexsRef.current[2] = tex;

    const { renderer, camera, W, H } = setThree(canvasRef.current);
    const scene0 = new THREE.Scene();
    const scene1 = new THREE.Scene();
    const stereoObserver = stereoScene(scene0);
    stereoObserver.init([audioTexsRef.current[0]!, audioTexsRef.current[1]!]);
    const monoObserver = monoScene(scene1);
    monoObserver.init(audioTexsRef.current[2]!);

    //bpmdetector専用のanalyser必要
    const bpmDetector = BpmDetector.createBpm();
    bpmDetector.init(audioRef.current.analyser[0]);

    const clock = new THREE.Clock();

    let lastTime = 0;
    let frameCount = 0;
    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        console.log(`FPS: ${frameCount}`);
        frameCount = 0;
        lastTime = now;
      }

      const time = clock.getElapsedTime();
      const detectedBpm = bpmDetector.update(time);
      // console.log(bpm);
      if (bpm !== detectedBpm) {
        useAudioValueStore.getState().updateBpm(detectedBpm);
      }

      if (audioRef.current) {
        for (let ch = 0; ch < 2; ch++) {
          audioRef.current.analyser[ch].getFloatTimeDomainData(
            audioRef.current.buffer[ch],
          );
        }

        smoothEffect(visualBufferRef.current, audioRef.current, 0);
        smoothEffect(visualBufferRef.current, audioRef.current, 1);

        pmAverEffect(visualBufferRef.current[0]);
        pmAverEffect(visualBufferRef.current[1]);

        updateMonoBuffer(visualBufferRef.current);

        audioTexsRef.current.forEach((tex) => {
          if (tex) {
            tex.needsUpdate = true;
          }
        });

        const shaderAmp = useAudioValueStore.getState().shaderAmp;
        stereoObserver.update(shaderAmp, [
          audioTexsRef.current[0]!,
          audioTexsRef.current[1]!,
        ]);
        monoObserver.update(shaderAmp, audioTexsRef.current[2]!);
      }

      // console.log(renderer.capabilities.maxTextureSize);

      renderer.setViewport(0, 0, W, H);
      renderer.setScissor(0, 0, W, H);
      renderer.render(scene0, camera);
      renderer.setViewport(W, 0, W, H);
      renderer.setScissor(W, 0, W, H);
      renderer.render(scene1, camera);

      channel.postMessage({
        buffers: visualBufferRef.current.slice(),
        smooth: useAudioValueStore.getState().smooth,
      });

      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
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
    const maxSize = Math.max(
      visualBufferRef.current[0].length,
      visualBufferRef.current[1].length,
    );
    visualBufferRef.current[2] = new Float32Array(maxSize);
    audioTexsRef.current[ch]?.dispose();
    audioTexsRef.current[ch] = createTex(visualBufferRef.current[ch]);
    audioTexsRef.current[2]?.dispose();
    audioTexsRef.current[2] = createTex(visualBufferRef.current[2]);
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

  const handleSmoothChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    useAudioValueStore.getState().updateSmooth(Number(e.target.value));
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
        <h2>smooth</h2>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={smooth}
          onChange={(e) => handleSmoothChange(e)}
        />
        <div>{smooth}</div>
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
        <h2>shaderAmp</h2>
        <input
          type="range"
          min={1}
          max={200}
          step={1}
          value={shaderAmp}
          onChange={(e) =>
            useAudioValueStore
              .getState()
              .updateShaderAmp(Number(e.target.value))
          }
        />
        <div>{shaderAmp}</div>
      </div>
    </div>
  );
}
