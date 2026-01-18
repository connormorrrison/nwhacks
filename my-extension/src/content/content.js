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
  function createFloatingPanel() {
    const panel = document.createElement('div');
    panel.id = 'neg-panel';
    panel.style.position = 'fixed';
    panel.style.right = '12px';
    panel.style.bottom = '12px';
    panel.style.zIndex = 2147483647;
    panel.style.background = '#fff';
    panel.style.border = '1px solid rgba(0,0,0,0.08)';
    panel.style.borderRadius = '8px';
    panel.style.padding = '8px';
    panel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
    panel.style.fontFamily = 'Arial, sans-serif';
    panel.style.width = '220px';

    const title = document.createElement('div');
    title.textContent = 'Negotiation Helper';
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';
    panel.appendChild(title);

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Listing';
    addBtn.style.width = '100%';
    addBtn.style.marginBottom = '6px';
    panel.appendChild(addBtn);

    const mapBtn = document.createElement('button');
    mapBtn.textContent = 'Map Message';
    mapBtn.style.width = '100%';
    panel.appendChild(mapBtn);

    document.body.appendChild(panel);

    addBtn.addEventListener('click', () => openAddListingModal());
    mapBtn.addEventListener('click', () => startMessageMapping());
  }

  function openAddListingModal(existing = null) {
    const modal = buildModal();
    const title = modal.querySelector('#neg-modal-title');
    title.textContent = existing ? 'Edit Listing' : 'Add Listing';

    const nameInput = modal.querySelector('#neg-listing-title');
    const priceInput = modal.querySelector('#neg-listing-price');
    const reasonInput = modal.querySelector('#neg-listing-reason');
    const saveBtn = modal.querySelector('#neg-save-btn');

    if (existing) {
      nameInput.value = existing.title || '';
      priceInput.value = existing.targetPrice || '';
      reasonInput.value = existing.priceReason || '';
    }

    saveBtn.onclick = async () => {
      const listing = {
        id: existing?.id,
        title: nameInput.value || 'Untitled',
        targetPrice: priceInput.value || '',
        priceReason: reasonInput.value || '',
        createdAt: existing?.createdAt || Date.now()
      };
      await storage.saveListing(listing);
      closeModal(modal);
      showToast('Listing saved');
    };
  }

  function buildModal() {
    const overlay = document.createElement('div');
    overlay.id = 'neg-modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.left = 0; overlay.style.top = 0; overlay.style.right = 0; overlay.style.bottom = 0;
    overlay.style.background = 'rgba(0,0,0,0.25)';
    overlay.style.zIndex = 2147483648;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const modal = document.createElement('div');
    modal.style.background = '#fff';
    modal.style.padding = '16px';
    modal.style.borderRadius = '8px';
    modal.style.width = '420px';
    modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.12)';
    modal.innerHTML = `
      <div style="font-weight:600;margin-bottom:8px" id="neg-modal-title">Add Listing</div>
      <div style="margin-bottom:8px"><label>Title</label><br/><input id="neg-listing-title" style="width:100%"/></div>
      <div style="margin-bottom:8px"><label>Target selling price</label><br/><input id="neg-listing-price" style="width:100%"/></div>
      <div style="margin-bottom:8px"><label>Why this price is fair</label><br/><textarea id="neg-listing-reason" style="width:100%" rows="3"></textarea></div>
      <div style="text-align:right"><button id="neg-cancel-btn">Cancel</button> <button id="neg-save-btn">Save</button></div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.querySelector('#neg-cancel-btn').onclick = () => closeModal(overlay);
    return overlay;
  }

  function closeModal(modal) { modal.remove(); }

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

  let mappingActive = false;
  function startMessageMapping() {
    if (mappingActive) return;
    mappingActive = true;
    showToast('Click a buyer message to map it to a listing');
    const handler = async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      const el = ev.target;
      document.removeEventListener('click', handler, true);
      mappingActive = false;
      // Build mapping modal: choose listing + opt-in
      const modal = buildModal();
      const container = modal.querySelector('div');
      container.innerHTML = '<div style="font-weight:600;margin-bottom:8px">Map Message</div>';
      const preview = document.createElement('div');
      preview.style.marginBottom = '8px';
      preview.textContent = el.innerText?.slice(0, 300) || el.textContent?.slice(0,300) || el.outerHTML.slice(0,200);
      container.appendChild(preview);

      const listings = await storage.getListings();
      const selectWrap = document.createElement('div');
      selectWrap.style.marginBottom = '8px';
      const sel = document.createElement('select');
      sel.style.width = '100%';
      const emptyOpt = document.createElement('option'); emptyOpt.text = '-- select listing --'; emptyOpt.value=''; sel.add(emptyOpt);
      listings.forEach(l => { const o = document.createElement('option'); o.value = l.id; o.text = `${l.title} — ${l.targetPrice || ''}`; sel.add(o); });
      selectWrap.appendChild(sel);
      container.appendChild(selectWrap);

      const autoWrap = document.createElement('div');
      autoWrap.style.marginBottom = '8px';
      const chk = document.createElement('input'); chk.type = 'checkbox'; chk.id = 'neg-auto-chk';
      const lbl = document.createElement('label'); lbl.htmlFor = 'neg-auto-chk'; lbl.textContent = ' Enable auto-negotiate';
      autoWrap.appendChild(chk); autoWrap.appendChild(lbl);
      container.appendChild(autoWrap);

      const btnWrap = document.createElement('div'); btnWrap.style.textAlign = 'right';
      const cancel = document.createElement('button'); cancel.textContent = 'Cancel';
      const save = document.createElement('button'); save.textContent = 'Save mapping';
      btnWrap.appendChild(cancel); btnWrap.appendChild(save);
      container.appendChild(btnWrap);

      cancel.onclick = () => closeModal(modal);
      save.onclick = async () => {
        const session = {
          listingId: sel.value || null,
          buyerSnippet: preview.textContent,
          buyerSelector: cssPath(el),
          autoNegotiate: !!chk.checked,
          status: chk.checked ? 'active' : 'paused',
          createdAt: Date.now()
        };
        await storage.saveSession(session);
        closeModal(modal);
        showToast('Mapping saved');
      };
    };
    document.addEventListener('click', handler, true);
  }

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

  // Inject UI once DOM is ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createFloatingPanel);
  else createFloatingPanel();

})();
