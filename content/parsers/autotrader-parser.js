// OTD Price - Autotrader DOM Parser
// Isolated parser module with version flag.
(function() {
  const AutotraderParser = {
    siteId: 'autotrader',
    name: 'Autotrader',
    version: '2026.1',

    matches(hostname) {
      return hostname.includes('autotrader.com');
    },

    isDetailPage() {
      const path = (typeof window !== 'undefined' && window.location) ? window.location.pathname : '';
      const hasVdpSelector = typeof document !== 'undefined' &&
        Boolean(document.querySelector('[data-cmp="vdpContent"], [data-qa="vdp-page"], #vdp-overview'));
      return path.includes('/vehicledetails') || path.includes('/cars-for-sale/vehicledetails') || hasVdpSelector;
    },

    parseListings(root = document) {
      const results = [];
      const calculator = globalThis.otdCalculator;

      // 1. Vehicle Detail Page (VDP)
      if (this.isDetailPage()) {
        const vdpListing = this.parseDetailPage(root, calculator);
        if (vdpListing) {
          results.push(vdpListing);
          return results;
        }
      }

      // 2. Listing Cards (Search Results / SRP)
      const cardSelectors = [
        'div[data-cmp="inventoryCard"]',
        'div[data-qa="inventory-card"]',
        '.inventory-card',
        'div[data-qa*="listing-card"]',
        'div[class*="inventory-card"]'
      ];

      const cards = root.querySelectorAll(cardSelectors.join(', '));
      const processedIds = new Set();

      cards.forEach((card, index) => {
        try {
          const id = card.getAttribute('data-listing-id') ||
                     card.getAttribute('data-cmp-id') ||
                     card.id ||
                     `autotrader-card-${index}`;

          if (processedIds.has(id)) return;
          processedIds.add(id);

          let price = null;
          let priceEl = null;
          let state = null;
          let stateSource = null;

          // Price element selectors
          const priceSelectors = [
            '[data-cmp="pricing"]',
            'span[data-cmp="itemCardPrice"]',
            '[data-qa="first-price"]',
            'span.first-price',
            '[class*="first-price"]',
            '[data-qa="price"]',
            '.first-price'
          ];

          for (const sel of priceSelectors) {
            const el = card.querySelector(sel);
            if (el) {
              const parsed = calculator.parsePrice(el.textContent);
              if (parsed) {
                price = parsed;
                priceEl = el;
                break;
              }
            }
          }

          // Fallback text price search
          if (!price || !priceEl) {
            const allElements = card.querySelectorAll('span, div, strong');
            for (const el of allElements) {
              if (el.children.length === 0 && el.textContent.includes('$')) {
                const parsed = calculator.parsePrice(el.textContent);
                if (parsed) {
                  price = parsed;
                  priceEl = el;
                  break;
                }
              }
            }
          }

          // Dealer location selectors
          const locSelectors = [
            '[data-cmp="dealerLocation"]',
            '[data-qa="dealer-location"]',
            'span[class*="dealer-location"]',
            '[data-cmp="ownerLocation"]',
            '[class*="dealerLocation"]',
            '.dealer-location'
          ];

          for (const sel of locSelectors) {
            const el = card.querySelector(sel);
            if (el) {
              const code = calculator.extractStateCode(el.textContent);
              if (code) {
                state = code;
                stateSource = 'dom';
                break;
              }
            }
          }

          // Card text search fallback for state
          if (!state) {
            const code = calculator.extractStateCode(card.textContent);
            if (code) {
              state = code;
              stateSource = 'dom-card-fallback';
            }
          }

          if (price && priceEl) {
            results.push({
              id,
              isDetail: false,
              containerEl: card,
              priceEl,
              price,
              state,
              stateSource
            });
          }
        } catch (e) {
          console.warn('[OTD Price] Error parsing autotrader card:', e);
        }
      });

      return results;
    },

    parseDetailPage(root, calculator) {
      let price = null;
      let priceEl = null;
      let state = null;
      let stateSource = null;

      // 1. JSON-LD structured data
      const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent);
          const obj = Array.isArray(data) ? data[0] : data;
          if (obj) {
            if (obj.offers && obj.offers.price) {
              price = Number(obj.offers.price);
            }
            if (obj.offers && obj.offers.seller && obj.offers.seller.address) {
              const reg = obj.offers.seller.address.addressRegion;
              if (reg) {
                state = calculator.extractStateCode(reg);
                stateSource = 'json-ld';
              }
            }
          }
        } catch (_) {}
      }

      // 2. VDP Price Selectors
      const vdpPriceSelectors = [
        '[data-cmp="pricing"]',
        '[data-qa="heading-price"]',
        '[data-qa="price"]',
        'span[data-cmp="firstPrice"]',
        '[class*="primary-price"]',
        'h1 + div [class*="price"]'
      ];

      for (const sel of vdpPriceSelectors) {
        const el = root.querySelector(sel);
        if (el) {
          const parsed = calculator.parsePrice(el.textContent);
          if (parsed) {
            price = parsed;
            priceEl = el;
            break;
          }
        }
      }

      // 3. VDP Dealer State Selectors
      if (!state) {
        const vdpStateSelectors = [
          '[data-cmp="dealerLocation"]',
          '[data-qa="dealer-location"]',
          '[data-cmp="dealerAddress"]',
          '.dealer-location',
          '[class*="dealer-info"]',
          '[data-qa="dealer-info"]'
        ];

        for (const sel of vdpStateSelectors) {
          const el = root.querySelector(sel);
          if (el) {
            const code = calculator.extractStateCode(el.textContent);
            if (code) {
              state = code;
              stateSource = 'dom-vdp';
              break;
            }
          }
        }
      }

      // Fallback
      if (!state) {
        state = calculator.extractStateCode(root.body ? root.body.textContent : '');
        if (state) stateSource = 'dom-page-fallback';
      }

      if (price && priceEl) {
        return {
          id: 'autotrader-vdp-detail',
          isDetail: true,
          containerEl: priceEl.parentElement || priceEl,
          priceEl,
          price,
          state,
          stateSource
        };
      }

      return null;
    }
  };

  if (typeof globalThis !== 'undefined') {
    globalThis.AutotraderParser = AutotraderParser;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutotraderParser;
  }
})();
