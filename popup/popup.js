// OTD Price - Popup Script
// Manages state override and marketplace toggles.
// Pure client-side execution. Zero outbound requests.

document.addEventListener('DOMContentLoaded', async () => {
  const stateSelect = document.getElementById('stateOverride');
  const toggleCars = document.getElementById('toggleCars');
  const toggleAutotrader = document.getElementById('toggleAutotrader');
  const toggleCarGurus = document.getElementById('toggleCarGurus');
  const siteStatusBanner = document.getElementById('siteStatusBanner');
  const siteStatusText = document.getElementById('siteStatusText');

  // 1. Populate state dropdown from static bundled tax dataset
  if (globalThis.OTD_TAX_DATA && globalThis.OTD_TAX_DATA.states) {
    const states = Object.entries(globalThis.OTD_TAX_DATA.states)
      .map(([code, data]) => ({ code, name: data.name, rate: data.rate }))
      .sort((a, b) => a.name.localeCompare(b.name));

    states.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st.code;
      const rateStr = (st.rate * 100).toFixed(st.rate * 100 % 1 === 0 ? 0 : 2) + '%';
      opt.textContent = `${st.name} (${st.code}) — ${rateStr} tax`;
      stateSelect.appendChild(opt);
    });
  }

  // 2. Load saved settings from chrome.storage.local
  try {
    const stored = await chrome.storage.local.get(['buyerStateOverride', 'enabledSites']);

    if (stored.buyerStateOverride) {
      stateSelect.value = stored.buyerStateOverride;
    }

    const sites = stored.enabledSites || { cars: true, autotrader: true, cargurus: true };
    toggleCars.checked = sites.cars !== false;
    toggleAutotrader.checked = sites.autotrader !== false;
    toggleCarGurus.checked = sites.cargurus !== false;
  } catch (err) {
    console.warn('[OTD Price] Error loading settings:', err);
  }

  // 3. Inspect active tab to update status banner
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url) {
      const url = activeTab.url.toLowerCase();
      if (url.includes('cars.com')) {
        siteStatusBanner.classList.add('active');
        siteStatusText.textContent = 'Active on Cars.com';
      } else if (url.includes('autotrader.com')) {
        siteStatusBanner.classList.add('active');
        siteStatusText.textContent = 'Active on Autotrader';
      } else if (url.includes('cargurus.com')) {
        siteStatusBanner.classList.add('active');
        siteStatusText.textContent = 'Active on CarGurus';
      } else {
        siteStatusText.textContent = 'Ready • Visit cars.com, Autotrader, or CarGurus';
      }
    } else {
      siteStatusText.textContent = 'Ready • Visit cars.com, Autotrader, or CarGurus';
    }
  } catch (e) {
    siteStatusText.textContent = 'Ready • Browse supported marketplaces';
  }

  // 4. Save state override changes immediately
  stateSelect.addEventListener('change', async (e) => {
    const val = e.target.value;
    await chrome.storage.local.set({ buyerStateOverride: val });
  });

  // 5. Save site toggle changes immediately
  async function saveSiteToggles() {
    const enabledSites = {
      cars: toggleCars.checked,
      autotrader: toggleAutotrader.checked,
      cargurus: toggleCarGurus.checked
    };
    await chrome.storage.local.set({ enabledSites });
  }

  toggleCars.addEventListener('change', saveSiteToggles);
  toggleAutotrader.addEventListener('change', saveSiteToggles);
  toggleCarGurus.addEventListener('change', saveSiteToggles);
});
