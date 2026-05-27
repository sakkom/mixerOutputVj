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
import {
  AudioRefProps,
  AudioTexs,
  OutputVisualParams,
  ThreeFloat32Array,
  VisualParams,
} from "./utils/interface";
import {
  Layer,
  LayerPattern,
  useVisualParamsStore,
} from "../store/visualParamsStore";

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

  const stereo = useVisualParamsStore((s) => s.stereo);
  const mono = useVisualParamsStore((s) => s.mono);
  const selector = useVisualParamsStore((s) => s.selector);
  const layer = useVisualParamsStore((s) => s.layer);
  const visualParams: OutputVisualParams = { stereo, mono, layer };

  /*midi */
  const midiOutputRef = useRef<MIDIOutput | null>(null);
  const midiInputRef = useRef<MIDIInput | null>(null);
  const selectorRef = useRef<Set<"s" | "m">>(new Set());
  const layerRef = useRef<Set<"s" | "m" | "r">>(new Set());
  const zrcRef = useRef<number>(0);

  useEffect(() => {}, []);

  const handleFftSizeChange = (fftSize: number, ch: 0 | 1) => {
    if (!audioRef.current) return;
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
  useEffect(() => {
    const handleClick = async () => {
      audioRef.current = await playAudio(44100, fftSize);
      setIsInit(true);
    };
    window.addEventListener("click", handleClick, { once: true });

    function onMIDISuccess(midiAccess: MIDIAccess) {
      const output =
        [...midiAccess.outputs.values()].find((o) =>
          o.name?.includes("nanoKONTROL2"),
        ) ?? null;
      midiOutputRef.current = output;
      const input =
        [...midiAccess.inputs.values()].find((o) =>
          o.name?.includes("nanoKONTROL2"),
        ) ?? null;
      midiInputRef.current = input;

      if (!midiInputRef.current) return;
      midiInputRef.current.onmidimessage = (e) => {
        if (!e.data) return;
        const [status, cc, value] = e.data;

        const waveCcRange = {
          amp: 1000,
          windows: 150,
        };
        const waveCcMap: Record<number, (norm: number) => void> = {
          0: (n) => {
            const tmp = Math.max(n * 1000, 1).toFixed(3);
            const amp = Number(tmp);
            useAudioValueStore.getState().updateAmp(amp);
          },
          1: (n) => {
            n = Number(n.toFixed(3));
            const s = useAudioValueStore.getState();
            s.updateSmooth([n, s.smooths[1]]);
          },
          2: (n) => {
            n = Number(n.toFixed(3));
            const s = useAudioValueStore.getState();
            s.updateSmooth([s.smooths[0], n]);
          },
          10: (n) => {
            const arr = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];
            const i = Math.floor(n * (arr.length - 1));
            const fftSize = arr[i];
            handleFftSizeChange(fftSize, 0);
            useAudioValueStore.getState().updateFftSize(0, fftSize);
          },
          11: (n) => {
            const arr = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];
            const i = Math.floor(n * (arr.length - 1));
            const fftSize = arr[i];
            handleFftSizeChange(fftSize, 1);
            useAudioValueStore.getState().updateFftSize(1, fftSize);
          },
          12: (n) => {
            n = Math.max(Math.round(n * 150), 1);
            useAudioValueStore.getState().updatePmAverWindow(n);
          },
        };

        const visualCcRange = {
          loopNum: 10,
          bold: 0.5,
        };
        const visualCcMap: Record<number, (norm: number) => void> = {
          13: (n) => {
            const loopNum = Math.max(Math.floor(n * visualCcRange.loopNum), 1);
            const s = useVisualParamsStore.getState();
            const sel = selectorRef.current;
            if (sel.has("s")) s.updateStereo({ loopNum, bold: s.stereo.bold });
            if (sel.has("m")) s.updateMono({ loopNum, bold: s.mono.bold });
          },
          14: (n) => {
            const bold = Number(
              Math.max(n * visualCcRange.bold, 0.005).toFixed(3),
            );
            const s = useVisualParamsStore.getState();
            const sel = selectorRef.current;
            if (sel.has("s"))
              s.updateStereo({ loopNum: s.stereo.loopNum, bold });
            if (sel.has("m")) s.updateMono({ loopNum: s.mono.loopNum, bold });
          },
          91: (n) => {
            n > 0
              ? selectorRef.current.add("m")
              : selectorRef.current.delete("m");
            const status =
              selectorRef.current.has("s") && selectorRef.current.has("m")
                ? "sm"
                : selectorRef.current.has("m")
                  ? "m"
                  : selectorRef.current.has("s")
                    ? "s"
                    : null;
            useVisualParamsStore.getState().updateSelector(status);
            midiOutputRef.current?.send([176, 91, n > 0 ? 127 : 0]);
          },
          92: (n) => {
            n > 0
              ? selectorRef.current.add("s")
              : selectorRef.current.delete("s");
            const status =
              selectorRef.current.has("s") && selectorRef.current.has("m")
                ? "sm"
                : selectorRef.current.has("m")
                  ? "m"
                  : selectorRef.current.has("s")
                    ? "s"
                    : null;
            useVisualParamsStore.getState().updateSelector(status);
            midiOutputRef.current?.send([176, 92, n > 0 ? 127 : 0]);
          },
        };
        function getLayer(n: number, s: "s" | "m" | "r") {
          n > 0 ? layerRef.current.add(s) : layerRef.current.delete(s);
          const has = (key: "s" | "m" | "r") => layerRef.current.has(key);
          let pattern: LayerPattern;
          if (has("s") && has("m") && has("r")) pattern = "ms";
          else if (has("s") && has("m")) pattern = "sm";
          else if (has("s")) pattern = "s";
          else if (has("m")) pattern = "m";
          else pattern = null;
          const alpha = Number(n.toFixed(2));
          const alphas = useVisualParamsStore.getState().layer.alphas;
          const newAlphas =
            s === "s"
              ? [alpha, alphas[1]]
              : s === "m"
                ? [alphas[0], alpha]
                : alphas;
          useVisualParamsStore
            .getState()
            .updateLayer({ pattern, alphas: newAlphas });
        }
        //sliderでα同期してもいいかも
        const layerCcMap: Record<number, (norm: number) => void> = {
          //stereo
          6: (n) => {
            getLayer(n, "s");
          },
          //mono
          7: (n) => {
            getLayer(n, "m");
          },
          //reverse
          90: (n) => {
            getLayer(n, "r");
            midiOutputRef.current?.send([176, 90, n > 0 ? 127 : 0]);
          },
        };

        //ボタンも変える？[0, 1][0,127]
        const norm = value / 127;
        waveCcMap[cc]?.(norm);
        visualCcMap[cc]?.(norm);
        layerCcMap[cc]?.(norm);
      };
    }

    const loop = () => {
      requestAnimationFrame(loop);
    };
    loop();
    window.navigator.requestMIDIAccess().then(onMIDISuccess);
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

      const vS = useVisualParamsStore.getState();
      const visualParams: OutputVisualParams = {
        stereo: {
          loopNum: vS.stereo.loopNum,
          bold: vS.stereo.bold,
          alphas: vS.layer.alphas,
        },
        mono: {
          loopNum: vS.mono.loopNum,
          bold: vS.mono.bold,
          alphas: vS.layer.alphas,
        },
        layer: vS.layer,
      };
      channel.postMessage({
        buffers: outputBufferRef.current.slice(),
        visualParams,
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
            onChange={(e) => handleFftSizeChange(Number(e.target.value), 0)}
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
            onChange={(e) => handleFftSizeChange(Number(e.target.value), 1)}
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
      <div style={{ backgroundColor: "black", color: "white" }}>
        <h1>visual params</h1>
        <h2>selector: {selector}</h2>
        <h2>{JSON.stringify(layer)}</h2>
        <div>
          <div>stereo</div>
          <h2>{JSON.stringify(stereo)}</h2>
        </div>
        <div>
          <div>mono</div>
          <h2>{JSON.stringify(mono)}</h2>
        </div>
      </div>
    </div>
  );
}
