// OTD Price - Tax & Out-The-Door Calculation Engine
// Bundled client-side calculation. Zero network calls.
(function() {
  const STATE_NAMES = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
    'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'DISTRICT OF COLUMBIA': 'DC',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL',
    'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA',
    'MAINE': 'ME', 'MARYLAND': 'MD', 'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN',
    'MISSISSIPPI': 'MS', 'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK', 'OREGON': 'OR',
    'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD',
    'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT', 'VIRGINIA': 'VA',
    'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
  };

  // State abbreviations that are also common English words
  const AMBIGUOUS_WORDS = new Set(['IN', 'OR', 'ME', 'OK', 'ID', 'MA', 'DE', 'HI', 'OH', 'PA', 'AS', 'AT']);

  class OTDCalculator {
    constructor(taxData) {
      this.taxData = taxData || (typeof globalThis !== 'undefined' ? globalThis.OTD_TAX_DATA : null);
      this.calcCache = new Map();
      this.stateCache = new Map();
    }

    getTaxData() {
      if (!this.taxData && typeof globalThis !== 'undefined' && globalThis.OTD_TAX_DATA) {
        this.taxData = globalThis.OTD_TAX_DATA;
      }
      return this.taxData;
    }

    getStateInfo(stateCode) {
      const data = this.getTaxData();
      if (!data || !data.states) return null;
      const code = (stateCode || '').trim().toUpperCase();
      return data.states[code] || null;
    }

    calculate(askingPrice, stateCode) {
      const price = Number(askingPrice);
      if (isNaN(price) || price <= 0) return null;

      const code = (stateCode || '').trim().toUpperCase();
      const cacheKey = `${price}_${code}`;

      if (this.calcCache.has(cacheKey)) {
        return this.calcCache.get(cacheKey);
      }

      const stateInfo = this.getStateInfo(code);
      if (!stateInfo) {
        return null;
      }

      const taxAmount = Math.round(price * stateInfo.rate);
      const docFee = Number(stateInfo.docFee) || 0;
      const titleReg = Number(stateInfo.titleReg) || 0;
      const totalOTD = price + taxAmount + docFee + titleReg;

      const result = {
        askingPrice: price,
        stateCode: code,
        stateName: stateInfo.name,
        taxRate: stateInfo.rate,
        taxAmount,
        docFee,
        docFeeCapped: Boolean(stateInfo.docFeeCapped),
        docFeeCapAmount: stateInfo.docFeeCapAmount,
        titleReg,
        totalOTD,
        notes: stateInfo.notes || ''
      };

      // Cap cache size at 500 entries
      if (this.calcCache.size > 500) {
        const firstKey = this.calcCache.keys().next().value;
        this.calcCache.delete(firstKey);
      }
      this.calcCache.set(cacheKey, result);

      return result;
    }

    extractStateCode(text) {
      if (!text || typeof text !== 'string') return null;
      const cleaned = text.trim();
      if (cleaned.length < 2) return null;

      if (this.stateCache.has(cleaned)) {
        return this.stateCache.get(cleaned);
      }

      let detected = null;

      // 1. High-confidence: City, ST pattern (e.g., "Dallas, TX", "Austin, TX 78701", "Miami, FL (10 mi)")
      const commaPattern = /,\s*([A-Z]{2})\b(?:\s+\d{5}|\s*\(|\s*$|\s*,|\s+-)/i;
      const commaMatch = cleaned.match(commaPattern);
      if (commaMatch && commaMatch[1]) {
        const potential = commaMatch[1].toUpperCase();
        if (this.getStateInfo(potential)) {
          detected = potential;
        }
      }

      // 2. State followed by a 5-digit US ZIP code (e.g. "TX 75001" or "WA 98101")
      if (!detected) {
        const zipPattern = /\b([A-Z]{2})\s+\d{5}\b/i;
        const zipMatch = cleaned.match(zipPattern);
        if (zipMatch && zipMatch[1]) {
          const potential = zipMatch[1].toUpperCase();
          if (this.getStateInfo(potential)) {
            detected = potential;
          }
        }
      }

      // 3. Full state names (e.g., "Austin, Texas", "Seattle, Washington")
      if (!detected) {
        const upper = cleaned.toUpperCase();
        for (const [name, code] of Object.entries(STATE_NAMES)) {
          // Check for word boundary of state name
          const nameRegex = new RegExp(`\\b${name}\\b`, 'i');
          if (nameRegex.test(upper)) {
            detected = code;
            break;
          }
        }
      }

      // 4. Standalone 2-letter state code, but strictly excluding ambiguous common English words
      if (!detected) {
        const words = cleaned.toUpperCase().split(/[^A-Z]+/);
        for (const w of words) {
          if (w.length === 2 && this.getStateInfo(w) && !AMBIGUOUS_WORDS.has(w)) {
            detected = w;
            break;
          }
        }
      }

      // Cap cache size
      if (this.stateCache.size > 500) {
        const firstKey = this.stateCache.keys().next().value;
        this.stateCache.delete(firstKey);
      }
      this.stateCache.set(cleaned, detected);

      return detected;
    }

    parsePrice(text) {
      if (!text) return null;
      if (typeof text === 'number') return (text >= 500 && text <= 2000000) ? Math.round(text) : null;
      // Clean non-breaking spaces & symbols
      const sanitized = String(text).replace(/\u00A0/g, ' ').replace(/,/g, '').trim();
      // Guard against negative numbers (e.g. -500, $-500, -$500)
      if (/(?:^|\s)-|\$-/.test(sanitized)) return null;

      const match = sanitized.match(/\$?\s*([0-9]{3,7}(?:\.[0-9]{2})?)/);
      if (!match) return null;
      const num = parseFloat(match[1]);
      return (!isNaN(num) && num >= 500 && num <= 2000000) ? Math.round(num) : null;
    }

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(amount);
    }

    formatPercent(rate) {
      return (rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 2) + '%';
    }
  }

  const instance = new OTDCalculator();

  if (typeof globalThis !== 'undefined') {
    globalThis.OTDCalculator = OTDCalculator;
    globalThis.otdCalculator = instance;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OTDCalculator, otdCalculator: instance };
  }
})();
