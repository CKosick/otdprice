// OTD Price - CarGurus DOM Parser
// Isolated parser module with version flag.
(function() {
  const CarGurusParser = {
    siteId: 'cargurus',
    name: 'CarGurus',
    version: '2026.1',

    matches(hostname) {
      return hostname.includes('cargurus.com');
    },

    isDetailPage() {
      const path = (typeof window !== 'undefined' && window.location) ? window.location.pathname : '';
      const hasVdpSelector = typeof document !== 'undefined' &&
        Boolean(document.querySelector('[data-testid="vdp-page"], #vdp-content, [data-cg-vdp]'));
      return path.includes('/viewDetails') || path.includes('/detail/') || hasVdpSelector;
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
        'div[data-cg-listing-id]',
        'div[data-testid*="listing"]',
        'div[class*="listingCard"]',
        'div[class*="bladeCard"]',
        'div[data-cg-vin]',
        'div[class*="Card_card"]'
      ];

      const cards = root.querySelectorAll(cardSelectors.join(', '));
      const processedIds = new Set();

      cards.forEach((card, index) => {
        try {
          const id = card.getAttribute('data-cg-listing-id') ||
                     card.getAttribute('data-testid') ||
                     card.id ||
                     `cargurus-card-${index}`;

          if (processedIds.has(id)) return;
          processedIds.add(id);

          let price = null;
          let priceEl = null;
          let state = null;
          let stateSource = null;

          // Check data-cg-price attribute
          const cgPrice = card.getAttribute('data-cg-price');
          if (cgPrice) {
            price = calculator.parsePrice(cgPrice);
          }

          // Price element selectors
          const priceSelectors = [
            '[data-testid*="price"]',
            'span[class*="primaryPrice"]',
            '[data-cg-price]',
            'span[class*="Price"]',
            '[class*="priceSection"]',
            'h4[class*="price"]',
            'strong[class*="price"]'
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
            const allElements = card.querySelectorAll('span, div, h4');
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
            '[data-testid*="seller"]',
            '[data-testid*="dealer"]',
            '[class*="sellerLocation"]',
            '[class*="dealerLocation"]',
            'span[class*="dealerCityState"]',
            '[class*="dealerAddress"]'
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
          console.warn('[OTD Price] Error parsing cargurus card:', e);
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
        '[data-testid="vdp-price"]',
        '[data-testid="price-section"]',
        'span[class*="primaryPrice"]',
        '[data-cg-price]',
        'h1 + div [class*="price"]',
        'h2[class*="price"]'
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
          '[data-testid*="dealer-address"]',
          '[class*="dealerAddress"]',
          '[data-testid*="seller"]',
          '.dealer-location',
          '[class*="dealer-info"]'
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
          id: 'cargurus-vdp-detail',
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
    globalThis.CarGurusParser = CarGurusParser;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CarGurusParser;
  }
})();
