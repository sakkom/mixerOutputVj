import { AudioRefProps } from "./interface";

export function pmAverEffect(
  fBuffer: Float32Array<ArrayBuffer>,
  pmAverWindow: number,
) {
  const size = fBuffer.length;
  const temp = new Float32Array(size);
  const window = pmAverWindow;

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

export function smoothEffect(
  writeBuffers: Float32Array<ArrayBuffer>[],
  srcBuffers: Float32Array<ArrayBuffer>[],
  ch: 0 | 1,
  timing: "before" | "after",
  smooths: [number, number],
) {
  const index = timing === "before" ? 0 : 1;
  const smooth = smooths[index];
  for (let i = 0; i < writeBuffers[ch].length; i++) {
    writeBuffers[ch][i] =
      writeBuffers[ch][i] * smooth + srcBuffers[ch][i] * (1 - smooth);
  }
}

export function updateMonoBuffer(
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

export function ampEffect(audioRef: AudioRefProps, amp: number, ch: 0 | 1) {
  for (let i = 0; i < audioRef.buffer[ch].length; i++) {
    audioRef.buffer[ch][i] = audioRef.buffer[ch][i] * amp;
  }
}
