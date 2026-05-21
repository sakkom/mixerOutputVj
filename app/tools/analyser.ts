export namespace AudioAnalyser {
  export function init(fftSize: number) {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = fftSize;
    const buffer = new Float32Array(analyser.fftSize);
    return { ctx, analyser, buffer };
  }

  export function initSpectrum(binCount: number) {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = binCount * 2.0;
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    return { ctx, analyser, buffer };
  }

  export function play(
    ctx: AudioContext,
    analyser: AnalyserNode,
    audio: HTMLAudioElement | MediaStream | OscillatorNode | null,
    currTime?: number,
  ) {
    if (!audio) return;

    ctx.resume();
    let source:
      | MediaElementAudioSourceNode
      | MediaStreamAudioSourceNode
      | OscillatorNode;
    if (audio instanceof HTMLAudioElement) {
      audio.currentTime = currTime || 0;
      source = ctx.createMediaElementSource(audio);
      audio.play();
    } else if (audio instanceof OscillatorNode) {
      source = audio;
      audio.start();
    } else {
      source = ctx.createMediaStreamSource(audio);
    }
    source.connect(analyser);
    analyser.connect(ctx.destination);
  }

  export function getData(
    analyser: AnalyserNode,
    buffer: Float32Array<ArrayBuffer>,
  ) {
    return analyser.getFloatTimeDomainData(buffer);
  }

  export function getSpectrumData(
    analyser: AnalyserNode,
    buffer: Uint8Array<ArrayBuffer>,
  ) {
    return analyser.getByteFrequencyData(buffer);
  }

  export function getRms(fftSize: number, buffer: Float32Array<ArrayBuffer>) {
    let sum = 0.0;
    for (let i = 0; i < fftSize; i++) {
      sum += Math.pow(buffer[i], 2);
    }
    sum /= fftSize;
    return Math.sqrt(sum);
  }

  export function getRmsTime(rms: number, threshold: number, step: number) {
    if (rms > threshold) {
      return rms * step;
    } else {
      return 0;
    }
  }

  export function getZcr(fftSize: number, buffer: Float32Array<ArrayBuffer>) {
    let counter = 0;
    for (let i = 0; i < fftSize - 1; i++) {
      const one = Math.sign(buffer[i]);
      const two = Math.sign(buffer[i + 1]);
      if ((one == 1.0 && two == -1.0) || (one == -1.0 && two == 1.0)) {
        counter++;
      }
    }
    return counter / fftSize;
  }
}

//
export function createSpectrumAnalyser(
  canvas: HTMLCanvasElement,
  freqData: Uint8Array,
  rangeHz: [number, number],
  aver: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width,
    h = canvas.height;
  canvas.width = w;
  canvas.height = h;

  ctx.strokeStyle = "white";
  ctx.strokeRect(0, 0, w, h);

  const bin = 44100 / 2048;
  const start = Math.floor(rangeHz[0] / bin);
  const end = Math.ceil(rangeHz[1] / bin);

  const binNum = end - start;
  const barWidth = w / binNum;
  // console.log(barWidth);

  for (let i = start; i < end; i++) {
    const y = freqData[i];
    ctx.fillStyle = `hsl(${(i * 10) % 360}, 50%, 50%)`;
    ctx.fillRect(barWidth * (i - start), h - 10, barWidth, -y);
    // if (i % 10 == 0) {
    //   ctx.fillStyle = "gray";
    //   ctx.fillRect(barWidth * i + 10, h - 10, barWidth, -h + 20);
    // }
  }

  ctx.fillStyle = "red";
  ctx.fillRect(0, h - aver, w, 1);

  ctx.fillStyle = "green";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(0, h - i * 50 - 10, 10, 1);
  }

  // ctx.fillStyle = "green";
  // for (let i = 0; i < 5; i++) {
  //   ctx.fillRect((i * w) / bin, h, 1, -10);
  // }
}
