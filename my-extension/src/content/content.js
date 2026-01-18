// Simple injected UI for listing capture and mapping messages to listings.

// Lightweight storage wrapper (content scripts can't use ES module imports reliably).
const storage = {
  async get(key, defaultValue) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] ?? defaultValue);
      });
    });
  },
  async set(obj) {
    return new Promise((resolve) => {
      chrome.storage.local.set(obj, () => resolve());
    });
  },
  async getListings() { return (await this.get('neg_listings', [])); },
  async saveListing(listing) {
    const listings = await this.getListings();
    if (!listing.id) listing.id = `lst_${Date.now()}`;
    const idx = listings.findIndex((l) => l.id === listing.id);
    if (idx >= 0) listings[idx] = listing; else listings.push(listing);
    await this.set({ 'neg_listings': listings });
    return listing;
  },
  async getSessions() { return (await this.get('neg_sessions', [])); },
  async saveSession(session) {
    const sessions = await this.getSessions();
    if (!session.id) session.id = `sess_${Date.now()}`;
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) sessions[idx] = session; else sessions.push(session);
    await this.set({ 'neg_sessions': sessions });
    return session;
  }
};

;(function () {
  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.position = 'fixed';
    t.style.left = '50%';
    t.style.transform = 'translateX(-50%)';
    t.style.bottom = '24px';
    t.style.background = '#111';
    t.style.color = '#fff';
    t.style.padding = '8px 12px';
    t.style.borderRadius = '6px';
    t.style.zIndex = 2147483649;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }
  let mappingActive = false; // reserved for future side-panel based mapping

  // Simple CSS path generator (best-effort)
  function cssPath(el) {
    if (!(el instanceof Element)) return '';
    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE && el.tagName.toLowerCase() !== 'html') {
      let selector = el.tagName.toLowerCase();
      if (el.id) selector += `#${el.id}`;
      else {
        const cls = el.className && typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean)[0] : null;
        if (cls) selector += `.${cls}`;
      }
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  // Start detection once DOM is ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', detectListingForm);
  else detectListingForm();

  // Detect listing-creation forms and offer to capture listing title automatically
  function detectListingForm() {
    const titleSelectors = [
      'input[placeholder*="title" i]',
      'input[name*="title" i]',
      'input[id*="title" i]',
      'div[role="textbox"][contenteditable="true"]'
    ];

    const input = titleSelectors
      .map(s => document.querySelector(s))
      .find(Boolean);

    if (!input) return;

    // avoid adding multiple buttons
    if (input.parentElement.querySelector('#neg-capture-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'neg-capture-btn';
    btn.textContent = 'Capture for negotiation';
    btn.style.marginLeft = '8px';
    btn.style.padding = '6px 8px';
    btn.style.fontSize = '12px';

    // try to append near input
    try { input.parentElement.appendChild(btn); } catch (e) { document.body.appendChild(btn); }

    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const titleText = (input.value || input.innerText || '').trim();
      if (!titleText) {
        showToast('Please enter the listing title first');
        return;
      }
      // Save a captured listing (title locked) and instruct user to open side panel
      const listing = {
        title: titleText,
        autoCaptured: true,
        pageUrl: window.location.href,
        pageTitle: document.title,
        createdAt: Date.now()
      };
      await storage.saveListing(listing);
      showToast('Listing captured — open Negotiating Agent side panel to add price & reason');
    });
  }

  // Periodically look for listing title inputs on the page
  const listingDetectInterval = setInterval(() => {
    detectListingForm();
  }, 1000);

  // Stop detection when page unloads
  window.addEventListener('beforeunload', () => clearInterval(listingDetectInterval));

})();
