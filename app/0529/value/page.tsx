"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
// import { BpmDetector } from "@/app/tools/bpmDetector";
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
  OriginAudioRefProps,
  OutputVisualParams,
  SpiralInterface,
  ThreeFloat32Array,
  VisualParams,
} from "./utils/interface";
import {
  Layer,
  LayerPattern,
  Selector,
  useVisualParamsStore,
} from "../store/visualParamsStore";
import { audioAnalyerEvent } from "./analyer";
import { fftScene } from "./graph/fft";
import { useAudioEventStore } from "../store/audioEventStore";
import { useBirdsEyeStore } from "../store/birdsEyeStore";
import { createRenderer, setObserver, setRecorder, waveParams } from "../page";
import { useSpiralStore } from "../store/spiralStore";

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
  const viewCanvasRef = useRef<HTMLCanvasElement>(null);
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
  const waveParams = useRef<any | null>(null);
  const visualParams = useRef<OutputVisualParams | null>(null);

  const fftSize = useAudioValueStore((s) => s.fftSize);
  const sampleRate = useAudioValueStore((s) => s.sampleRate);
  const smooths = useAudioValueStore((s) => s.smooths);
  const pmAverWindow = useAudioValueStore((s) => s.pmAverWindow);
  const amp = useAudioValueStore((s) => s.amp);

  const bpm = useAudioEventStore((s) => s.bpm);

  const stereo = useVisualParamsStore((s) => s.stereo);
  const mono = useVisualParamsStore((s) => s.mono);
  const selector = useVisualParamsStore((s) => s.selector);
  const layer = useVisualParamsStore((s) => s.layer);

  const bpmKick = useAudioEventStore((s) => s.bpmKick);
  const rms = useAudioEventStore((s) => s.rms);
  // const timerRef = useRef<number>(0);
  const [time, setTime] = useState<number>(0);
  const [visualParamsData, setVisualParamsData] =
    useState<OutputVisualParams | null>();
  const chunkRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // const visualParams: OutputVisualParams = {
  //   stereo,
  //   mono,
  //   layer,
  //   bpmKick,
  //   birdsEye: { mode: birdsEyeMode },
  // };

  /*midi */
  const midiOutputRef = useRef<MIDIOutput | null>(null);
  const midiInputRef = useRef<MIDIInput | null>(null);
  const selectorRef = useRef<Set<"s" | "m">>(new Set());
  const layerRef = useRef<Set<"s" | "m" | "r">>(new Set());
  // const zrcRef = useRef<number>(0);

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
            const tmp = Math.max(n * 15, 1).toFixed(3);
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
          16: (n) => {
            const loopNum = Math.max(Math.floor(n * visualCcRange.loopNum), 1);
            const s = useVisualParamsStore.getState();
            const sel = useVisualParamsStore.getState().selector;
            if (sel === "s" || sel === "sm")
              s.updateStereo({
                loopNum,
                bold: s.stereo.bold,
                isCircle: s.isCircle[0],
              });
            if (sel === "m" || sel === "sm")
              s.updateMono({
                loopNum,
                bold: s.mono.bold,
                isCircle: s.isCircle[1],
              });
          },
          17: (n) => {
            const bold = Number(
              Math.max(n * visualCcRange.bold, 0.005).toFixed(3),
            );
            const s = useVisualParamsStore.getState();
            const sel = useVisualParamsStore.getState().selector;
            if (sel === "s" || sel === "sm")
              s.updateStereo({
                loopNum: s.stereo.loopNum,
                bold,
                isCircle: s.isCircle[0],
              });
            if (sel === "m" || sel === "sm")
              s.updateMono({
                loopNum: s.mono.loopNum,
                bold,
                isCircle: s.isCircle[1],
              });
          },
          3: (n) => {
            const select = n < 0.1 ? "sm" : n > 0.9 ? "s" : "m";
            useVisualParamsStore.getState().updateSelector(select as Selector);
          },
          13: (n) => {
            const select = useVisualParamsStore.getState().selector;
            let renew = useVisualParamsStore.getState().isCircle.slice();
            if (select === "s") renew[0] = n;
            if (select === "m") renew[1] = n;
            if (select === "sm") renew = [n, n];
            useVisualParamsStore
              .getState()
              .updateIsCircle(renew as [number, number]);
          },
          100: (n) => {
            let renew = useVisualParamsStore.getState().isPinpong.slice();
            renew = [n, renew[1]];

            useVisualParamsStore
              .getState()
              .updateIsPingPong(renew as [number, number]);
            midiOutputRef.current?.send([176, 100, n > 0.5 ? 127 : 0]);
          },
          101: (n) => {
            let renew = useVisualParamsStore.getState().isPinpong.slice();
            renew = [renew[0], n];
            useVisualParamsStore
              .getState()
              .updateIsPingPong(renew as [number, number]);
            midiOutputRef.current?.send([176, 101, n > 0.5 ? 127 : 0]);
          },
          102: (n) => {
            let renew = useVisualParamsStore.getState().isCircleMove.slice();
            renew = [n, renew[1]];
            useVisualParamsStore
              .getState()
              .updateIsCiecleMove(renew as [number, number]);
            midiOutputRef.current?.send([176, 102, n > 0.5 ? 127 : 0]);
          },
          103: (n) => {
            let renew = useVisualParamsStore.getState().isCircleMove.slice();
            renew = [renew[0], n];
            useVisualParamsStore
              .getState()
              .updateIsCiecleMove(renew as [number, number]);
            midiOutputRef.current?.send([176, 103, n > 0.5 ? 127 : 0]);
          },
          21: (n) => {
            let renew = useVisualParamsStore
              .getState()
              .isCircleMoveColor.slice();
            renew = [n, renew[1]];
            useVisualParamsStore
              .getState()
              .updateIsCiecleMoveColor(renew as [number, number]);
            midiOutputRef.current?.send([176, 21, n > 0.5 ? 127 : 0]);
          },
          20: (n) => {
            let renew = useVisualParamsStore
              .getState()
              .isCircleMoveColor.slice();
            renew = [renew[0], n];
            useVisualParamsStore
              .getState()
              .updateIsCiecleMoveColor(renew as [number, number]);
            midiOutputRef.current?.send([176, 20, n > 0.5 ? 127 : 0]);
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

        const birdsEyeCcMap: Record<number, (norm: number) => void> = {
          5: (n) => {
            useBirdsEyeStore.getState().updateIsBirdEye(n);
          },
        };

        const audioCcMap: Record<number, (norm: number) => void> = {
          104: () => {
            const renew = !useAudioEventStore.getState().isActive;
            useAudioEventStore.getState().updateIsActive(renew);
            midiOutputRef.current?.send([
              176,
              104,
              Number(renew) > 0 ? 127 : 0,
            ]);
          },
        };

        const 球面螺旋Map: Record<number, (norm: number) => void> = {
          4: (n) => {
            useSpiralStore.getState().updateThreshold(n);
          },
          15: (n) => {
            const speedArray = [0.5, 1, 2];
            const index = Math.floor(n * 2);
            console.log(index);
            useSpiralStore.getState().updateSpeed(speedArray[index]);
          },
          61: (n) => {
            const current = useVisualParamsStore.getState().monoObjectType;
            if (current === "Mesh") {
              useVisualParamsStore.getState().updateMonoObjectType("Points");
              midiOutputRef.current?.send([176, 61, 127]);
            } else {
              useVisualParamsStore.getState().updateMonoObjectType("Mesh");
              midiOutputRef.current?.send([176, 61, 0]);
            }
          },
          62: (n) => {
            const current = useVisualParamsStore.getState().stereoObjectType;
            if (current === "Mesh") {
              useVisualParamsStore.getState().updateStereoObjectType("Points");
              midiOutputRef.current?.send([176, 62, 127]);
            } else {
              useVisualParamsStore.getState().updateStereoObjectType("Mesh");
              midiOutputRef.current?.send([176, 62, 0]);
            }
          },
        };

        //ボタンも変える？[0, 1][0,127]
        const norm = value / 127;
        waveCcMap[cc]?.(norm);
        visualCcMap[cc]?.(norm);
        layerCcMap[cc]?.(norm);
        birdsEyeCcMap[cc]?.(norm);
        audioCcMap[cc]?.(norm);
        球面螺旋Map[cc]?.(norm);
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

    const audioObserver = audioAnalyerEvent();

    const timer = new THREE.Timer();

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

      timer.update();
      const time = timer.getElapsed();
      audioObserver.update(time);

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
      // renderer.render(audioObserver.scene, camera);
      renderer.render(scene0, camera);
      renderer.setViewport(W, 0, W, H);
      renderer.setScissor(W, 0, W, H);
      renderer.render(scene1, camera);

      const vS = useVisualParamsStore.getState();
      // const bpmkickValue = useAudioEventStore.getState().isActive
      //   ? useAudioEventStore.getState().bpmKick
      //   : 0;
      const bpmkickValue = useAudioEventStore.getState().bpmKick;
      const visualParamsData: OutputVisualParams = {
        stereo: {
          loopNum: vS.stereo.loopNum,
          bold: vS.stereo.bold,
          alphas: vS.layer.alphas,
          isCircle: vS.isCircle[0],
          isPinPong: vS.isPinpong[0],
          isCircleMove: vS.isCircleMove[0],
          isCircleMoveColor: vS.isCircleMoveColor[0],
          objectType: vS.stereoObjectType,
        },
        mono: {
          loopNum: vS.mono.loopNum,
          bold: vS.mono.bold,
          alphas: vS.layer.alphas,
          isCircle: vS.isCircle[1],
          isPinPong: vS.isPinpong[1],
          isCircleMove: vS.isCircleMove[1],
          isCircleMoveColor: vS.isCircleMoveColor[1],
          objectType: vS.monoObjectType,
        },
        layer: vS.layer,
        bpmKick: bpmkickValue,
        birdsEye: {
          isBirdsEye: useBirdsEyeStore.getState().isBirdsEye,
        },
        bpm: useAudioEventStore.getState().bpm,
      };
      const spiralData: SpiralInterface = {
        threshold: useSpiralStore.getState().threshold,
        morphSpeed: useSpiralStore.getState().speed,
      };
      setVisualParamsData(visualParamsData);
      visualParams.current = visualParamsData;
      waveParams.current = outputBufferRef.current.slice();
      // for (let i = 0; i < waveParams.current[0].length; i++) {
      //   waveParams.current[0][i] = Math.random() - 0.5;
      // }
      // for (let i = 1; i < waveParams.current[1].length; i++) {
      //   waveParams.current[1][i] = Math.random() - 0.5;
      // }
      // for (let i = 2; i < waveParams.current[2].length; i++) {
      //   waveParams.current[2][i] = Math.random() - 0.5;
      // }
      // console.log(waveParams.current);
      channel.postMessage({
        buffers: outputBufferRef.current.slice(),
        visualParamsData,
        spiralData,
      });

      animId = requestAnimationFrame(loop);
      setTime(time);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      channel.close();
    };
  }, [isInit]);

  // useEffect(() => {
  //   let aniId: number;
  //   if (!viewCanvasRef.current || !waveParams.current) return;

  //   const renderer = createRenderer(viewCanvasRef.current);

  //   const { stereoVisualObserver, monoVisualObserver } = setObserver(
  //     renderer,
  //     waveParams.current,
  //   );

  //   const clock = new THREE.Clock();
  //   let lastTime = 0;
  //   let frameCount = 0;
  //   let counter = 0;
  //   const loop = () => {
  //     // console.log(
  //     //   visualParams.current?.mono.isCircleMove,
  //     //   visualParams.current?.stereo.isCircleMove,
  //     // );
  //     frameCount++;
  //     const now = performance.now();
  //     if (now - lastTime >= 1000) {
  //       // console.log(`FPS: ${frameCount}`);
  //       frameCount = 0;
  //       lastTime = now;
  //     }
  //     if (waveParams.current) {
  //       stereoVisualObserver.update(
  //         clock.getElapsedTime(),
  //         renderer,
  //         [waveParams.current[0], waveParams.current[1]],
  //         visualParams.current!.stereo,
  //         visualParams.current!.bpmKick,
  //         visualParams.current!.bpm,
  //       );
  //       // monoVisualObserver.update(
  //       //   clock.getElapsedTime(),
  //       //   renderer,
  //       //   waveParams.current[2],
  //       //   visualParams.current!.mono,
  //       //   visualParams.current!.bpmKick,
  //       //   visualParams.current!.birdsEye,
  //       //   visualParams.current!.bpm,
  //       // );

  //       /*layer pattern */
  //       if (counter % 2 === 0) {
  //         renderer.setRenderTarget(null);
  //         renderer.clear();
  //         const pattern = visualParams.current?.layer.pattern;
  //         if (pattern === "sm") {
  //           monoVisualObserver.render(renderer);
  //           stereoVisualObserver.render(renderer);
  //         } else if (pattern === "ms") {
  //           stereoVisualObserver.render(renderer);
  //           monoVisualObserver.render(renderer);
  //         } else if (pattern === "s") {
  //           stereoVisualObserver.render(renderer);
  //         } else if (pattern === "m") {
  //           monoVisualObserver.render(renderer);
  //         }
  //       }
  //     }

  //     aniId = requestAnimationFrame(loop);
  //     counter++;
  //   };
  //   loop();
  //   return () => {
  //     cancelAnimationFrame(aniId);
  //     renderer.dispose();
  //   };
  // }, [isInit]);

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
  const handlePlay = async () => {
    if (!viewCanvasRef.current) return;
    const { recorder } = await setRecorder(viewCanvasRef.current);
    recorderRef.current = recorder;
    recorderRef.current.ondataavailable = (e) => chunkRef.current.push(e.data);
    // recorderRef.current.start(30000);
    recorderRef.current.start();
  };
  const handleDownload = () => {
    const blob = new Blob(chunkRef.current, { type: "video/mp4" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    // console.log(a);
    a.download = "0531.mp4";
    a.click();
    recorderRef.current?.stop();
  };

  return (
    <div style={{ margin: 0, padding: 0, position: "relative" }}>
      <canvas
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "black",
          // position: "fixed",
        }}
        ref={viewCanvasRef}
      />
      <canvas style={{ width: "80%" }} ref={canvasRef} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          // alignItems: "center",
          position: "absolute",
          top: 0,
          right: 0,
          // color: `hsl(${time * 0.1 * 360} 100% 50%)`,
          // transform: `translate($P})`
          // opacity: `${Math.sin(time * 0.5) * 0.5 + 0.5}`,
          width: "100%",
          height: "100vh",
          // textAlign: "center",
        }}
      >
        {/*<div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            marginTop: "100px",
            fontWeight: "bold",
            color: "rgb(57, 255, 20)",
            // transform: `translateX(${Math.sin(time * 100) * 500}px) translateY(${Math.sin(time * 100 + 100) * 500}px)`,
            letterSpacing: `${Math.sin(time) * 25}px`,
            fontSize: `${Math.sin(time) * 100}px`,
          }}
        >
          {time.toFixed(2)}
        </div>
        {visualParamsData && (
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {JSON.stringify(visualParamsData)
              .split("")
              // .map((char, i) => (
              //   <div
              //     key={i}
              //     style={{
              //       // transform: `translateX(${Math.sin(i + time) * 50}px) translateY(${Math.sin(i * 10 + time) * 50}px) rotate(${i + time * 10}deg)`,
              //       // fontSize: `${Math.sin(i * 1000) * 100 + 10}px`,
              //       letterSpacing: `${Math.sin(i + time) * 20}px`,
              //     }}
              //   >
              //     {char}
              //   </div>
              // ))
              .map((char, i) => {
                const cycle = Math.floor(time % 5);
                const colorIndex =
                  Math.floor((time * 0.5) / Math.floor(Math.random() * 10)) * 2;
                // const colorIndex = Math.floor(i / 5) * 10;
                // console.log(cycle);
                return (
                  <div
                    key={i}
                    style={{
                      transform:
                        cycle === 1
                          ? `rotate(${i + time * 100 * i}deg)`
                          : `translateX(${Math.sin(i + time) * 0}px) translateY(${Math.sin(i * 10 + time) * 0}px) rotate(${0}deg)`,
                      fontSize: `${(Math.sin(i * 100000) * 0.5 + 0.5) * 20 + 10}px`,
                      color:
                        colorIndex % 2 === 0
                          ? `rgb(138, 0, 255)`
                          : `rgb(255, 38, 3)`,
                      marginTop:
                        cycle === 4
                          ? `${(Math.sin(colorIndex * 10000) * 0.5 + 0.5) * 700}px`
                          : `${0}px`,

                      // letterSpacing:
                      //   cycle === 3 ? `${Math.sin(i + time) * 20}px` : "",
                    }}
                  >
                    {char}
                  </div>
                );
              })}
          </div>
        )}*/}
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
      {/**/}
      <div>
        bpmKick
        <div
          style={{
            width: "100px",
            height: "100px",
          }}
        >
          <div
            style={{
              width: `${bpmKick * 100}px`,
              height: `${bpmKick * 100}px`,
              backgroundColor: "blue",
            }}
          >
            {bpmKick}
          </div>
        </div>
      </div>
      <div>
        rms
        <div
          style={{
            width: "800px",
            height: "100px",
          }}
        >
          <div
            style={{
              width: `${rms * 800}px`,
              height: "100px",
              backgroundColor: "green",
            }}
          >
            {rms}
          </div>
        </div>
      </div>
      <div onClick={handlePlay} style={{ color: "black" }}>
        rec
      </div>
      <div onClick={handleDownload} style={{ color: "black" }}>
        download
      </div>
    </div>
  );
}
