// Generates icons/icon16.png, icons/icon48.png, icons/icon128.png
// Run once: node create-icons.js
'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

function crc32(buf) {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = t[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const len    = Buffer.allocUnsafe(4);
  const crcBuf = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const s = size / 16;

  // Background: dark slate #1c1c28
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4 + 0] = 28;
    pixels[i * 4 + 1] = 28;
    pixels[i * 4 + 2] = 40;
    pixels[i * 4 + 3] = 255;
  }

  function fillRect(x, y, w, h, r, g, b) {
    const x0 = Math.round(x * s), y0 = Math.round(y * s);
    const x1 = Math.round((x + w) * s), y1 = Math.round((y + h) * s);
    for (let py = y0; py < Math.min(y1, size); py++) {
      for (let px = x0; px < Math.min(x1, size); px++) {
        const i = (py * size + px) * 4;
        pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255;
      }
    }
  }

  // Filter funnel: three white horizontal bars of decreasing width
  fillRect(2,  3,  12, 2, 255, 255, 255);  // top    — full width
  fillRect(4,  7,   8, 2, 255, 255, 255);  // middle — medium
  fillRect(6, 11,   4, 2, 255, 255, 255);  // bottom — narrow

  // Build PNG scanlines (filter byte 0 = None, then RGBA row data)
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync('icons', { recursive: true });
for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join('icons', `icon${size}.png`), drawIcon(size));
  console.log(`created icons/icon${size}.png`);
}
