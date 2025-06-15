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

(function () {
  function getUniqueAttributeValues(selector, attribute) {
    const values = new Set();
    document.querySelectorAll(selector).forEach(el => {
      const val = el.getAttribute(attribute);
      if (val) values.add(val);
    });
    return Array.from(values).sort();
  }

  // === STYLES ===
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    .cards .card {
      display: none;
    }
    .cards .card.did-fade-in {
      display: block;
    }
    .cards .card.showing {
      display: block;
      animation: fade-in 0.5s ease;
    }
    .cards .card.hiding.did-fade-in {
      display: block;
      animation: fade-out 0.2s ease;
    }

    #filter-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      background: var(--pico-background-color);
      border: var(--pico-border-width) solid var(--pico-border-color);
      border-radius: var(--pico-border-radius);
      color: var(--filter-btn-color, white);
      padding: 10px 14px;
      font-size: 14px;
      cursor: pointer;
    }

    #dynamic-filter {
      position: fixed;
      bottom: 70px;
      right: 20px;
      background: var(--pico-form-element-background-color, white);
      color: var(--pico-form-element-color, #000);
      border: 1px solid var(--pico-form-element-border-color, #ccc);
      border-radius: 8px;
      padding: 10px;
      z-index: 9999;
      max-height: 80vh;
      overflow-y: auto;
      font-size: 14px;
      display: none;
      cursor: move;
      user-select: none;
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('animationstart', function (e) {
    if (e.animationName === 'fade-in') {
      e.target.classList.add('did-fade-in');
    }
  });

  document.addEventListener('animationend', function (e) {
    if (e.animationName === 'fade-out') {
      e.target.classList.remove('did-fade-in');
    }
  });

  const toggleButton = document.createElement('button');
  toggleButton.id = 'filter-toggle';
  toggleButton.textContent = '⚙️ Filters';
  document.body.appendChild(toggleButton);

  const container = document.createElement('div');
  container.id = 'dynamic-filter';
  document.body.appendChild(container);

  const rarityValues = getUniqueAttributeValues('.card', 'data-rarity');
  const setValues = getUniqueAttributeValues('.card', 'data-set');

  function createFilterSection(title, attribute, values) {
    const section = document.createElement('div');
    section.className = 'section';
    section.dataset.filterAttribute = attribute;

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = title;
    section.appendChild(sectionTitle);

    const selectAllLabel = document.createElement('label');
    selectAllLabel.className = 'select-all';
    selectAllLabel.innerHTML = `
      <input type="checkbox" checked>
      All
    `;
    section.appendChild(selectAllLabel);

    values.forEach(value => {
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="checkbox" class="filter-checkbox" data-group="${attribute}" value="${value}" checked>
        ${value}
      `;
      section.appendChild(label);
    });

    const selectAll = selectAllLabel.querySelector('input');
    selectAll.addEventListener('change', () => {
      const checkboxes = section.querySelectorAll('input.filter-checkbox');
      checkboxes.forEach(cb => (cb.checked = selectAll.checked));
      filterCards();
    });

    section.addEventListener('change', (e) => {
      if (e.target.classList.contains('filter-checkbox')) {
        const checkboxes = section.querySelectorAll('input.filter-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        selectAll.checked = allChecked;
      }
    });

    return section;
  }

  container.appendChild(createFilterSection('Rarity', 'data-rarity', rarityValues));
  container.appendChild(createFilterSection('Set', 'data-set', setValues));

  function filterCards() {
    const filters = {};
    container.querySelectorAll('.section').forEach(section => {
      const attr = section.dataset.filterAttribute;
      const checkedValues = Array.from(section.querySelectorAll('input.filter-checkbox:checked'))
        .map(cb => cb.value);
      filters[attr] = checkedValues;
    });

    document.querySelectorAll('.card').forEach(card => {
      const match = Object.entries(filters).every(([attr, allowed]) => {
        const val = card.getAttribute(attr);
        return allowed.includes(val);
      });

      if (match) {
        card.classList.remove('hiding');
        card.classList.add('showing');
      } else {
        card.classList.remove('showing');
        card.classList.add('hiding');
      }
    });
  }

  container.addEventListener('change', filterCards);

  toggleButton.addEventListener('click', () => {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;

    const rarity = card.getAttribute('data-rarity');
    if (!rarity) return;

    const section = container.querySelector('.section[data-filter-attribute="data-rarity"]');
    if (!section) return;

    const checkboxes = section.querySelectorAll('input.filter-checkbox');
    const onlyChecked = Array.from(checkboxes).filter(cb => cb.checked);

    if (onlyChecked.length === 1 && onlyChecked[0].value === rarity) {
      checkboxes.forEach(cb => cb.checked = true);
      section.querySelector('input[type="checkbox"]:not(.filter-checkbox)').checked = true;
    } else {
      checkboxes.forEach(cb => {
        cb.checked = (cb.value === rarity);
      });
      section.querySelector('input[type="checkbox"]:not(.filter-checkbox)').checked = false;
    }

    filterCards();
  });

  (function makeFilterDraggable() {
    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    container.addEventListener('mousedown', (e) => {
      if (!e.target.closest('input') && !e.target.closest('label')) {
        isDragging = true;
        const rect = container.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        container.style.left = (e.clientX - offsetX) + 'px';
        container.style.top = (e.clientY - offsetY) + 'px';
        container.style.bottom = 'auto';
        container.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  })();

  filterCards();
})();
