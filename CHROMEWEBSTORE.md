# Chrome Web Store Listing — OTD Price

> Last Updated: 2026-10-06

## Store Listing

**Extension Name** [REQUIRED]  
OTD Price

**Short Description** [REQUIRED]  
See true out-the-door car prices on cars.com, Autotrader, and CarGurus: sticker price + sales tax + dealer doc & title fees.

**Detailed Description** [REQUIRED]  
Never get blindsided at the dealership finance desk again.

Car buyers comparison-shop on sticker prices, only to discover thousands in surprise state sales taxes, dealer documentation fees, and registration costs when it's time to sign. OTD Price solves this by calculating and overlaying the true estimated Out-The-Door (OTD) price directly on listing and vehicle detail pages across cars.com, Autotrader, and CarGurus.

Key Features:
- Instant Out-The-Door Overlays: See the realistic total right next to the asking price as you browse car listings.
- Complete Cost Breakdown: Click or hover any OTD badge to inspect the itemized math: asking price, state automotive sales tax, dealer doc fee, and title/registration estimates.
- Buyer State Override: Buying out of state? Use the quick popup selector to calculate taxes based on your home registration state rather than the seller's state.
- Per-Marketplace Controls: Easily toggle the overlay on or off for individual websites.
- Powered by CarTaxHub: Bakes in accurate state-by-state tax rates, statutory doc fee caps, and typical dealer fee benchmarks from CarTaxHub.
- 100% Private & Client-Side: Zero network calls, zero tracking, zero analytics, and no accounts required. All tax calculations run entirely on your device using a bundled local dataset.

How to Use:
1. Install OTD Price.
2. Browse car listings on cars.com, Autotrader, or CarGurus.
3. Look for the green "OTD Est." badge next to the listing price.
4. Click the badge for a detailed breakdown of taxes and fees.
5. Click the extension icon in your browser toolbar to set your home state override or manage site preferences.

Privacy & Trust Guarantee:
Trust is our core product. OTD Price is completely open source. We do not collect your search history, we do not require an account, and we do not make outbound network requests. All math runs locally in your browser.

Support & Data Updates:
Tax rules and fee caps are maintained and updated via CarTaxHub (cartaxhub.com). For support, feature requests, or open-source contributions, visit our GitHub repository.

**Category** [REQUIRED]  
Shopping

**Single Purpose** [REQUIRED]  
Overlays estimated out-the-door car pricing (sales tax and dealer fees) on major automotive marketplaces.

**Primary Language** [REQUIRED]  
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `store-assets/store-icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 | ✅ Ready | `store-assets/screenshot-1-cars.png` |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ✅ Ready | `store-assets/screenshot-2-autotrader.png` |
| Screenshot 3 [RECOMMENDED] | 1280×800 | ✅ Ready | `store-assets/screenshot-3-cargurus.png` |
| Small Promo Tile [RECOMMENDED] | 440×280 | ✅ Ready | `store-assets/promo-tile-440x280.png` |

### Screenshot Notes
- **Screenshot 1**: Demonstrates OTD Price badge and interactive breakdown popover on a cars.com search results listing.
- **Screenshot 2**: Shows OTD Price overlay on Autotrader vehicle listings highlighting doc fees and state taxes.
- **Screenshot 3**: Illustrates CarGurus listing integration alongside the extension popup state override controls.

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Used exclusively to persist user preferences locally on the client's device (e.g. buyer state override and marketplace enable/disable toggles). No data is transmitted externally. |
| `activeTab` | permissions | Used solely to detect if the currently active browser tab is on a supported marketplace (cars.com, autotrader.com, cargurus.com) when the user clicks the extension popup. |
| `https://*.cars.com/*` | content_scripts matches | Injects content script on cars.com to detect vehicle asking prices and display the local out-the-door price overlay. |
| `https://*.autotrader.com/*` | content_scripts matches | Injects content script on autotrader.com to detect vehicle asking prices and display the local out-the-door price overlay. |
| `https://*.cargurus.com/*` | content_scripts matches | Injects content script on cargurus.com to detect vehicle asking prices and display the local out-the-door price overlay. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | No | No | N/A | No |
| Personal communications | No | No | N/A | No |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | No | No | N/A | No |
| Website content | No | No | N/A | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED if collecting data, RECOMMENDED otherwise]  
`https://cartaxhub.com/privacy/otd-price` (or public GitHub raw / GitHub Pages link to `privacy.html`)

---

## Distribution

**Visibility**: Public  
**Regions**: All regions (focused on United States car marketplaces)  
**Pricing**: Free  

---

## Developer Info

**Publisher Name** [REQUIRED]  
CarTaxHub

**Contact Email** [REQUIRED]  
support@cartaxhub.com

**Support URL / Email** [RECOMMENDED]  
https://github.com/cartaxhub/otd-price/issues

**Homepage URL** [RECOMMENDED]  
https://cartaxhub.com

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-10-06 | Initial MVP release with cars.com, Autotrader, and CarGurus support, state tax calculator, and buyer state override. | Ready for Submission |

---

## Review Notes

### Known Issues / Limitations
- All tax and fee calculations are estimates based on state-level rates and averages; municipal and county sales taxes or dealer-specific add-ons may vary slightly at final signing.
