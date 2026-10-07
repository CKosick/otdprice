// Generates Chrome Web Store promotional assets & screenshots (1280x800, 440x280)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, pixelFn) {
  const signature = Buffer.from([138, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(6, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
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

const outDir = __dirname;

// 1. Screenshot 1: Cars.com listing view with OTD price overlay (1280x800)
console.log('Generating Screenshot 1 (Cars.com overlay)...');
const s1 = createPng(1280, 800, (x, y) => {
  // Browser chrome / header at top (0..70)
  if (y < 70) {
    if (y < 35) return [24, 24, 27, 255]; // Tab bar
    return [39, 39, 42, 255]; // Address bar
  }

  // Cars.com nav header (70..130)
  if (y >= 70 && y < 130) {
    return [17, 24, 39, 255];
  }

  // Card 1 container (x: 120..1160, y: 170..450)
  const inCard1 = (x >= 120 && x <= 1160 && y >= 170 && y <= 450);
  // Card 2 container (x: 120..1160, y: 480..760)
  const inCard2 = (x >= 120 && x <= 1160 && y >= 480 && y <= 760);

  if (inCard1 || inCard2) {
    // Card border
    const cy = inCard1 ? y - 170 : y - 480;
    const cx = x - 120;
    if (cx <= 2 || cx >= 1038 || cy <= 2 || cy >= 278) {
      return [51, 65, 85, 255];
    }

    // Car image thumbnail (left: cx 15..320, cy 15..265)
    if (cx >= 15 && cx <= 320 && cy >= 15 && cy <= 265) {
      return [30, 41, 59, 255]; // Slate thumbnail
    }

    // OTD Badge area on Card 1 (cx: 350..620, cy: 90..135)
    if (inCard1 && cx >= 350 && cx <= 620 && cy >= 90 && cy <= 135) {
      return [16, 185, 129, 255]; // Emerald OTD Badge
    }

    // Popover on Card 1 (cx: 650..980, cy: 60..260)
    if (inCard1 && cx >= 650 && cx <= 980 && cy >= 60 && cy <= 260) {
      return [15, 23, 42, 255]; // Dark slate popover
    }

    return [255, 255, 255, 255]; // White card body
  }

  // Page background
  return [241, 245, 249, 255]; // Slate 100
});
fs.writeFileSync(path.join(outDir, 'screenshot-1-cars.png'), s1);

// 2. Screenshot 2: Autotrader with OTD breakdown (1280x800)
console.log('Generating Screenshot 2 (Autotrader)...');
const s2 = createPng(1280, 800, (x, y) => {
  if (y < 70) return [30, 41, 59, 255];
  if (y >= 70 && y < 140) return [239, 68, 68, 255]; // Autotrader header accent

  const inCard = (x >= 150 && x <= 1130 && y >= 180 && y <= 500);
  if (inCard) {
    const cx = x - 150;
    const cy = y - 180;
    if (cx <= 2 || cx >= 978 || cy <= 2 || cy >= 318) return [71, 85, 105, 255];
    if (cx >= 20 && cx <= 340 && cy >= 20 && cy <= 300) return [51, 65, 85, 255];
    // OTD Badge
    if (cx >= 380 && cx <= 660 && cy >= 100 && cy <= 145) return [16, 185, 129, 255];
    // Breakdown Tooltip
    if (cx >= 380 && cx <= 780 && cy >= 155 && cy <= 305) return [15, 23, 42, 255];
    return [255, 255, 255, 255];
  }

  return [248, 250, 252, 255];
});
fs.writeFileSync(path.join(outDir, 'screenshot-2-autotrader.png'), s2);

// 3. Screenshot 3: CarGurus & Extension Popup (1280x800)
console.log('Generating Screenshot 3 (CarGurus & Popup)...');
const s3 = createPng(1280, 800, (x, y) => {
  if (y < 70) return [15, 23, 42, 255];

  // Extension Popup opened at top-right (x: 880..1220, y: 80..620)
  const inPopup = (x >= 880 && x <= 1220 && y >= 80 && y <= 620);
  if (inPopup) {
    const px = x - 880;
    const py = y - 80;
    if (px <= 2 || px >= 338 || py <= 2 || py >= 538) return [56, 189, 248, 255]; // Sky blue border
    if (py < 60) return [30, 41, 59, 255]; // Popup header
    return [11, 17, 32, 255]; // Popup body
  }

  // CarGurus page in background
  const inListing = (x >= 80 && x <= 820 && y >= 160 && y <= 480);
  if (inListing) {
    const lx = x - 80;
    const ly = y - 160;
    if (lx <= 2 || lx >= 738 || ly <= 2 || ly >= 318) return [203, 213, 225, 255];
    if (lx >= 15 && lx <= 280 && ly >= 15 && ly <= 305) return [100, 116, 139, 255];
    if (lx >= 310 && lx <= 560 && ly >= 90 && ly <= 135) return [16, 185, 129, 255];
    return [255, 255, 255, 255];
  }

  return [241, 245, 249, 255];
});
fs.writeFileSync(path.join(outDir, 'screenshot-3-cargurus.png'), s3);

// 4. Promo Tile (440x280)
console.log('Generating Small Promo Tile (440x280)...');
const promo = createPng(440, 280, (x, y) => {
  // Radial gradient background from slate-900 to dark navy
  const cx = 220;
  const cy = 140;
  const d = Math.hypot(x - cx, y - cy) / 260;
  const r = Math.floor(15 * (1 - d) + 11 * d);
  const g = Math.floor(23 * (1 - d) + 17 * d);
  const b = Math.floor(42 * (1 - d) + 32 * d);

  // Border
  if (x <= 1 || x >= 438 || y <= 1 || y >= 278) return [52, 211, 153, 255];

  // Centered Badge / Card (x: 70..370, y: 60..220)
  if (x >= 70 && x <= 370 && y >= 60 && y <= 220) {
    const bx = x - 70;
    const by = y - 60;
    if (bx <= 1 || bx >= 298 || by <= 1 || by >= 158) return [56, 189, 248, 255];
    // Emerald pill inside promo card
    if (bx >= 40 && bx <= 260 && by >= 45 && by <= 85) return [16, 185, 129, 255];
    return [15, 23, 42, 255];
  }

  return [r, g, b, 255];
});
fs.writeFileSync(path.join(outDir, 'promo-tile-440x280.png'), promo);

// 5. Copy 128px icon as store icon
fs.copyFileSync(path.join(__dirname, '../icons/icon-128.png'), path.join(outDir, 'store-icon-128.png'));
console.log('Store assets generated successfully.');
