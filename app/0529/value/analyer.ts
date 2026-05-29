import { OriginAudioRefProps } from "./utils/interface";
import { useAudioValueStore } from "../store/audioValueStore";
import * as THREE from "three";
import { fftScene } from "./graph/fft";
import { useAudioEventStore } from "../store/audioEventStore";

export async function playAudioAnalyer(): Promise<OriginAudioRefProps> {
  const audioCtx = new AudioContext({ sampleRate: 44100 }); //[3000, 768000]
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  const domainBuffer = new Float32Array(analyser.fftSize);
  const fftBuffer = new Uint8Array(analyser.frequencyBinCount);
  analyser.smoothingTimeConstant = 0;
  const liveGain = 0.1;

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
      channelCount: 1,
    },
  });
  /* */
  const source = audioCtx.createMediaStreamSource(stream);
  const gain = audioCtx.createGain();
  gain.gain.value = liveGain;
  source.connect(gain).connect(analyser);
  source.connect(audioCtx.destination);

  return {
    audioCtx,
    analyser,
    domainBuffer,
    fftBuffer,
    gain: liveGain,
  };
}

export const AudioEventKun = () => {
  function createBpm() {
    interface Onset {
      timestamp: number;
      fluxValue: number;
      bin: number;
    }

    const onsets: Onset[] = [];
    let bpm = 0;
    let lastOnsetTime = 0;
    let frameCounter = 0;
    //動的flux
    const fluxHistory: number[] = [];
    let prevLow = 0;
    let prevMid = 0;
    let prevHigh = 0;

    function getAver(
      buffer: Uint8Array,
      targetHz: [number, number],
      sampleRate: number,
      fftSize: number,
    ) {
      const bin = sampleRate / fftSize;
      const start = Math.floor(targetHz[0] / bin);
      const end = Math.ceil(targetHz[1] / bin);
      let sum = 0;
      for (let i = start; i < end; i++) sum += buffer[i];
      return sum / (end - start);
    }
    function calcBPM(onsets: Onset[]): number {
      const bpms = new Map<number, number>();

      for (let i = 0; i < onsets.length - 8; i++) {
        for (let j = 1; j <= 8; j++) {
          const space = (onsets[i + j].timestamp - onsets[i].timestamp) / j;
          if (space < 0.2 || space > 1.0) continue;

          let bpm = 60 / space;
          while (bpm < 90) bpm *= 2;
          while (bpm > 180) bpm /= 2;
          bpm = Math.round(bpm);

          const weight = 1.0 / j;
          bpms.set(bpm, (bpms.get(bpm) || 0) + weight);
        }
      }

      const clusters = new Map<number, number>();
      bpms.forEach((score, bpm) => {
        let totalScore = 0;
        for (let offset = -3; offset <= 3; offset++) {
          totalScore +=
            (bpms.get(bpm + offset) || 0) * (1 - Math.abs(offset) * 0.08);
        }
        clusters.set(bpm, totalScore);
      });

      let maxScore = 0;
      let detectedBPM = 0;
      clusters.forEach((score, bpm) => {
        if (score > maxScore) {
          maxScore = score;
          detectedBPM = bpm;
        }
      });

      // console.log(
      //   "Top 5:",
      //   Array.from(clusters.entries())
      //     .sort((a, b) => b[1] - a[1])
      //     .slice(0, 5),
      // );

      return detectedBPM;
    }

    const update = (
      time: number,
      analyser: AnalyserNode,
      buffer: Uint8Array<ArrayBuffer>,
    ) => {
      analyser.getByteFrequencyData(buffer);

      const sampleRate = 44100;
      const fftSize = analyser.fftSize;

      const lowAver = getAver(buffer, [20, 100], sampleRate, fftSize);
      const midAver = getAver(buffer, [100, 300], sampleRate, fftSize);
      const highAver = getAver(buffer, [2000, 5000], sampleRate, fftSize);

      const lowFlux = Math.abs(lowAver - prevLow);
      const midFlux = Math.abs(midAver - prevMid);
      const highFlux = Math.abs(highAver - prevHigh);

      prevLow = lowAver;
      prevMid = midAver;
      prevHigh = highAver;

      const maxFlux = Math.max(lowFlux, midFlux, highFlux);
      fluxHistory.push(maxFlux);
      if (fluxHistory.length > 120) fluxHistory.shift();

      if (fluxHistory.length > 60) {
        let sum = 0;
        for (let i = 0; i < fluxHistory.length; i++) {
          sum += fluxHistory[i];
        }
        const avgFlux = sum / fluxHistory.length;
        const threshold = avgFlux * 1.8;

        if (maxFlux > threshold && time - lastOnsetTime > 0.15) {
          const bin = Math.floor((maxFlux / 255) * 100);

          if (bin > 0) {
            onsets.push({
              timestamp: time,
              fluxValue: maxFlux / 255,
              bin,
            });
            lastOnsetTime = time;

            if (onsets.length > 128) onsets.shift();
          }
        }
      }

      if (frameCounter % 60 === 0 && onsets.length >= 8) {
        bpm = calcBPM(onsets);
      }

      frameCounter++;
      return bpm;
    };
    return { update };
  }

  function RmsDetector() {
    let prevRms = 0;

    function getRms(buffer: Float32Array<ArrayBuffer>) {
      let sum = 0.0;
      const window = buffer.length;
      for (let i = 0; i < window; i++) {
        sum += Math.pow(buffer[i], 2);
      }
      sum /= window;
      return Math.sqrt(sum);
    }
    function getSmoothRms(buffer: Float32Array<ArrayBuffer>, gain: number) {
      const rms = (getRms(buffer) / gain) * 1;
      const smoothRms = rms * 0.05 + prevRms * 0.95;
      prevRms = smoothRms;
      return Number(smoothRms.toFixed(2));
    }
    return { getSmoothRms };
  }
  function getZcr(buffer: Float32Array<ArrayBuffer>) {
    let counter = 0;
    const window = buffer.length;
    for (let i = 0; i < window - 1; i++) {
      if (Math.abs(buffer[i]) < 0.01) continue;
      const p0 = Math.sign(buffer[i]);
      const p1 = Math.sign(buffer[i + 1]);
      if (p0 !== p1) counter++;
    }
    return counter / window;
  }
  function getbpmKick(bpm: number, time: number) {
    const bpmTime = ((bpm / 60) * time) % 1;

    const kick = Math.exp(-bpmTime * 5);
    return kick;
  }

  return { createBpm, RmsDetector, getZcr, getbpmKick };
};

export const audioAnalyerEvent = () => {
  let analyerRef: OriginAudioRefProps;
  const eventKun = AudioEventKun();
  const bpmDetector = eventKun.createBpm();
  const rmsDetector = eventKun.RmsDetector();
  let bpm = 0;
  const scene = new THREE.Scene();
  const fftSpectrum = fftScene(scene);

  playAudioAnalyer().then((result) => {
    analyerRef = result;
    fftSpectrum.init(analyerRef);
  });

  const update = (time: number) => {
    if (!bpmDetector || !analyerRef) return;
    const detectedBpm = bpmDetector.update(
      time,
      analyerRef.analyser,
      analyerRef.fftBuffer,
    );
    // console.log(bpm);
    if (bpm !== detectedBpm) {
      bpm = detectedBpm;
      useAudioEventStore.getState().updateBpm(detectedBpm);
    }
    //
    analyerRef.analyser.getFloatTimeDomainData(analyerRef.domainBuffer);
    analyerRef.analyser.getByteFrequencyData(analyerRef.fftBuffer);
    const smoothRms = rmsDetector.getSmoothRms(
      analyerRef.domainBuffer,
      analyerRef.gain,
    );
    const bpmKick = eventKun.getbpmKick(bpm, time);
    useAudioEventStore.getState().updateBpmKick(bpmKick);
    useAudioEventStore.getState().updateRms(smoothRms);
    fftSpectrum.update(analyerRef.fftBuffer);
  };

  return {
    // init,
    update,
    scene,
  };
};
