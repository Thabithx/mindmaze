const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function writeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function createPng(width, height, getPixel) {
  // Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = writeChunk('IHDR', ihdr);

  // Raw image data with 0 filter byte before each row
  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(rowLen * height);

  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const offset = y * rowLen + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(raw);
  const idatChunk = writeChunk('IDAT', deflated);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function colorGen(x, y, w, h) {
  // Center coordinates normalized -1 to 1
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background deep dark navy (#0F1023 -> #1A1B3D)
  let r = 15 + Math.floor((1 - ny) * 12);
  let g = 16 + Math.floor((1 - ny) * 14);
  let b = 35 + Math.floor((1 - ny) * 28);
  let a = 255;

  // Draw decorative outer rounded border / ring
  if (Math.abs(dist - 0.72) < 0.05) {
    // Purple glow (#6B4EFF)
    return [107, 78, 255, 255];
  }
  if (Math.abs(dist - 0.5) < 0.04 && (nx > -0.4 || ny < 0.2)) {
    // Cyan maze arc (#00F5FF)
    return [0, 245, 255, 255];
  }
  if (Math.abs(dist - 0.3) < 0.035 && ny > -0.2) {
    // Inner purple track
    return [139, 92, 246, 255];
  }

  // Center scholar dot / icon
  if (dist < 0.12) {
    return [0, 245, 255, 255];
  }

  return [Math.min(255, r), Math.min(255, g), Math.min(255, b), a];
}

// NOTE: PWA icons are now derived from the real brand art in /public
// (full_512.png -> icon-512.png, 192.png -> icon-192.png, plus a padded
// icon-maskable-512.png). This legacy placeholder generator is disabled so it
// can never overwrite the real logo icons. Delete this file if unused.
console.log('Skipped: PWA icons now come from full_512.png / 192.png brand art.');
process.exit(0);
