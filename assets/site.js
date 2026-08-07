(() => {
  const base = document.body.dataset.base ?? '';
  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch { /* use fallback */ }
    }
    const field = document.createElement('textarea');
    field.value = text; field.setAttribute('readonly', '');
    field.style.position = 'fixed'; field.style.opacity = '0';
    document.body.append(field); field.select();
    const copied = document.execCommand('copy'); field.remove();
    return copied;
  }

  const menuButton = document.querySelector('.menu-button');
  const navigation = document.querySelector('#main-nav');
  menuButton?.addEventListener('click', () => {
    const open = navigation?.classList.toggle('open') ?? false;
    menuButton.setAttribute('aria-expanded', String(open));
  });
  navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }));

  const compareTray = document.querySelector('[data-compare-tray]');
  const compareCount = document.querySelector('[data-compare-count]');
  const compareLink = document.querySelector('[data-compare-link]');
  const compareBoxes = [...document.querySelectorAll('[data-compare-id]')];
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem('bike-guide-compare') ?? '[]'); } catch { stored = []; }
  let selection = Array.isArray(stored) ? [...new Set(stored.filter((item) => typeof item === 'string'))].slice(0, 4) : [];

  function renderCompareTray() {
    localStorage.setItem('bike-guide-compare', JSON.stringify(selection));
    if (compareCount) compareCount.textContent = String(selection.length);
    compareTray?.classList.toggle('visible', selection.length > 0);
    if (compareLink) {
      const root = compareLink.dataset.base ?? `${base}/compare/`;
      compareLink.href = `${root}?ids=${encodeURIComponent(selection.join(','))}`;
    }
    compareBoxes.forEach((box) => { box.checked = selection.includes(box.dataset.compareId); });
  }
  compareBoxes.forEach((box) => {
    box.addEventListener('change', () => {
      const id = box.dataset.compareId;
      if (!id) return;
      if (box.checked && !selection.includes(id)) {
        if (selection.length >= 4) { box.checked = false; return; }
        selection.push(id);
      } else if (!box.checked) selection = selection.filter((item) => item !== id);
      renderCompareTray();
    });
  });
  renderCompareTray();

  document.querySelectorAll('[data-explorer-root]').forEach((root) => {
    const grid = root.querySelector('[data-product-grid]');
    const cards = [...root.querySelectorAll('[data-product-card]')];
    const count = root.querySelector('[data-result-count]');
    const empty = root.querySelector('[data-empty]');
    const search = root.querySelector('[data-filter-search]');
    const category = root.querySelector('[data-filter="category"]');
    const clearance = root.querySelector('[data-filter-clearance]');
    const eligibility = root.querySelector('[data-filter="eligibility"]');
    const sort = root.querySelector('[data-sort]');
    const reset = root.querySelector('[data-reset]');

    function update() {
      const query = search?.value.trim().toLowerCase() ?? '';
      const categoryValue = category?.value ?? '';
      const minimum = Number(clearance?.value ?? 0);
      const eligibilityValue = eligibility?.value ?? '';
      const visible = cards.filter((card) => {
        const matches = (!query || card.dataset.search?.includes(query)) &&
          (!categoryValue || card.dataset.category === categoryValue) &&
          (!eligibilityValue || card.dataset.eligibility === eligibilityValue) &&
          (!minimum || Number(card.dataset.clearance || 0) >= minimum);
        card.hidden = !matches;
        return matches;
      });
      const mode = sort?.value ?? 'price-asc';
      visible.sort((a, b) => {
        if (mode === 'price-desc') return Number(b.dataset.price || -1) - Number(a.dataset.price || -1);
        if (mode === 'clearance-desc') return Number(b.dataset.clearance || -1) - Number(a.dataset.clearance || -1);
        if (mode === 'name') return (a.dataset.search ?? '').localeCompare(b.dataset.search ?? '');
        return Number(a.dataset.price || Number.MAX_SAFE_INTEGER) - Number(b.dataset.price || Number.MAX_SAFE_INTEGER);
      });
      visible.forEach((card) => grid?.insertBefore(card, empty));
      if (count) count.textContent = String(visible.length);
      if (empty) empty.hidden = visible.length !== 0;
    }
    for (const element of [search, category, clearance, eligibility, sort]) element?.addEventListener(element === search ? 'input' : 'change', update);
    reset?.addEventListener('click', () => {
      if (search) search.value = '';
      if (category) category.value = '';
      if (clearance) clearance.value = '0';
      if (eligibility) eligibility.value = '';
      if (sort) sort.value = 'price-asc';
      update();
    });
    update();
  });

  const comparisonData = document.querySelector('#comparison-data');
  if (comparisonData) {
    const products = JSON.parse(comparisonData.textContent ?? '[]');
    const byId = new Map(products.map((item) => [item.id, item]));
    const selects = [...document.querySelectorAll('[data-compare-select]')];
    const head = document.querySelector('[data-comparison-head]');
    const body = document.querySelector('[data-comparison-body]');
    const wrap = document.querySelector('[data-comparison-wrap]');
    const empty = document.querySelector('[data-comparison-empty]');
    const warning = document.querySelector('[data-mixed-warning]');
    const fields = [
      ['Verdict','verdict'],['Price','price'],['Price date','priceDate'],['Price status','priceStatus'],
      ['Type','kind'],['Category','category'],['Clearance','clearance'],['Clearance evidence','evidence'],
      ['Eligibility','eligibility'],['Bottom bracket','bb'],['Derailleur hanger','hanger'],['Storage','storage'],
      ['Mounts','mounts'],['Frame weight','frameWeight'],['Complete weight','completeWeight'],
      ['Drivetrain','drivetrain'],['Wheels','wheels'],['Manufacturing','manufacturing'],
      ['China availability','availability'],['Great-buy threshold','greatBuy'],['Main caveats','caveats']
    ];
    const choiceIds = () => [...new Set(selects.map((select) => select.value).filter(Boolean))];
    function renderComparison() {
      const selected = choiceIds().map((id) => byId.get(id)).filter(Boolean);
      selection = selected.map((item) => item.id);
      renderCompareTray();
      const params = selected.length ? `?ids=${encodeURIComponent(selected.map((item) => item.id).join(','))}` : location.pathname;
      history.replaceState(null, '', params);
      if (head) {
        head.replaceChildren(Object.assign(document.createElement('th'), { textContent:'Field' }), ...selected.map((item) => {
          const th = document.createElement('th');
          const link = document.createElement('a');
          link.href = `${base}/models/${item.id}/`;
          link.textContent = `${item.brand} ${item.name}`;
          th.append(link); return th;
        }));
      }
      if (body) {
        body.replaceChildren(...fields.map(([label,key]) => {
          const row = document.createElement('tr');
          row.append(Object.assign(document.createElement('td'), { textContent:label }));
          for (const item of selected) row.append(Object.assign(document.createElement('td'), { textContent:String(item[key] ?? 'Unknown') }));
          return row;
        }));
      }
      const show = selected.length >= 2;
      if (wrap) wrap.hidden = !show;
      if (empty) empty.hidden = show;
      if (warning) warning.hidden = new Set(selected.map((item) => item.kind)).size <= 1;
    }
    const queryIds = (new URLSearchParams(location.search).get('ids') ?? '').split(',').filter(Boolean);
    const initial = queryIds.length ? queryIds : stored;
    initial.slice(0,4).forEach((id,index) => { if (selects[index]) selects[index].value = id; });
    selects.forEach((select) => select.addEventListener('change', renderComparison));
    document.querySelector('[data-clear-compare]')?.addEventListener('click', () => { selects.forEach((select) => select.value = ''); renderComparison(); });
    document.querySelector('[data-share-compare]')?.addEventListener('click', async (event) => {
      await copyText(location.href);
      if (event.currentTarget instanceof HTMLButtonElement) { event.currentTarget.textContent='Copied'; setTimeout(() => event.currentTarget.textContent='Copy comparison link',1300); }
    });
    renderComparison();
  }

  document.querySelectorAll('[data-build-calculator]').forEach((calculator) => {
    const profile = calculator.querySelector('[data-build-profile]');
    if (!(profile instanceof HTMLSelectElement)) return;
    const update = () => {
      const option = profile.selectedOptions[0];
      const frameLow = Number(calculator.dataset.frameLow ?? 0);
      const frameHigh = Number(calculator.dataset.frameHigh ?? 0);
      const low = Number(option?.dataset.low ?? 0);
      const high = Number(option?.dataset.high ?? 0);
      const format = (value) => `¥${new Intl.NumberFormat('en-US').format(value)}`;
      const total = calculator.querySelector('[data-build-total]');
      const parts = calculator.querySelector('[data-parts-range]');
      if (total) total.textContent = `${format(frameLow + low)}–${format(frameHigh + high)}`;
      if (parts) parts.textContent = `${format(low)}–${format(high)}`;
    };
    profile.addEventListener('change', update);
    update();
  });

  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;
      await copyText(target.textContent ?? '');
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => button.textContent = original, 1400);
    });
  });
})();
