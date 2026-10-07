// Cross-platform packaging script for Chrome Web Store distribution
// Compatible across Windows, macOS, and Linux with zero external dependencies.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
const version = manifest.version;
const distDir = path.join(rootDir, 'dist');
const stagingDir = path.join(distDir, `otdprice-v${version}`);
const zipFile = path.join(distDir, `otdprice-v${version}.zip`);

console.log(`Packaging OTD Price v${version} for Chrome Web Store...`);

// 1. Clean staging & output
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
if (fs.existsSync(zipFile)) {
  fs.rmSync(zipFile, { force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// 2. Files & directories required for runtime execution
const runtimeItems = [
  'manifest.json',
  'data/state-tax-rates.json',
  'data/tax-data.js',
  'content/calculator.js',
  'content/content.css',
  'content/content.js',
  'content/parsers/cars-parser.js',
  'content/parsers/autotrader-parser.js',
  'content/parsers/cargurus-parser.js',
  'popup/popup.html',
  'popup/popup.css',
  'popup/popup.js',
  'icons/icon-16.png',
  'icons/icon-48.png',
  'icons/icon-128.png'
];

const filesToZip = [];

runtimeItems.forEach(item => {
  const src = path.join(rootDir, item);
  const dest = path.join(stagingDir, item);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  filesToZip.push({
    name: item.replace(/\\/g, '/'),
    content: fs.readFileSync(src)
  });
});

console.log(`Staged ${runtimeItems.length} runtime files in ${stagingDir}`);

// 3. Cross-platform ZIP generation (Pure-JS with system fallbacks)
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

function createPureNodeZip(files, outputPath) {
  const localHeaders = [];
  const cdEntries = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name, 'utf8');
    const uncompressedData = file.content;
    const compressedData = zlib.deflateRawSync(uncompressedData);
    const useCompressed = compressedData.length < uncompressedData.length;
    const finalData = useCompressed ? compressedData : uncompressedData;
    const method = useCompressed ? 8 : 0;
    const fileCrc = crc32(uncompressedData);

    // Local file header (30 bytes + name)
    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);         // Version needed: 2.0
    localHeader.writeUInt16LE(0, 6);          // General flag
    localHeader.writeUInt16LE(method, 8);     // Method: 8 (deflate) or 0 (store)
    localHeader.writeUInt16LE(0, 10);        // Time
    localHeader.writeUInt16LE(0, 12);        // Date
    localHeader.writeUInt32LE(fileCrc, 14);   // CRC32
    localHeader.writeUInt32LE(finalData.length, 18); // Compressed size
    localHeader.writeUInt32LE(uncompressedData.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(filenameBuf.length, 26); // Name length
    localHeader.writeUInt16LE(0, 28);        // Extra field length
    filenameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, finalData);

    // Central directory entry (46 bytes + name)
    const centralHeader = Buffer.alloc(46 + filenameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4);         // Version made by
    centralHeader.writeUInt16LE(20, 6);         // Version needed
    centralHeader.writeUInt16LE(0, 8);          // General flag
    centralHeader.writeUInt16LE(method, 10);    // Compression method
    centralHeader.writeUInt16LE(0, 12);        // Time
    centralHeader.writeUInt16LE(0, 14);        // Date
    centralHeader.writeUInt32LE(fileCrc, 16);   // CRC32
    centralHeader.writeUInt32LE(finalData.length, 20); // Compressed size
    centralHeader.writeUInt32LE(uncompressedData.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(filenameBuf.length, 28); // Name length
    centralHeader.writeUInt16LE(0, 30);        // Extra length
    centralHeader.writeUInt16LE(0, 32);        // Comment length
    centralHeader.writeUInt16LE(0, 34);        // Disk start
    centralHeader.writeUInt16LE(0, 36);        // Internal attr
    centralHeader.writeUInt32LE(0, 38);        // External attr
    centralHeader.writeUInt32LE(offset, 42);   // Local header offset
    filenameBuf.copy(centralHeader, 46);

    cdEntries.push(centralHeader);

    offset += localHeader.length + finalData.length;
  }

  const cdBuffer = Buffer.concat(cdEntries);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  const zipBuffer = Buffer.concat([...localHeaders, cdBuffer, eocd]);
  fs.writeFileSync(outputPath, zipBuffer);
  return zipBuffer;
}

let packagingSuccess = false;

// Attempt 1: Pure Node.js (Zero-dependency, cross-platform on Windows, macOS, Linux)
try {
  createPureNodeZip(filesToZip, zipFile);
  const stat = fs.statSync(zipFile);
  console.log(`[Pure-JS Packager] Successfully created: ${zipFile} (${(stat.size / 1024).toFixed(1)} KB)`);
  packagingSuccess = true;
} catch (pureErr) {
  console.warn('[Pure-JS Packager] Warning, falling back to system archiver:', pureErr.message);
}

// Attempt 2: System archiver fallback if Pure-JS fails
if (!packagingSuccess) {
  try {
    if (process.platform === 'win32') {
      const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipFile}' -Force"`;
      execSync(psCommand, { stdio: 'inherit' });
    } else {
      // macOS / Linux standard 'zip' CLI
      execSync(`cd "${stagingDir}" && zip -r "${zipFile}" .`, { stdio: 'inherit' });
    }
    const stat = fs.statSync(zipFile);
    console.log(`[System Packager] Successfully created: ${zipFile} (${(stat.size / 1024).toFixed(1)} KB)`);
    packagingSuccess = true;
  } catch (sysErr) {
    console.error('All packaging mechanisms failed:', sysErr);
    process.exit(1);
  }
}
