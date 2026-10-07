// OTD Price - Cars.com DOM Parser
// Isolated parser module with version flag.
(function() {
  const CarsParser = {
    siteId: 'cars',
    name: 'Cars.com',
    version: '2026.1',

    matches(hostname) {
      return hostname.includes('cars.com');
    },

    isDetailPage() {
      return window.location.pathname.includes('/vehicledetail') ||
             Boolean(document.querySelector('.vdp-details, .vdp-container, #vdp-content, [data-qa="vdp-page"]'));
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
        'fuse-card',
        '[id^="vehicle-card-"]',
        '.vehicle-card',
        'div[data-vehicle-details]',
        'div.vehicle-card-main'
      ];

      const cards = root.querySelectorAll(cardSelectors.join(', '));
      const processedIds = new Set();

      cards.forEach((card, index) => {
        try {
          const id = card.id || card.getAttribute('data-vehicle-id') || `cars-card-${index}`;
          if (processedIds.has(id)) return;
          processedIds.add(id);

          let price = null;
          let priceEl = null;
          let state = null;
          let stateSource = null;

          // Check data-vehicle-details attribute first (cleanest & most stable)
          const detailsAttr = card.getAttribute('data-vehicle-details');
          if (detailsAttr) {
            try {
              const details = JSON.parse(detailsAttr);
              if (details.price) {
                price = Number(details.price);
              }
              if (details.seller && details.seller.state) {
                state = calculator.extractStateCode(details.seller.state);
                stateSource = 'data-attr';
              }
            } catch (_) {}
          }

          // Price element selectors
          const priceSelectors = [
            'span.primary-price',
            '[class*="primary-price"]',
            'span.fuse-body-larger',
            'a[data-card-link][data-price]',
            '[data-qa="primary-price"]'
          ];

          for (const sel of priceSelectors) {
            const el = card.querySelector(sel);
            if (el) {
              const parsed = calculator.parsePrice(el.textContent || el.getAttribute('data-price'));
              if (parsed) {
                price = parsed;
                priceEl = el;
                break;
              }
            }
          }

          // Fallback price text search inside card if not found
          if (!price || !priceEl) {
            const allElements = card.querySelectorAll('span, div, p');
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

          // State extraction from dealer location element
          if (!state) {
            const locSelectors = [
              'span.fuse-body-small',
              '.dealer-name-and-location',
              '[class*="dealer-name"]',
              '.seller-location',
              '[data-qa="dealer-location"]'
            ];

            for (const sel of locSelectors) {
              const elements = card.querySelectorAll(sel);
              for (const el of elements) {
                const code = calculator.extractStateCode(el.textContent);
                if (code) {
                  state = code;
                  stateSource = 'dom';
                  break;
                }
              }
              if (state) break;
            }
          }

          // General card text search for state if still null
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
          console.warn('[OTD Price] Error parsing cars.com card:', e);
        }
      });

      return results;
    },

    parseDetailPage(root, calculator) {
      let price = null;
      let priceEl = null;
      let state = null;
      let stateSource = null;

      // 1. Try JSON-LD structured data first
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

      // 2. DOM Price Selectors on VDP
      const vdpPriceSelectors = [
        '.price-section .primary-price',
        'span.primary-price',
        '[data-cmp="pricing"] .primary-price',
        '.vehicle-info .primary-price',
        '[class*="heading-price"]',
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

      // 3. Dealer state selectors on VDP
      if (!state) {
        const vdpStateSelectors = [
          '.dealer-address',
          '.seller-details',
          '[data-qa="dealer-address"]',
          '.dealer-location',
          '.seller-info',
          '[class*="seller-details"]'
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

      // General fallback on page text
      if (!state) {
        state = calculator.extractStateCode(root.body ? root.body.textContent : '');
        if (state) stateSource = 'dom-page-fallback';
      }

      if (price && priceEl) {
        return {
          id: 'cars-vdp-detail',
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
    globalThis.CarsParser = CarsParser;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CarsParser;
  }
})();
