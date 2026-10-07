// Generates compliant PNG icons (16x16, 48x48, 128x128) without external dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, pixelFn) {
  const signature = Buffer.from([138, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Icon renderer: A modern rounded dark tile with emerald gradient & clean OTD tag
function renderIconPixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.22; // corner radius
  const pad = Math.max(1, Math.floor(size * 0.06));

  // Rounded rectangle bounds check
  const innerW = size - 2 * pad;
  const innerH = size - 2 * pad;
  const dx = Math.max(Math.abs(x - cx) - (innerW / 2 - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (innerH / 2 - r), 0);
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > r) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Border highlight
  const isBorder = dist > r - 1.2 || 
                   (Math.abs(x - cx) >= innerW / 2 - 1.2 && dist <= r) ||
                   (Math.abs(y - cy) >= innerH / 2 - 1.2 && dist <= r);

  if (isBorder) {
    return [52, 211, 153, 255]; // Emerald 400
  }

  // Car silhouette / badge features
  const nx = x / size;
  const ny = y / size;

  // Car roof & body shape
  // Wheels: circles at bottom
  const leftWheel = Math.hypot(nx - 0.35, ny - 0.72);
  const rightWheel = Math.hypot(nx - 0.65, ny - 0.72);
  const wheelRadius = 0.08;

  if (leftWheel <= wheelRadius || rightWheel <= wheelRadius) {
    if (leftWheel <= wheelRadius * 0.4 || rightWheel <= wheelRadius * 0.4) {
      return [15, 23, 42, 255]; // Wheel hub
    }
    return [56, 189, 248, 255]; // Light blue wheel
  }

  // Car body
  const inCarBody = (ny >= 0.52 && ny <= 0.68 && nx >= 0.22 && nx <= 0.78);
  // Car cabin
  const inCarCabin = (ny >= 0.36 && ny <= 0.52 && nx >= 0.34 && nx <= 0.66);

  if (inCarBody || inCarCabin) {
    // Top highlight or windshield
    if (inCarCabin && ny <= 0.48 && nx >= 0.38 && nx <= 0.62) {
      return [56, 189, 248, 255]; // Sky blue window
    }
    return [52, 211, 153, 255]; // Emerald car body
  }

  // Price tag dollar sign indicator in upper area
  if (ny >= 0.16 && ny <= 0.30 && nx >= 0.46 && nx <= 0.54) {
    return [52, 211, 153, 255];
  }

  // Dark slate background
  return [15, 23, 42, 255];
}

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname);

sizes.forEach(size => {
  const buf = createPng(size, size, (x, y) => renderIconPixel(x, y, size));
  const filename = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filename, buf);
  console.log(`Generated ${filename} (${size}x${size}, ${buf.length} bytes)`);
});
