// Automated verification test suite for OTD Price extension
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- RUNNING OTD PRICE VERIFICATION TESTS ---');

// 1. Verify Dataset
const jsonPath = path.join(__dirname, '../data/state-tax-rates.json');
const rawJson = fs.readFileSync(jsonPath, 'utf8');
const taxJson = JSON.parse(rawJson);

assert(taxJson.states, 'Dataset must have states object');
const stateCount = Object.keys(taxJson.states).length;
console.log(`[PASS] Tax dataset valid with ${stateCount} jurisdictions.`);
assert.strictEqual(stateCount, 51, 'Must include 50 states + DC');

// 2. Load Calculator & Tax Data Module
require('../data/tax-data.js');
const { otdCalculator } = require('../content/calculator.js');

// 3. Test Calculation Logic
// Texas test
const txCalc = otdCalculator.calculate(20000, 'TX');
assert(txCalc, 'TX calculation should not be null');
assert.strictEqual(txCalc.askingPrice, 20000);
assert.strictEqual(txCalc.stateCode, 'TX');
assert.strictEqual(txCalc.taxAmount, 1250); // 20000 * 0.0625 = 1250
assert.strictEqual(txCalc.docFee, 150);
assert.strictEqual(txCalc.titleReg, 135);
assert.strictEqual(txCalc.totalOTD, 20000 + 1250 + 150 + 135); // 21535
console.log(`[PASS] Texas 20,000 calculation: ${txCalc.totalOTD} === 21535`);

// California test (statutory $85 doc fee cap)
const caCalc = otdCalculator.calculate(30000, 'CA');
assert(caCalc, 'CA calculation should not be null');
assert.strictEqual(caCalc.docFeeCapped, true);
assert.strictEqual(caCalc.docFee, 85);
assert.strictEqual(caCalc.taxAmount, Math.round(30000 * 0.0725)); // 2175
assert.strictEqual(caCalc.totalOTD, 30000 + 2175 + 85 + 320); // 32580
console.log(`[PASS] California 30,000 calculation: ${caCalc.totalOTD} === 32580`);

// Zero tax state (Alaska)
const akCalc = otdCalculator.calculate(15000, 'AK');
assert(akCalc, 'AK calculation should not be null');
assert.strictEqual(akCalc.taxAmount, 0);
assert.strictEqual(akCalc.totalOTD, 15000 + 0 + 200 + 115); // 15315
console.log(`[PASS] Alaska 15,000 calculation: ${akCalc.totalOTD} === 15315`);

// 4. Test State Extraction Regex
assert.strictEqual(otdCalculator.extractStateCode('Dallas, TX 75201'), 'TX');
assert.strictEqual(otdCalculator.extractStateCode('Los Angeles, CA'), 'CA');
assert.strictEqual(otdCalculator.extractStateCode('Miami, FL (14 mi away)'), 'FL');
assert.strictEqual(otdCalculator.extractStateCode('Seattle, Washington'), 'WA');
assert.strictEqual(otdCalculator.extractStateCode('Chicago, IL 60601'), 'IL');
console.log('[PASS] State extraction regex correctly identified all formats.');

// 5. Test Price Parsing
assert.strictEqual(otdCalculator.parsePrice('$24,500'), 24500);
assert.strictEqual(otdCalculator.parsePrice('$49,995.00'), 49995);
assert.strictEqual(otdCalculator.parsePrice('18200'), 18200);
assert.strictEqual(otdCalculator.parsePrice('MSRP $32,150*'), 32150);
console.log('[PASS] Price parsing correctly handled currencies and punctuation.');

// 6. Test Hostname matching
require('../content/parsers/cars-parser.js');
require('../content/parsers/autotrader-parser.js');
require('../content/parsers/cargurus-parser.js');

assert(globalThis.CarsParser.matches('www.cars.com'));
assert(globalThis.CarsParser.matches('cars.com'));
assert(!globalThis.CarsParser.matches('autotrader.com'));

assert(globalThis.AutotraderParser.matches('www.autotrader.com'));
assert(!globalThis.AutotraderParser.matches('cargurus.com'));

assert(globalThis.CarGurusParser.matches('www.cargurus.com'));
assert(!globalThis.CarGurusParser.matches('cars.com'));
console.log('[PASS] All site parsers matched appropriate hostnames.');

// 7. Verify All Icons & Assets Exist
const assetFiles = [
  'icons/icon-16.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
  'store-assets/store-icon-128.png',
  'store-assets/screenshot-1-cars.png',
  'store-assets/screenshot-2-autotrader.png',
  'store-assets/screenshot-3-cargurus.png',
  'store-assets/promo-tile-440x280.png',
  'manifest.json',
  'CHROMEWEBSTORE.md',
  'PRIVACY.md',
  'privacy.html'
];

assetFiles.forEach(file => {
  const full = path.join(__dirname, '..', file);
  assert(fs.existsSync(full), `Asset ${file} must exist`);
});
console.log('[PASS] All required icons, manifest, and CWS assets exist.');

console.log('\n>>> ALL 7 TEST SUITES PASSED! <<<');
