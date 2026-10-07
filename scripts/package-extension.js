// Pure Node script to prepare and package a clean ZIP archive for Chrome Web Store submission
const fs = require('fs');
const path = require('path');
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

runtimeItems.forEach(item => {
  const src = path.join(rootDir, item);
  const dest = path.join(stagingDir, item);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
});

console.log(`Staged ${runtimeItems.length} runtime files in ${stagingDir}`);

// 3. Compress using PowerShell Compress-Archive
try {
  const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipFile}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });
  const stat = fs.statSync(zipFile);
  console.log(`Successfully created: ${zipFile} (${(stat.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error('Failed to create ZIP package:', err);
  process.exit(1);
}
