# OTD Price — Chrome Extension (Manifest V3)

> Overlays true out-the-door car pricing on **cars.com**, **Autotrader**, and **CarGurus**: asking price + state sales tax + typical dealer doc & title/registration fees.

---

## Standing Principles & Architecture

1. **Manifest V3 Only**: Built strictly to the modern Chrome Extension Manifest V3 standard.
2. **100% Client-Side Math**: All automotive tax and fee calculations run locally in the browser using the static dataset bundled at `data/state-tax-rates.json`.
3. **Zero Outbound Requests**: No telemetry, no tracking SDKs, no external APIs. All data stays strictly on the user's machine.
4. **Modular Site Parsers**: Isolated per-site DOM parsers with explicit version flags (`2026.1`) for cars.com, Autotrader, and CarGurus.
5. **Real-time Reactivity**: Changing the buyer's home state in the popup immediately updates calculations on all active listing cards in real time via `chrome.storage.local`.

---

## Project Structure

```
OTDPrice/
├── manifest.json                  # Manifest V3 extension definition
├── CHROMEWEBSTORE.md              # Chrome Web Store submission metadata & justifications
├── PRIVACY.md                     # Plain-language privacy policy
├── privacy.html                   # Hostable HTML privacy policy page
├── README.md                      # Architecture, installation & developer guide
├── data/
│   ├── state-tax-rates.json       # Swappable 50-state + DC baseline tax & fees dataset
│   ├── tax-data.js                # Self-contained bundled tax dataset module
│   └── README.md                  # Dataset update & schema documentation
├── content/
│   ├── calculator.js              # Calculation engine & state/price parser
│   ├── content.css                # Polished styling for OTD badge & popover breakdown
│   ├── content.js                 # Content script controller & DOM observer
│   └── parsers/
│       ├── cars-parser.js         # Cars.com parser (v2026.1)
│       ├── autotrader-parser.js   # Autotrader parser (v2026.1)
│       └── cargurus-parser.js     # CarGurus parser (v2026.1)
├── popup/
│   ├── popup.html                 # Clean settings popup UI
│   ├── popup.css                  # Modern dark theme styles & toggle switches
│   └── popup.js                   # Settings controller & state override handler
├── icons/
│   ├── icon-16.png                # 16×16px extension icon
│   ├── icon-48.png                # 48×48px extension icon
│   ├── icon-128.png               # 128×128px extension icon
│   └── generate-icons.js          # Pure Node script for generating PNG icons
└── store-assets/
    ├── store-icon-128.png         # 128×128 store listing icon
    ├── screenshot-1-cars.png      # 1280×800 CWS screenshot (cars.com)
    ├── screenshot-2-autotrader.png# 1280×800 CWS screenshot (Autotrader)
    ├── screenshot-3-cargurus.png  # 1280×800 CWS screenshot (CarGurus)
    ├── promo-tile-440x280.png     # 440×280 CWS promotional tile
    └── generate-store-assets.js   # Pure Node script for store assets
```

---

## Local Installation & Testing

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the upper-right corner.
3. Click **Load unpacked**.
4. Select this directory: `c:\Users\Cliff\Documents\chrome_ext\OTDPrice`.
5. The **OTD Price** extension icon will appear in your Chrome toolbar.

---

## Verifying Acceptance Criteria

- [x] **Overlay on cars.com**: Injects an "OTD Est." pill next to the asking price on search cards and detail pages with full breakdown popover.
- [x] **Overlay on Autotrader & CarGurus**: Detects asking price and dealer location with fallback heuristics.
- [x] **State Override**: Selecting a buyer state in the popup recalculates all listing cards in-place immediately.
- [x] **Per-site Toggle**: Disabling a marketplace in the popup immediately removes all overlays from that site.
- [x] **Zero Outbound Requests**: Open Chrome DevTools > Network tab on any listing page. Filter by `Fetch/XHR`. No network calls are made by the extension.
- [x] **Zero Console Errors**: Content scripts and popup run clean with guarded error handlers.

---

## Swapping the CarTaxHub Dataset

To update annual state tax rates or fee caps:
1. Replace `data/state-tax-rates.json` with the new JSON export from CarTaxHub.
2. Keep `data/tax-data.js` synchronized with the same data.
3. Reload the extension in `chrome://extensions/`.
