import { AudioAnalyser } from "./analyser";

export namespace BpmDetector {
  interface Onset {
    timestamp: number;
    fluxValue: number;
    bin: number;
  }

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

  export function createBpm() {
    const onsets: Onset[] = [];
    let bpm = 0;
    let lastOnsetTime = 0;
    let frameCounter = 0;
    //動的flux
    const fluxHistory: number[] = [];
    let prevLow = 0;
    let prevMid = 0;
    let prevHigh = 0;

    let ctx: AudioContext;
    let analyser: AnalyserNode;
    let buffer: Uint8Array<ArrayBuffer>;

    // const init = () => {
    //   const result = AudioAnalyser.initSpectrum(1024);
    //   ctx = result.ctx;
    //   analyser = result.analyser;
    //   buffer = result.buffer;
    //   return result;
    // };
    const init = (externalAnalyser?: AnalyserNode) => {
      if (externalAnalyser) {
        analyser = externalAnalyser;
        ctx = externalAnalyser.context as AudioContext;
        buffer = new Uint8Array(externalAnalyser.fftSize);
        return;
      }
      const result = AudioAnalyser.initSpectrum(1024);
      ctx = result.ctx;
      analyser = result.analyser;
      buffer = result.buffer;
    };

    const update = (time: number) => {
      AudioAnalyser.getSpectrumData(analyser, buffer);

      const sampleRate = ctx.sampleRate;
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
    return { init, update };
  }
}
