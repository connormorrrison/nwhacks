document.addEventListener('DOMContentLoaded', () => {
  const root = document.createElement('div');
  root.style.padding = '12px';
  root.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  root.style.width = '320px';

  const h = document.createElement('h2');
  h.textContent = 'Negotiating Agent';
  h.style.marginBottom = '8px';
  root.appendChild(h);

  const listContainer = document.createElement('div');
  listContainer.id = 'neg-listings';
  root.appendChild(listContainer);

  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = 'Refresh';
  refreshBtn.style.marginTop = '8px';
  refreshBtn.onclick = renderListings;
  root.appendChild(refreshBtn);

  document.body.appendChild(root);

  renderListings();

  async function renderListings() {
    listContainer.innerHTML = '';
    const data = await getStorage('neg_listings', []);
    if (!data || data.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No captured listings yet. Capture from a listing page.';
      listContainer.appendChild(empty);
      return;
    }
    data.forEach(l => {
      const card = document.createElement('div');
      card.style.border = '1px solid #eee';
      card.style.padding = '8px';
      card.style.borderRadius = '6px';
      card.style.marginBottom = '8px';

      const title = document.createElement('div'); title.textContent = l.title; title.style.fontWeight='600';
      card.appendChild(title);

      const url = document.createElement('div'); url.textContent = l.pageUrl || ''; url.style.fontSize='12px'; url.style.color='#666';
      card.appendChild(url);

      const priceLabel = document.createElement('label'); priceLabel.textContent = 'Target price'; priceLabel.style.display='block'; priceLabel.style.marginTop='6px';
      const priceInput = document.createElement('input'); priceInput.value = l.targetPrice || ''; priceInput.style.width = '100%';
      card.appendChild(priceLabel); card.appendChild(priceInput);

      const reasonLabel = document.createElement('label'); reasonLabel.textContent = 'Why this price'; reasonLabel.style.display='block'; reasonLabel.style.marginTop='6px';
      const reasonInput = document.createElement('textarea'); reasonInput.value = l.priceReason || ''; reasonInput.rows=3; reasonInput.style.width='100%';
      card.appendChild(reasonLabel); card.appendChild(reasonInput);

      const btnRow = document.createElement('div'); btnRow.style.textAlign='right'; btnRow.style.marginTop='6px';
      const save = document.createElement('button'); save.textContent = 'Save';
      const remove = document.createElement('button'); remove.textContent = 'Remove'; remove.style.marginLeft='8px';
      btnRow.appendChild(remove); btnRow.appendChild(save);
      card.appendChild(btnRow);

      save.onclick = async () => {
        l.targetPrice = priceInput.value;
        l.priceReason = reasonInput.value;
        await setStorage('neg_listings', data.map(x => x.id === l.id ? l : x));
        showToast('Saved');
      };

      remove.onclick = async () => {
        const filtered = data.filter(x => x.id !== l.id);
        await setStorage('neg_listings', filtered);
        renderListings();
      };

      listContainer.appendChild(card);
    });
  }

  function getStorage(key, def) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (res) => resolve(res[key] ?? def));
    });
  }
  function setStorage(key, val) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: val }, () => resolve());
    });
  }

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
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }
});
