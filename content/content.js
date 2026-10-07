// OTD Price - Content Script Controller
// Orchestrates site parsers, tax calculator, and DOM overlays.
// Pure client-side execution. Zero remote network calls.

(function() {
  let activeParser = null;
  let observer = null;
  let isSiteEnabled = true;
  let currentSettings = {
    buyerStateOverride: '',
    enabledSites: {
      cars: true,
      autotrader: true,
      cargurus: true
    }
  };

  const hostname = window.location.hostname;

  // 1. Select the appropriate parser module
  if (globalThis.CarsParser && globalThis.CarsParser.matches(hostname)) {
    activeParser = globalThis.CarsParser;
  } else if (globalThis.AutotraderParser && globalThis.AutotraderParser.matches(hostname)) {
    activeParser = globalThis.AutotraderParser;
  } else if (globalThis.CarGurusParser && globalThis.CarGurusParser.matches(hostname)) {
    activeParser = globalThis.CarGurusParser;
  }

  if (!activeParser) {
    return; // Not on a supported marketplace
  }

  // 2. Initialize settings and start observation
  async function init() {
    try {
      if (chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['buyerStateOverride', 'enabledSites']);
        if (stored.buyerStateOverride !== undefined) {
          currentSettings.buyerStateOverride = stored.buyerStateOverride;
        }
        if (stored.enabledSites) {
          currentSettings.enabledSites = { ...currentSettings.enabledSites, ...stored.enabledSites };
        }
      }
    } catch (e) {
      console.warn('[OTD Price] Could not read settings, using defaults:', e);
    }

    isSiteEnabled = Boolean(currentSettings.enabledSites[activeParser.siteId] ?? true);

    if (isSiteEnabled) {
      processPage();
      setupObserver();
    }

    // Listen for storage changes from the extension popup
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;

        let needsFullRefresh = false;

        if (changes.enabledSites) {
          currentSettings.enabledSites = {
            ...currentSettings.enabledSites,
            ...changes.enabledSites.newValue
          };
          const newSiteEnabled = Boolean(currentSettings.enabledSites[activeParser.siteId] ?? true);

          if (newSiteEnabled !== isSiteEnabled) {
            isSiteEnabled = newSiteEnabled;
            if (!isSiteEnabled) {
              removeAllOverlays();
              if (observer) observer.disconnect();
              return;
            } else {
              setupObserver();
              needsFullRefresh = true;
            }
          }
        }

        if (changes.buyerStateOverride) {
          currentSettings.buyerStateOverride = changes.buyerStateOverride.newValue || '';
          needsFullRefresh = true;
        }

        if (isSiteEnabled && needsFullRefresh) {
          recalculateAllOverlays();
        }
      });
    }

    // Global listener to dismiss popovers when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.otd-badge-container')) {
        document.querySelectorAll('.otd-popover.otd-visible').forEach(p => p.classList.remove('otd-visible'));
      }
    });
  }

  // 3. Process the current DOM
  function processPage() {
    if (!isSiteEnabled || !activeParser) return;

    requestAnimationFrame(() => {
      try {
        const listings = activeParser.parseListings(document);
        listings.forEach(listing => injectOverlay(listing));
      } catch (err) {
        console.warn('[OTD Price] Error processing listings:', err);
      }
    });
  }

  // 4. Inject OTD overlay badge next to the listing price
  function injectOverlay(listing) {
    if (!listing.priceEl || !listing.price) return;

    // Check if container already exists
    const existing = listing.priceEl.parentElement.querySelector(`.otd-badge-container[data-listing-id="${listing.id}"]`);
    if (existing) {
      return;
    }

    const calculator = globalThis.otdCalculator;
    const effectiveState = currentSettings.buyerStateOverride || listing.state || 'TX'; // Sensible fallback if no state detected
    const isOverride = Boolean(currentSettings.buyerStateOverride);
    const breakdown = calculator.calculate(listing.price, effectiveState);

    if (!breakdown) return;

    const badgeContainer = document.createElement('div');
    badgeContainer.className = 'otd-badge-container' + (listing.isDetail ? ' otd-detail-page' : '');
    badgeContainer.setAttribute('data-listing-id', listing.id);
    badgeContainer.setAttribute('data-asking-price', String(listing.price));
    badgeContainer.setAttribute('data-detected-state', listing.state || '');

    badgeContainer.innerHTML = createBadgeHtml(breakdown, isOverride, listing.state);

    // Wire up click and hover interactions
    const pill = badgeContainer.querySelector('.otd-badge-pill');
    const popover = badgeContainer.querySelector('.otd-popover');

    pill.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Close other open popovers
      document.querySelectorAll('.otd-popover.otd-visible').forEach(p => {
        if (p !== popover) p.classList.remove('otd-visible');
      });

      popover.classList.toggle('otd-visible');
    });

    popover.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent navigating to the car listing URL
    });

    // Insert badge right after the price element or in its container
    if (listing.priceEl.nextSibling) {
      listing.priceEl.parentNode.insertBefore(badgeContainer, listing.priceEl.nextSibling);
    } else {
      listing.priceEl.parentNode.appendChild(badgeContainer);
    }
  }

  // 5. Construct Badge & Popover HTML
  function createBadgeHtml(breakdown, isOverride, detectedState) {
    const calculator = globalThis.otdCalculator;
    const stateBadgeLabel = isOverride
      ? `${breakdown.stateCode} (Override)`
      : (detectedState ? `${breakdown.stateCode}` : `${breakdown.stateCode} (Est.)`);

    return `
      <div class="otd-badge-pill" title="Click for Out-The-Door price breakdown">
        <span class="otd-badge-label">OTD Est:</span>
        <span class="otd-badge-price">${calculator.formatCurrency(breakdown.totalOTD)}</span>
        <span class="otd-badge-state">${breakdown.stateCode}</span>
        <span class="otd-badge-info-icon">i</span>
      </div>
      <div class="otd-popover">
        <div class="otd-popover-header">
          <span class="otd-popover-title">
            Out-The-Door Breakdown
          </span>
          <span class="otd-popover-state-badge">${stateBadgeLabel}</span>
        </div>
        <div class="otd-breakdown-list">
          <div class="otd-breakdown-row">
            <span class="otd-breakdown-label">Asking Price</span>
            <span class="otd-value">${calculator.formatCurrency(breakdown.askingPrice)}</span>
          </div>
          <div class="otd-breakdown-row">
            <span class="otd-breakdown-label">
              State Tax (${calculator.formatPercent(breakdown.taxRate)})
            </span>
            <span class="otd-value">+${calculator.formatCurrency(breakdown.taxAmount)}</span>
          </div>
          <div class="otd-breakdown-row">
            <div>
              <span class="otd-breakdown-label">Doc Fee</span>
              <span class="otd-breakdown-hint">${breakdown.docFeeCapped ? 'Capped by law' : 'Typical average'}</span>
            </div>
            <span class="otd-value">+${calculator.formatCurrency(breakdown.docFee)}</span>
          </div>
          <div class="otd-breakdown-row">
            <span class="otd-breakdown-label">Title & Reg Est.</span>
            <span class="otd-value">+${calculator.formatCurrency(breakdown.titleReg)}</span>
          </div>
          <div class="otd-breakdown-row total-row">
            <span class="otd-breakdown-label">Total Out-the-Door</span>
            <span class="otd-value">${calculator.formatCurrency(breakdown.totalOTD)}</span>
          </div>
        </div>
        <div class="otd-popover-footer">
          Rates & fees: research-compiled baseline estimates. Actual taxes and fees vary by county and dealer.
        </div>
      </div>
    `;
  }

  // 6. Recalculate existing overlays without unmounting them
  function recalculateAllOverlays() {
    const calculator = globalThis.otdCalculator;
    const containers = document.querySelectorAll('.otd-badge-container');

    containers.forEach(container => {
      const price = Number(container.getAttribute('data-asking-price'));
      const detectedState = container.getAttribute('data-detected-state');
      const effectiveState = currentSettings.buyerStateOverride || detectedState || 'TX';
      const isOverride = Boolean(currentSettings.buyerStateOverride);

      const breakdown = calculator.calculate(price, effectiveState);
      if (!breakdown) return;

      container.innerHTML = createBadgeHtml(breakdown, isOverride, detectedState);

      const pill = container.querySelector('.otd-badge-pill');
      const popover = container.querySelector('.otd-popover');

      pill.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.otd-popover.otd-visible').forEach(p => {
          if (p !== popover) p.classList.remove('otd-visible');
        });
        popover.classList.toggle('otd-visible');
      });

      popover.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

    // Also process any newly discovered listings
    processPage();
  }

  // 7. Remove all overlays when site is disabled
  function removeAllOverlays() {
    document.querySelectorAll('.otd-badge-container').forEach(el => el.remove());
  }

  // 8. Mutation Observer for SPAs & Infinite Scrolling
  function setupObserver() {
    if (observer) observer.disconnect();

    let debounceTimer = null;
    observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        processPage();
      }, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Start extension
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
