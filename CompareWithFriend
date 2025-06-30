// ==UserScript==
// @name        Compare with a friend
// @namespace   Violentmonkey Scripts
// @match       https://www.pokemon-zone.com/players/*/cards/*
// @grant       none
// @version     1.0
// @author      -
// @description 30/06/2025 22:14:58
// ==/UserScript==

// Script pour injecter une fenêtre modale et bouton toggle
(async () => {
  // Charger la liste complète des cartes
  let allCards = [];
  try {
    const resAll = await fetch('https://www.pokemon-zone.com/api/game/game-data/');
    if (!resAll.ok) throw new Error('Erreur récupération all cards');
    const jsonAll = await resAll.json();
    allCards = jsonAll.data.cards.filter(c => !c.isPromotion);
    const latestExpansion = [...(new Set(allCards.map(c => c.expansion.expansionId)))].sort().pop();
    allCards = allCards.filter(c => ["C","CU","CR","CRR","CAR"].includes(c.rarity) && c.expansion.expansionId != latestExpansion);
  } catch (e) {
    console.error('Impossible de charger allCards :', e);
  }

  // Récupérer le playerId1 depuis l'URL
  let player1Default = '';
  try {
    const match = window.location.href.match(/players\/([^\/]+)\/cards/);
    if (match) player1Default = match[1];
  } catch (e) {
    console.warn('Impossible d\'extraire player1Id de l\'URL :', e);
  }

  let rarity = {
    "C" : '<span class="rarity-icon rarity-icon--rarity-R " style="height: 20px;"><span class="rarity-icon__icon rarity-icon__icon--diamond"></span></span>',
    "CU" : '<span class="rarity-icon rarity-icon--rarity-R " style="height: 20px;">'+'<span class="rarity-icon__icon rarity-icon__icon--diamond"></span>'.repeat(2)+'</span>',
    "CR" : '<span class="rarity-icon rarity-icon--rarity-R " style="height: 20px;">'+'<span class="rarity-icon__icon rarity-icon__icon--diamond"></span>'.repeat(3)+'</span>',
    "CRR" : '<span class="rarity-icon rarity-icon--rarity-R " style="height: 20px;">'+'<span class="rarity-icon__icon rarity-icon__icon--diamond"></span>'.repeat(4)+'</span>',
    "CAR" : '<span class="rarity-icon rarity-icon--rarity-R " style="height: 20px;"><span class="rarity-icon__icon rarity-icon__icon--star"></span>'
  }

  // Styles pour modal et bouton toggle
  const style = document.createElement('style');
  style.textContent = `
    #compareModal { position: fixed !important; bottom: 65px; right: 20px; left: unset; top: unset; width: 320px; height: fit-content;
      padding: 16px; z-index: 10000; display: none; }
    #compareModal h3 { margin: 0 0 8px; font-size: 18px; }
    #compareModal input { width: 100%; margin-bottom: 8px; padding: 6px;
      box-sizing: border-box; font-size: 14px; }
    #compareModal button { width: 100%; padding: 8px;
      font-size: 14px; cursor: pointer; margin-bottom: 8px; }
    #compareResults { max-height: 70vh; overflow-y: auto; font-size: 14px; }
    #compareResults .card-result {
      margin-bottom: 8px;
      border: 1px solid #eee; border-radius: 4px;
      display: flex; align-items: center; justify-content: space-between;
    }
    #compareResults .card-name {
      width: 70px;
      justify-content: left;
    }
    #compareResults .card-result .rarity-icon {
      width: 55px;
      justify-content: center;
    }
    #compareResults .card-result span,
    #compareResults .card-result .rarity-icon {
      display: inline-flex; align-items: center;
    }
    #compareModal .close-btn { position: absolute; top: 8px; right: 8px;
      background: transparent; border: none; font-size: 18px; cursor: pointer; }
    #toggleCompareBtn { position: fixed; bottom: 20px; right: 20px; z-index: 10000; }
  `;
  document.head.appendChild(style);

  // Création du bouton toggle
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'toggleCompareBtn';
  toggleBtn.innerHTML = 'Trade';
  toggleBtn.className = "button button--size-sm"
  document.body.appendChild(toggleBtn);

  // Création de la modale
  const modal = document.createElement('div');
  modal.className = "modal modal-dialog-scrollable modal-content";
  modal.id = 'compareModal';
  modal.innerHTML = `
    <button class="close-btn"></button>
    <h3>Does my friend have cards for me ?</h3>
    <input type="text" id="player1Id" value="${player1Default}" hidden>
    <input type="text" id="player2Id" placeholder="Friend ID" maxlength="16">
    <button id="compareBtn" class="button button--primary">Compare</button>
    <div id="compareResults"></div>
  `;
  document.body.appendChild(modal);

  // Toggle modal
  toggleBtn.addEventListener('click', () => {
    modal.style.display = modal.style.display === 'none' || !modal.style.display ? 'block' : 'none';
    toggleBtn.classList.toggle('button--primary');
  });

  // Fermeture via croix
  modal.querySelector('.close-btn').addEventListener('click', () => {
    modal.style.display = 'none';
    toggleBtn.classList.toggle('button--primary');
  });

  // Fetch cartes joueur
  async function fetchPlayerCards(p) {
    const res = await fetch(`https://www.pokemon-zone.com/api/players/${p}`);
    if (!res.ok) throw new Error(`Erreur fetch player ${p}`);
    const json = await res.json();
    return json.data.cards;
  }

  // Comparaison
  async function comparePlayers(p1, p2) {
    const [cards1, cards2] = await Promise.all([
      fetchPlayerCards(p1), fetchPlayerCards(p2)
    ]);
    const keys1 = new Set(cards1.map(c => c.cardId));
    return allCards.filter(def =>
      !keys1.has(def.cardId) &&
      cards2.some(c2 => c2.cardId === def.cardId && c2.amount > 1)
    );
  }

  // Affichage résultats
  modal.querySelector('#compareBtn').addEventListener('click', async () => {
    const p1 = modal.querySelector('#player1Id').value.trim();
    const p2 = modal.querySelector('#player2Id').value.trim();
    const resultsDiv = modal.querySelector('#compareResults');
    resultsDiv.innerHTML = 'Chargement...';
    if (!p1 || !p2) return resultsDiv.textContent = 'Veuillez saisir deux IDs de joueur.';
    try {
      const missingDefs = await comparePlayers(p1, p2);
      resultsDiv.innerHTML = '';
      if (missingDefs.length === 0) {
        resultsDiv.textContent = 'Aucune carte manquante trouvée.';
      } else {
        missingDefs.forEach(def => {
          const cardDiv = document.createElement('div');
          cardDiv.className = 'card-result';
          // Nom
          const nameSpan = document.createElement('span');
          nameSpan.textContent = def.name;
          nameSpan.className = 'card-name';
          cardDiv.appendChild(nameSpan);
          // Icônes de rareté
          cardDiv.insertAdjacentHTML('beforeend', rarity[def.rarity]);
          // Expansion ID
          const expSpan = document.createElement('span');
          expSpan.textContent = ` (${def.expansion.expansionId})`;
          cardDiv.appendChild(expSpan);
          resultsDiv.appendChild(cardDiv);
        });
      }
    } catch (err) {
      resultsDiv.textContent = `Erreur : ${err.message}`;
    }
  });
})();
