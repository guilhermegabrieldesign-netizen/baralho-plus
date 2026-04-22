const SUITS = [
  { key: 'paus', symbol: 'C', color: 'black', order: 4 },
  { key: 'copas', symbol: 'H', color: 'red', order: 3 },
  { key: 'espadas', symbol: 'S', color: 'black', order: 2 },
  { key: 'ouros', symbol: 'D', color: 'red', order: 1 }
];

const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const BASE_STRENGTH = { '4': 1, '5': 2, '6': 3, '7': 4, Q: 5, J: 6, K: 7, A: 8, '2': 9, '3': 10 };
const PAULISTA_POWER = {
  '4-paus': 100,
  '7-copas': 99,
  'A-espadas': 98,
  '7-ouros': 97
};

const VARIANTS = {
  paulista: {
    key: 'paulista',
    title: 'Truco Paulista',
    description: 'Manilhas fixas, mesa 2 x 2 e leitura classica.',
    opponentTop: 'Norte IA',
    opponentRight: 'Leste IA',
    partner: 'Parceiro IA'
  },
  mineiro: {
    key: 'mineiro',
    title: 'Truco Mineiro',
    description: 'Com vira e manilha dinamica a cada rodada.',
    opponentTop: 'Norte IA',
    opponentRight: 'Leste IA',
    partner: 'Parceiro IA'
  }
};

const PLAYERS = [
  { id: 'me', team: 'us', seat: 'bottom', label: 'Voce' },
  { id: 'top', team: 'them', seat: 'top', label: 'Norte IA' },
  { id: 'partner', team: 'us', seat: 'left', label: 'Parceiro IA' },
  { id: 'right', team: 'them', seat: 'right', label: 'Leste IA' }
];

const gameState = {
  variant: 'paulista',
  hands: { me: [], top: [], partner: [], right: [] },
  centerCards: {},
  trickWinners: [],
  myScore: 0,
  theirScore: 0,
  currentBet: 1,
  phase: 'playing',
  viraCard: null,
  leadIndex: 0,
  currentTurnIndex: 0,
  roundNumber: 1,
  waitingForRoundReset: false
};

const TrucoGame = {
  async init() {
    await App.init();
    this.cacheElements();
    this.bindEvents();
    this.applyVariantFromUrl();
    this.setVariant(gameState.variant, false);
    this.startRound();
  },

  cacheElements() {
    this.myHandEl = document.getElementById('my-hand');
    this.turnStatusEl = document.getElementById('turn-status');
    this.tableStatusEl = document.getElementById('table-status');
    this.myTurnLabelEl = document.getElementById('my-turn-label');
    this.turnChipEl = document.getElementById('turn-chip');
    this.roundEl = document.getElementById('round-score');
    this.scoreEl = document.getElementById('match-score');
    this.betEl = document.getElementById('current-bet');
    this.variantTitleEl = document.getElementById('variant-title');
    this.variantDescriptionEl = document.getElementById('variant-description');
    this.viraBadgeEl = document.getElementById('vira-badge');
    this.trucoButton = document.getElementById('truco-button');
    this.acceptButton = document.getElementById('accept-button');
    this.runButton = document.getElementById('run-button');
    this.waitingButton = document.getElementById('waiting-button');
    this.variantButtons = {
      paulista: document.getElementById('variant-paulista'),
      mineiro: document.getElementById('variant-mineiro')
    };
    this.handEls = {
      top: document.getElementById('opponent-top-cards'),
      partner: document.getElementById('partner-cards'),
      right: document.getElementById('opponent-right-cards')
    };
    this.centerSlots = {
      top: document.getElementById('center-top'),
      left: document.getElementById('center-left'),
      right: document.getElementById('center-right'),
      bottom: document.getElementById('center-bottom')
    };
    this.trickDots = [
      document.getElementById('trick-1'),
      document.getElementById('trick-2'),
      document.getElementById('trick-3')
    ];
    this.nameEls = {
      top: document.getElementById('opponent-top-name'),
      right: document.getElementById('opponent-right-name'),
      partner: document.getElementById('partner-name')
    };
  },

  bindEvents() {
    this.trucoButton.addEventListener('click', () => {
      if (!this.isMyTurn()) return;
      gameState.currentBet = Math.min([3, 6, 9, 12].find((value) => value > gameState.currentBet) || 12, 12);
      this.turnStatusEl.textContent = `Truco valendo ${gameState.currentBet} pontos.`;
      this.betEl.textContent = `${gameState.currentBet} pontos`;
      App.showFeedback(`Truco valendo ${gameState.currentBet} pontos`, 'success');
    });

    this.runButton.addEventListener('click', async () => {
      gameState.theirScore += gameState.currentBet;
      this.turnStatusEl.textContent = 'Voce correu da rodada.';
      await this.finishMatchIfNeeded(false);
      this.startRound();
    });

    this.acceptButton.addEventListener('click', () => {
      gameState.phase = 'playing';
      this.render();
    });

    this.variantButtons.paulista.addEventListener('click', () => this.setVariant('paulista'));
    this.variantButtons.mineiro.addEventListener('click', () => this.setVariant('mineiro'));
  },

  applyVariantFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const variant = params.get('variant');
    if (variant && VARIANTS[variant]) gameState.variant = variant;
  },

  setVariant(variant, restart = true) {
    if (!VARIANTS[variant]) return;
    gameState.variant = variant;
    this.variantTitleEl.textContent = VARIANTS[variant].title;
    this.variantDescriptionEl.textContent = VARIANTS[variant].description;
    this.nameEls.top.textContent = VARIANTS[variant].opponentTop;
    this.nameEls.right.textContent = VARIANTS[variant].opponentRight;
    this.nameEls.partner.textContent = VARIANTS[variant].partner;

    Object.entries(this.variantButtons).forEach(([key, button]) => {
      button.classList.toggle('active', key === variant);
    });

    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant);
    window.history.replaceState({}, '', url);

    if (restart) {
      gameState.myScore = 0;
      gameState.theirScore = 0;
      App.showFeedback(`${VARIANTS[variant].title} selecionado`, 'success');
      this.startRound();
    }
  },

  createDeck() {
    const deck = [];
    SUITS.forEach((suit) => {
      RANKS.forEach((rank) => {
        deck.push({ rank, suit: suit.key, symbol: suit.symbol, color: suit.color });
      });
    });
    return deck;
  },

  shuffle(deck) {
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [deck[index], deck[randomIndex]] = [deck[randomIndex], deck[index]];
    }
    return deck;
  },

  getNextRank(rank) {
    const currentIndex = RANKS.indexOf(rank);
    return RANKS[(currentIndex + 1) % RANKS.length];
  },

  dealHands() {
    const deck = this.shuffle(this.createDeck());
    gameState.hands.me = deck.slice(0, 3);
    gameState.hands.top = deck.slice(3, 6);
    gameState.hands.partner = deck.slice(6, 9);
    gameState.hands.right = deck.slice(9, 12);
    gameState.viraCard = gameState.variant === 'mineiro' ? deck[12] : null;
  },

  getCardStrength(card) {
    if (gameState.variant === 'paulista') {
      return PAULISTA_POWER[`${card.rank}-${card.suit}`] || BASE_STRENGTH[card.rank];
    }

    const manilhaRank = gameState.viraCard ? this.getNextRank(gameState.viraCard.rank) : null;
    if (card.rank === manilhaRank) {
      const suit = SUITS.find((item) => item.key === card.suit);
      return 200 + (suit ? suit.order : 0);
    }

    return BASE_STRENGTH[card.rank];
  },

  isMyTurn() {
    return PLAYERS[gameState.currentTurnIndex].id === 'me';
  },

  startRound() {
    this.dealHands();
    gameState.centerCards = {};
    gameState.trickWinners = [];
    gameState.currentBet = 1;
    gameState.phase = 'playing';
    gameState.roundNumber = 1;
    gameState.waitingForRoundReset = false;
    gameState.leadIndex = gameState.myScore <= gameState.theirScore ? 0 : 1;
    gameState.currentTurnIndex = gameState.leadIndex;
    this.render();
    this.advanceBotsIfNeeded();
  },

  playMyCard(index) {
    if (!this.isMyTurn() || gameState.waitingForRoundReset) return;
    const card = gameState.hands.me.splice(index, 1)[0];
    if (!card) return;
    this.placeCard('me', card);
  },

  placeCard(playerId, card) {
    const player = PLAYERS.find((item) => item.id === playerId);
    gameState.centerCards[playerId] = { ...card, playerId, seat: player.seat, team: player.team };
    gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % PLAYERS.length;
    this.render();

    if (Object.keys(gameState.centerCards).length === 4) {
      setTimeout(() => this.resolveTrick(), 900);
      return;
    }

    this.advanceBotsIfNeeded();
  },

  advanceBotsIfNeeded() {
    if (gameState.waitingForRoundReset) return;
    if (this.isMyTurn()) {
      this.turnStatusEl.textContent = 'Sua vez';
      this.myTurnLabelEl.textContent = 'Toque em uma carta para jogar.';
      this.turnChipEl.textContent = 'Sua vez';
      return;
    }

    const currentPlayer = PLAYERS[gameState.currentTurnIndex];
    this.turnStatusEl.textContent = `Aguardando ${currentPlayer.label}...`;
    this.myTurnLabelEl.textContent = 'Os demais jogadores estao jogando esta mao.';
    this.turnChipEl.textContent = 'Aguardando';

    setTimeout(() => {
      if (this.isMyTurn() || gameState.waitingForRoundReset) return;
      const bot = PLAYERS[gameState.currentTurnIndex];
      const hand = gameState.hands[bot.id];
      const cardIndex = Math.floor(Math.random() * hand.length);
      const card = hand.splice(cardIndex, 1)[0];
      this.placeCard(bot.id, card);
    }, 900);
  },

  resolveTrick() {
    const played = Object.values(gameState.centerCards);
    let winnerCard = played[0];

    played.slice(1).forEach((card) => {
      if (this.getCardStrength(card) > this.getCardStrength(winnerCard)) {
        winnerCard = card;
      }
    });

    gameState.trickWinners.push(winnerCard.team);
    gameState.leadIndex = PLAYERS.findIndex((player) => player.id === winnerCard.playerId);
    gameState.currentTurnIndex = gameState.leadIndex;
    gameState.waitingForRoundReset = true;

    this.turnStatusEl.textContent = winnerCard.team === 'us'
      ? `${winnerCard.playerId === 'partner' ? 'Seu parceiro' : 'Nos'} vencemos a ${gameState.roundNumber}a mao.`
      : `Eles venceram a ${gameState.roundNumber}a mao.`;

    this.render();

    const usWins = gameState.trickWinners.filter((team) => team === 'us').length;
    const themWins = gameState.trickWinners.filter((team) => team === 'them').length;
    const roundFinished = usWins === 2 || themWins === 2 || gameState.trickWinners.length === 3;

    setTimeout(() => {
      gameState.centerCards = {};
      gameState.roundNumber += 1;
      gameState.waitingForRoundReset = false;

      if (roundFinished) {
        this.finishRound(usWins >= themWins);
        return;
      }

      this.render();
      this.advanceBotsIfNeeded();
    }, 1200);
  },

  async finishRound(ourTeamWon) {
    if (ourTeamWon) {
      gameState.myScore += gameState.currentBet;
    } else {
      gameState.theirScore += gameState.currentBet;
    }

    this.turnStatusEl.textContent = ourTeamWon ? 'Nos vencemos a rodada.' : 'Eles venceram a rodada.';
    this.tableStatusEl.textContent = ourTeamWon
      ? 'Mesa limpa para a proxima rodada do nosso time.'
      : 'Mesa limpa para a proxima rodada do time adversario.';

    await this.finishMatchIfNeeded(ourTeamWon);
    this.render();

    setTimeout(() => {
      this.startRound();
    }, 1400);
  },

  async finishMatchIfNeeded(didWinMatch) {
    if (gameState.myScore < 12 && gameState.theirScore < 12) return;
    const delta = didWinMatch ? 120 : -60;
    const gameType = `truco-${gameState.variant}`;

    try {
      if (didWinMatch) {
        await App.fetchJson('/coins/add', {
          method: 'POST',
          body: JSON.stringify({ amount: 120, type: 'win', game: gameType })
        });
        App.showFeedback('+120 moedinhas', 'success');
      } else {
        await App.fetchJson('/coins/subtract', {
          method: 'POST',
          body: JSON.stringify({ amount: 60, type: 'loss', game: gameType })
        });
        App.showFeedback('-60 moedinhas', 'danger');
      }

      await App.fetchJson('/games/session', {
        method: 'POST',
        body: JSON.stringify({
          gameType,
          result: didWinMatch ? 'win' : 'loss',
          coinsDelta: delta,
          durationSeconds: 150
        })
      });
      await App.refreshBalance();
    } catch (error) {
      App.showFeedback(error.message, 'danger');
    }

    gameState.myScore = 0;
    gameState.theirScore = 0;
  },

  renderCard(card, clickable, index) {
    const classes = ['playing-card', card.color === 'red' ? 'red' : '', clickable ? 'clickable' : '']
      .filter(Boolean)
      .join(' ');
    return `
      <button class="${classes}" ${clickable ? `data-card-index="${index}"` : 'disabled'}>
        <span class="card-rank-top">${card.rank}<small>${card.symbol}</small></span>
        <span class="card-suit-center">${card.symbol}</span>
        <span class="card-rank-bottom">${card.rank}<small>${card.symbol}</small></span>
      </button>
    `;
  },

  renderBackCards(container, amount) {
    container.innerHTML = new Array(amount).fill('<div class="card-back card-back-mini"></div>').join('');
  },

  renderCenterSlots() {
    Object.entries(this.centerSlots).forEach(([seat, element]) => {
      const entry = Object.values(gameState.centerCards).find((card) => card.seat === seat);
      if (!entry) {
        const labels = { top: 'Topo', left: 'Par', right: 'Adv', bottom: 'Voce' };
        element.innerHTML = `<span class="subtle">${labels[seat]}</span>`;
        return;
      }
      element.innerHTML = this.renderCard(entry, false, 0);
    });
  },

  renderTrickTracker() {
    this.trickDots.forEach((dot, index) => {
      dot.className = 'trick-dot';
      const winner = gameState.trickWinners[index];
      if (winner === 'us') dot.classList.add('us');
      if (winner === 'them') dot.classList.add('them');
    });
  },

  renderVira() {
    if (gameState.variant !== 'mineiro' || !gameState.viraCard) {
      this.viraBadgeEl.classList.add('hidden');
      this.viraBadgeEl.textContent = 'Vira: --';
      return;
    }

    const manilhaRank = this.getNextRank(gameState.viraCard.rank);
    this.viraBadgeEl.classList.remove('hidden');
    this.viraBadgeEl.textContent = `Vira: ${gameState.viraCard.rank}${gameState.viraCard.symbol} | Manilha: ${manilhaRank}`;
  },

  render() {
    this.scoreEl.textContent = `Nos ${gameState.myScore} x Eles ${gameState.theirScore}`;
    this.roundEl.textContent = `${gameState.trickWinners.filter((team) => team === 'us').length} x ${gameState.trickWinners.filter((team) => team === 'them').length}`;
    this.betEl.textContent = `${gameState.currentBet} ponto${gameState.currentBet > 1 ? 's' : ''}`;
    this.tableStatusEl.textContent = `Mao ${Math.min(gameState.roundNumber, 3)} de 3 | Lidera: ${PLAYERS[gameState.leadIndex].label}`;

    this.renderVira();
    this.renderTrickTracker();
    this.renderBackCards(this.handEls.top, gameState.hands.top.length);
    this.renderBackCards(this.handEls.partner, gameState.hands.partner.length);
    this.renderBackCards(this.handEls.right, gameState.hands.right.length);
    this.renderCenterSlots();

    this.myHandEl.innerHTML = gameState.hands.me
      .map((card, index) => this.renderCard(card, this.isMyTurn() && !gameState.waitingForRoundReset, index))
      .join('');

    this.myHandEl.querySelectorAll('[data-card-index]').forEach((button) => {
      button.addEventListener('click', () => this.playMyCard(Number(button.dataset.cardIndex)));
    });

    if (this.isMyTurn() && !gameState.waitingForRoundReset) {
      this.turnChipEl.textContent = 'Sua vez';
      this.turnStatusEl.textContent = 'Sua vez';
      this.myTurnLabelEl.textContent = 'Toque em uma carta para jogar.';
    }

    this.trucoButton.classList.toggle('hidden', !this.isMyTurn() || gameState.waitingForRoundReset);
    this.waitingButton.classList.toggle('hidden', this.isMyTurn() && !gameState.waitingForRoundReset);
  }
};

window.TrucoGame = TrucoGame;
