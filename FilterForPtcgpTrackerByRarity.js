(function () {
  // Styles de l'interface
  const style = document.createElement('style');
  style.textContent = `
    #rarity-filter {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
      padding: 10px;
      font-family: sans-serif;
      z-index: 9999;
    }
    #rarity-filter label {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
    }
  `;
  document.head.appendChild(style);

  // Valeurs de rareté
  const rarities = ["♢", "♢♢", "♢♢♢", "♢♢♢♢", "☆"];

  // Créer l'interface
  const container = document.createElement('div');
  container.id = 'rarity-filter';
  container.innerHTML = `<strong>Filtrer par rareté</strong>`;

  rarities.forEach(rarity => {
    //const id = `filter-${btoa(rarity).replace(/=/g, '')}`;
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" value="${rarity}" checked>
      ${rarity}
    `;
    container.appendChild(label);
  });

  document.body.appendChild(container);

  // Fonction de filtrage
  function filterCards() {
    const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);

    document.querySelectorAll('.card').forEach(card => {
      const rarity = card.getAttribute('data-rarity');
      card.style.display = checked.includes(rarity) ? '' : 'none';
    });
  }

  // Attacher les événements
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', filterCards);
  });

  // Lancer une première fois
  filterCards();
})();
