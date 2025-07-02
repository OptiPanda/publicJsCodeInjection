// ==UserScript==
// @name        Compare 4 Trade with a friend on Pokemon-Zone
// @namespace   publicJsCodeInjectionByOptiPanda
// @match       https://www.pokemon-zone.com/players/*
// @grant       none
// @version     1.0
// @updateURL   https://raw.githubusercontent.com/OptiPanda/publicJsCodeInjection/refs/heads/main/CompareWithFriendForPokemonZone.js
// @downloadURL https://raw.githubusercontent.com/OptiPanda/publicJsCodeInjection/refs/heads/main/CompareWithFriendForPokemonZone.js
// @author      OptiPanda w/ ChatGPT
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
    allCards = allCards.filter(c => ["C", "CU", "CR", "CRR", "CAR"].includes(c.rarity) && c.expansion.expansionId != latestExpansion);
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

  const opentRarityIcon = `<span class="rarity-icon rarity-icon--rarity-R" style="height: 20px;">`;
  const diamondSpan = `<span class="rarity-icon__icon rarity-icon__icon--diamond"></span>`;
  const starSpan = `<span class="rarity-icon__icon rarity-icon__icon--star"></span>`;

  let rarity = {
    "C": `${opentRarityIcon}${diamondSpan}</span>`,
    "CU": `${opentRarityIcon}${diamondSpan.repeat(2)}</span>`,
    "CR": `${opentRarityIcon}${diamondSpan.repeat(3)}</span>`,
    "CRR": `${opentRarityIcon}${diamondSpan.repeat(4)}</span>`,
    "CAR": `${opentRarityIcon}${starSpan}</span>`
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
    .card-result {
      margin-bottom: 8px;
      border: 1px solid #eee; border-radius: 4px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .card-name {
      width: 70px;
      justify-content: left;
    }
    .card-result .rarity-icon {
      width: 55px;
      justify-content: center;
    }
    .card-result span,
    .card-result .rarity-icon {
      display: inline-flex; align-items: center;
    }
    #compareModal .close-btn { position: absolute; top: 8px; right: 8px;
      background: transparent; border: none; font-size: 18px; cursor: pointer; }

    #tabContainer { display:flex; margin-bottom:8px; }
    #tabContainer.hidden { display:none; }
    #tabContainer button { flex:1; padding:6px; cursor:pointer; border:none; background:#f0f0f0; }
    #tabContainer button.active { background:white; border-bottom:2px solid #FFC424; }
    .result-section { display:none; max-height:50vh; overflow-y:auto; }
    .result-section.active { display:block; }

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
    <h3>Can we trade cards ?</h3>
    <input type="text" id="player1Id" value="${player1Default}" hidden>
    <input type="text" id="player2Id" placeholder="Friend ID" maxlength="16">
    <button id="compareBtn" class="button button--primary">Compare</button>
    <div id="tabContainer" class="hidden">
      <button id="tabYou" class="active">For you</button>
      <button id="tabHim">For him</button>
    </div>
    <div id="resultYou" class="result-section active"></div>
    <div id="resultHim" class="result-section"></div>
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

  // paste with dashes
  document.getElementById("player2Id").addEventListener("paste", (event) => {
    event.preventDefault();
    let paste = (event.clipboardData || window.clipboardData).getData("text");
    event.target.value = paste.replace(/[-]+/g, '');
  });


  // Fetch cartes joueur
  async function fetchPlayerCards(p) {
    const res = await fetch(`https://www.pokemon-zone.com/api/players/${p}`);
    if (!res.ok) {
      throw new Error(`Error fetch player ${p}`)
    };
    const json = await res.json();

    return json.data;
  }

  // Comparaison
  async function comparePlayers(p1, p2) {
    const [dataPlayer1, dataPlayer2] = await Promise.all([
      fetchPlayerCards(p1), fetchPlayerCards(p2)
    ]);
    const player1 = dataPlayer1.player;
    const player2 = dataPlayer2.player;
    const cardsPlayer1 = dataPlayer1.cards;
    const cardsPlayer2 = dataPlayer2.cards;

    const keys1 = new Set(cardsPlayer1.map(c => c.cardId));
    const keys2 = new Set(cardsPlayer2.map(c => c.cardId));

    const missingCardsPlayer1 = allCards.filter(def => !keys1.has(def.cardId) && cardsPlayer2.some(x => x.cardId === def.cardId && x.amount > 1));
    const missingCardsPlayer2 = allCards.filter(def => !keys2.has(def.cardId) && cardsPlayer1.some(x => x.cardId === def.cardId && x.amount > 1));
    return { player1, missingCardsPlayer1, player2, missingCardsPlayer2 };
  }

  // Affichage résultats
  document.querySelectorAll('#tabContainer button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tabContainer button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.result-section').forEach(sec => sec.classList.remove('active'));
      document.getElementById(btn.id === 'tabYou' ? 'resultYou' : 'resultHim').classList.add('active');
    });
  });

  // Bouton Compare
  modal.querySelector('#compareBtn').addEventListener('click', async () => {
    const p1 = modal.querySelector('#player1Id').value.trim();
    const p2 = modal.querySelector('#player2Id').value.trim();

    const youDiv = document.getElementById('resultYou');
    const himDiv = document.getElementById('resultHim');

    youDiv.innerHTML = himDiv.innerHTML = 'Loading...';

    if (!p1 || !p2) {
      return youDiv.textContent = 'Please enter Friend ID.';
    }

    try {
      const { player1, missingCardsPlayer1, player2, missingCardsPlayer2 } = await comparePlayers(p1, p2);

      const tabYou = document.getElementById('tabYou');
      tabYou.innerHTML = `For ${player1.name}`;
      const tabHim = document.getElementById('tabHim');
      tabHim.innerHTML = `For ${player2.name}`;
      const switchTab = document.getElementById('tabContainer').classList?.remove('hidden');

      [youDiv, himDiv].forEach(div => div.innerHTML = '');

      missingCardsPlayer1.forEach(def => {
        const d = document.createElement('div'); d.className = 'card-result';
        d.innerHTML = `<span class="card-name">${def.name}</span>${rarity[def.rarity]}<span>(${def.expansion.expansionId})</span>`;
        youDiv.appendChild(d);
      });

      missingCardsPlayer2.forEach(def => {
        const d = document.createElement('div'); d.className = 'card-result';
        d.innerHTML = `<span class="card-name">${def.name}</span>${rarity[def.rarity]}<span>(${def.expansion.expansionId})</span>`;
        himDiv.appendChild(d);
      });

      if (missingCardsPlayer1.length === 0) {
        youDiv.textContent = `${player2.name} has nothing ${player1.name} needs!`;
      }
      if (missingCardsPlayer2.length === 0) {
        himDiv.textContent = `${player1.name} has nothing ${player2.name} needs!`;
      }
    } catch (err) {
      youDiv.textContent = himDiv.textContent = `Error : ${err.message}`;
    }
  });
})();
