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

  class OTDCalculator {
    constructor(taxData) {
      this.taxData = taxData || (typeof globalThis !== 'undefined' ? globalThis.OTD_TAX_DATA : null);
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
      const stateInfo = this.getStateInfo(code);

      if (!stateInfo) {
        return null;
      }

      const taxAmount = Math.round(price * stateInfo.rate);
      const docFee = Number(stateInfo.docFee) || 0;
      const titleReg = Number(stateInfo.titleReg) || 0;
      const totalOTD = price + taxAmount + docFee + titleReg;

      return {
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
    }

    extractStateCode(text) {
      if (!text || typeof text !== 'string') return null;
      const cleaned = text.trim();

      // Check for City, ST pattern (e.g., "Dallas, TX" or "Austin, TX 78701" or "Miami, FL (10 mi)")
      const stateAbbrRegex = /(?:,\s*|\b)([A-Z]{2})\b(?:\s+\d{5}|\s*\(|\s*$|\s*,)/i;
      const match = cleaned.match(stateAbbrRegex);
      if (match && match[1]) {
        const potentialCode = match[1].toUpperCase();
        if (this.getStateInfo(potentialCode)) {
          return potentialCode;
        }
      }

      // Check 2-letter word boundary against valid state codes
      const words = cleaned.toUpperCase().split(/[^A-Z]+/);
      for (const w of words) {
        if (w.length === 2 && this.getStateInfo(w)) {
          return w;
        }
      }

      // Check full state names
      const upper = cleaned.toUpperCase();
      for (const [name, code] of Object.entries(STATE_NAMES)) {
        if (upper.includes(name)) {
          return code;
        }
      }

      return null;
    }

    parsePrice(text) {
      if (!text) return null;
      if (typeof text === 'number') return text > 0 ? text : null;
      // Extract numbers like "$24,500", "24,500", "24500.00"
      const match = text.replace(/,/g, '').match(/\$?\s*([0-9]{3,7}(?:\.[0-9]{2})?)/);
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
