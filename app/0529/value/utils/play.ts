import { AudioRefProps } from "./interface";

export async function playAudio(
  sampleRate: number,
  fftSize: [number, number],
): Promise<AudioRefProps> {
  const audioCtx = new AudioContext({ sampleRate }); //[3000, 768000]
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
