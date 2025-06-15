// ==UserScript==
// @name         Filter ptcgp tracker trading rarity
// @namespace    http://tampermonkey.net/
// @version      2025-06-15
// @description  Adds a little js filter for rarity
// @author       OptiPanda w/ ChatGPT
// @match        https://ptcgp-tracker.com/fr/u/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ptcgp-tracker.com
// @grant        none
// ==/UserScript==

(function() {
  // Helper: get unique values for an attribute
  function getUniqueAttributeValues(selector, attribute) {
    return [...new Set(Array.from(document.querySelectorAll(selector), el => el.getAttribute(attribute)).filter(Boolean))].sort();
  }

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #go-top { position: fixed; bottom: 20px; right: 120px; z-index: 10000; background: var(--pico-background-color); border: var(--pico-border-width) solid var(--pico-border-color); border-radius: var(--pico-border-radius); color: var(--filter-btn-color, white); padding: 10px 14px; font-size: 14px; cursor: pointer; }

    #filter-toggle { position: fixed; bottom: 20px; right: 20px; z-index: 10000; background: var(--pico-background-color); border: var(--pico-border-width) solid var(--pico-border-color); border-radius: var(--pico-border-radius); color: var(--filter-btn-color, white); padding: 10px 14px; font-size: 14px; cursor: pointer; }

    #dynamic-filter { position: fixed; bottom: 70px; right: 20px; background: var(--pico-form-element-background-color, white); color: var(--pico-form-element-color, #000); border: 1px solid var(--pico-form-element-border-color, #ccc); border-radius: 8px; padding: 10px; z-index: 9999; max-height: 80vh; overflow-y: auto; font-size: 14px; display: none; cursor: move; user-select: none; }
    #dynamic-filter .section { margin-bottom: 12px; }
    #dynamic-filter .section-title { font-weight: bold; margin-bottom: 6px; font-size: 13px; text-transform: uppercase; }
    #dynamic-filter label { display: block; margin: 4px 0; font-size: 14px; }
    #dynamic-filter .select-all { font-style: italic; margin-bottom: 6px; }

    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
    .cards .card { display: none; cursor:pointer; }
    .cards .card.did-fade-in { display: block; }
    .cards .card.showing { display: block; animation: fade-in 0.5s ease; }
    .cards .card.hiding.did-fade-in { display: block; animation: fade-out 0.2s ease; }

    .card.highlight {border-radius: 6px; -webkit-box-shadow: 0 0 3px 3px white;-moz-box-shadow: 0 0 3px 3px white; box-shadow: 0 0 3px 3px white;}
    .card.highlight::after {color:white; background: rgba(63,63,63,.95); }

    [data-set]::before { position: absolute;top: 86%;  left: 0%;  background: rgba(255,255,255,.95);  color: #333;  font-size: 1.3rem;  font-weight: bold;  padding: 3px; z-index:50; border-radius:5px}
    .card::before { content: attr(data-set) }

    .card::after{ content: attr(data-rarity) }
  `;
  document.head.appendChild(style);

  // State
  const container = document.createElement('div');
  container.id = 'dynamic-filter';
  document.body.appendChild(container);

  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        const rarity = card.getAttribute('data-rarity');
        document.querySelectorAll(`.card[data-rarity="${rarity}"]`)
            .forEach(c => c.classList.add('highlight'));
    });
    card.addEventListener('mouseleave', () => {
        const rarity = card.getAttribute('data-rarity');
        document.querySelectorAll(`.card[data-rarity="${rarity}"]`)
            .forEach(c => c.classList.remove('highlight'));
    });
  });

  // Build toggle button
  const toggleButton = document.createElement('button');
  toggleButton.id = 'filter-toggle';
  toggleButton.textContent = '⚙️ Filters';
  document.body.appendChild(toggleButton);
  toggleButton.addEventListener('click', () => {
    container.style.display = container.style.display === 'block' ? 'none' : 'block';
  });
  const goTopButton = document.createElement('button');
  goTopButton.id = 'go-top';
  goTopButton.textContent = '^';
  document.body.appendChild(goTopButton);
  goTopButton.addEventListener('click', () => {
    window.scroll({
        top: 0,
        left: 0,
        behavior: 'smooth'
    });
  });

  // Sections setup
  const filters = ['data-rarity', 'data-set'];
  filters.forEach(attr => {
    const values = getUniqueAttributeValues('.card', attr);
    if (!values.length) return;

    const section = document.createElement('div');
    section.className = 'section';
    section.dataset.filterAttribute = attr;

    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = attr.replace('data-', '').replace('-', ' ');
    section.appendChild(title);

    const selectAllLabel = document.createElement('label');
    selectAllLabel.className = 'select-all';
    selectAllLabel.innerHTML = `<input type="checkbox" checked> All`;
    section.appendChild(selectAllLabel);

    values.forEach(val => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" class="filter-checkbox" data-group="${attr}" value="${val}" checked> ${val}`;
      section.appendChild(label);
    });

    // Select all logic
    const selectAllCb = selectAllLabel.querySelector('input');
    selectAllCb.addEventListener('change', () => {
      section.querySelectorAll('input.filter-checkbox').forEach(cb => cb.checked = selectAllCb.checked);
      filterCards();
    });

    section.addEventListener('change', e => {
      if (e.target.classList.contains('filter-checkbox')) {
        const all = Array.from(section.querySelectorAll('input.filter-checkbox'));
        selectAllCb.checked = all.every(cb => cb.checked);
        filterCards();
      }
    });

    container.appendChild(section);
  });

  // Animation events
  document.addEventListener('animationstart', e => e.animationName === 'fade-in' && e.target.classList.add('did-fade-in'));
  document.addEventListener('animationend', e => e.animationName === 'fade-out' && e.target.classList.remove('did-fade-in'));

  // Core filtering
  function filterCards() {
    const active = {};
    container.querySelectorAll('.section').forEach(sec => {
      active[sec.dataset.filterAttribute] = Array.from(sec.querySelectorAll('input.filter-checkbox:checked')).map(cb => cb.value);
    });
    document.querySelectorAll('.card').forEach(card => {
      const show = Object.entries(active).every(([attr, vs]) => vs.includes(card.getAttribute(attr)));
      card.classList.toggle('showing', show);
      card.classList.toggle('hiding', !show);
    });
  }

  // Card click toggles rarity filter
  document.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const attr = 'data-rarity';
    const val = card.getAttribute(attr); if (!val) return;
    const sec = container.querySelector(`.section[data-filter-attribute="${attr}"]`);
    const cbs = sec.querySelectorAll('input.filter-checkbox');
    const single = Array.from(cbs).filter(cb => cb.checked);
    if (single.length === 1 && single[0].value === val) cbs.forEach(cb => cb.checked = true), sec.querySelector('input:not(.filter-checkbox)').checked = true;
    else cbs.forEach(cb => cb.checked = cb.value === val), sec.querySelector('input:not(.filter-checkbox)').checked = false;
    filterCards();
  });

  // Draggable panel
  (function() {
    let drag = false, x=0, y=0;
    container.addEventListener('mousedown', e => {
      if (!e.target.closest('input') && !e.target.closest('label')) {
        drag=true; const r=container.getBoundingClientRect(); x=e.clientX-r.left; y=e.clientY-r.top; e.preventDefault();
      }
    });
    document.addEventListener('mousemove', e => drag && (container.style.left=`${e.clientX-x}px`, container.style.top=`${e.clientY-y}px`, container.style.bottom='auto', container.style.right='auto'));
    document.addEventListener('mouseup', ()=>drag=false);
  })();

  filterCards();
})();
