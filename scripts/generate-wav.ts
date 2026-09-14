import { writeFileSync } from "fs";
import { join } from "path";

function generateSineWaveWav(durationSeconds: number, sampleRate: number = 16000, frequency: number = 440): Buffer {
  const numSamples = durationSeconds * sampleRate;
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const chunkSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write("WAVE", 8);

  // "fmt " subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size for PCM
  buffer.writeUInt16LE(1, 20);  // audio format 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample

  // "data" subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write samples (440Hz sine wave)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.5; // amplitude 0.5
    const intSample = Math.round(sample * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

const wavBuffer = generateSineWaveWav(2);
const outputPath = join(__dirname, "..", "test-fixtures", "valid-tone.wav");
writeFileSync(outputPath, wavBuffer);
console.log("Generated valid WAV file:", outputPath, wavBuffer.length, "bytes");
