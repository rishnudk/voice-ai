/**
 * Generates minimal valid audio test fixtures (silent/near-silent).
 *
 * Run with:  npx tsx scripts/generate-fixtures.ts
 *
 * Creates the smallest valid files possible for each format so that
 * validation tests can check format acceptance without needing real audio.
 */

import { writeFileSync } from "fs";
import { join } from "path";

const dir = join(__dirname, "..", "test-fixtures");

// ── MP3: Minimal valid MPEG frame ────────────────────────────────────
// A single silent MPEG-1 Layer 3 frame (128kbps, 44100Hz, mono)
const mp3Header = Buffer.from([
  0xff, 0xfb, 0x90, 0x00, // MPEG1, Layer3, 128kbps, 44100Hz, mono
  // Pad with zeros to fill a frame (417 bytes for this config)
  ...new Array(413).fill(0x00),
]);
writeFileSync(join(dir, "sample.mp3"), mp3Header);
console.log("✅ sample.mp3");

// ── WAV: Minimal 44-byte header + 1 sample ──────────────────────────
function createWav(): Buffer {
  const numChannels = 1;
  const sampleRate = 44100;
  const bitsPerSample = 16;
  const dataSize = 2; // 1 sample × 2 bytes
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const fileSize = 36 + dataSize;

  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(fileSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  // sample data is already 0 (silence)
  return buf;
}
writeFileSync(join(dir, "sample.wav"), createWav());
console.log("✅ sample.wav");

// ── OGG: Minimal OGG page with Vorbis identification header ─────────
function createOgg(): Buffer {
  // Minimal OGG capture pattern + page header
  const buf = Buffer.alloc(58);
  buf.write("OggS", 0); // capture pattern
  buf[4] = 0; // version
  buf[5] = 0x02; // header type: beginning of stream
  // granule position (8 bytes) = 0
  buf.writeUInt32LE(1, 14); // serial number
  buf.writeUInt32LE(0, 18); // page sequence
  buf.writeUInt32LE(0, 22); // checksum (not validated for our test)
  buf[26] = 1; // number of segments
  buf[27] = 30; // segment size
  // Vorbis identification header
  buf[28] = 0x01; // packet type: identification
  buf.write("vorbis", 29); // codec id
  buf.writeUInt32LE(0, 35); // version
  buf[39] = 1; // channels
  buf.writeUInt32LE(44100, 40); // sample rate
  return buf;
}
writeFileSync(join(dir, "sample.ogg"), createOgg());
console.log("✅ sample.ogg");

// ── FLAC: Minimal FLAC file with STREAMINFO block ───────────────────
function createFlac(): Buffer {
  const buf = Buffer.alloc(46);
  buf.write("fLaC", 0); // magic
  // STREAMINFO block header: last-block=1, type=0, length=34
  buf[4] = 0x80; // last metadata block flag + type 0
  buf[5] = 0x00;
  buf[6] = 0x00;
  buf[7] = 0x22; // length = 34
  // STREAMINFO data (34 bytes)
  buf.writeUInt16BE(4096, 8); // min block size
  buf.writeUInt16BE(4096, 10); // max block size
  // min/max frame size (3 bytes each) = 0
  // sample rate (20 bits) + channels (3 bits) + bps (5 bits) + total samples (36 bits)
  // 44100Hz = 0xAC44, 1 channel (0), 16 bps (15 in field = 0x0F)
  buf[18] = 0xAC;
  buf[19] = 0x44;
  buf[20] = 0x10; // channels=0 (mono), top bit of bps
  buf[21] = 0xF0; // remaining bps bits + top bits of total samples
  return buf;
}
writeFileSync(join(dir, "sample.flac"), createFlac());
console.log("✅ sample.flac");

// ── WEBM: Minimal EBML + Segment header ─────────────────────────────
function createWebm(): Buffer {
  // EBML header for WebM
  const ebml = Buffer.from([
    0x1a, 0x45, 0xdf, 0xa3, // EBML element ID
    0x93, // size = 19
    0x42, 0x86, 0x81, 0x01, // EBMLVersion: 1
    0x42, 0xf7, 0x81, 0x01, // EBMLReadVersion: 1
    0x42, 0xf2, 0x81, 0x04, // EBMLMaxIDLength: 4
    0x42, 0xf3, 0x81, 0x08, // EBMLMaxSizeLength: 8
    0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, // DocType: "webm"
    0x42, 0x87, 0x81, 0x04, // DocTypeVersion: 4
    0x42, 0x85, 0x81, 0x02, // DocTypeReadVersion: 2
  ]);
  return ebml;
}
writeFileSync(join(dir, "sample.webm"), createWebm());
console.log("✅ sample.webm");

// ── M4A: Minimal ftyp box ───────────────────────────────────────────
function createM4a(): Buffer {
  // ftyp box: size(4) + "ftyp"(4) + brand(4) + version(4)
  const buf = Buffer.alloc(20);
  buf.writeUInt32BE(20, 0); // box size
  buf.write("ftyp", 4); // box type
  buf.write("M4A ", 8); // major brand
  buf.writeUInt32BE(0, 12); // minor version
  buf.write("M4A ", 16); // compatible brand
  return buf;
}
writeFileSync(join(dir, "sample.m4a"), createM4a());
console.log("✅ sample.m4a");

// ── AAC: Minimal ADTS frame header ──────────────────────────────────
function createAac(): Buffer {
  // ADTS fixed header (7 bytes) for a silent AAC-LC frame
  const buf = Buffer.alloc(7 + 2); // header + minimal raw data
  buf[0] = 0xff; // syncword high
  buf[1] = 0xf1; // syncword low + ID=0(MPEG4) + layer=0 + protection absent
  buf[2] = 0x50; // profile=LC(01), sampling_freq=44100(0100), private=0
  buf[3] = 0x80; // channel_config=010, orig=0, home=0, copyright bits
  // frame length = 9 (7 header + 2 data)
  const frameLen = 9;
  buf[3] |= (frameLen >> 11) & 0x03;
  buf[4] = (frameLen >> 3) & 0xff;
  buf[5] = ((frameLen & 0x07) << 5) | 0x1f;
  buf[6] = 0xfc; // buffer fullness + number of raw data blocks
  return buf;
}
writeFileSync(join(dir, "sample.aac"), createAac());
console.log("✅ sample.aac");

console.log("\n🎉  All test fixtures generated in test-fixtures/");
