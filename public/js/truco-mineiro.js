const SUITS = {
  paus: { symbol: '♣', colorClass: 'naipe-paus' },
  copas: { symbol: '♥', colorClass: 'naipe-copas' },
  espadas: { symbol: '♠', colorClass: 'naipe-espadas' },
  ouros: { symbol: '♦', colorClass: 'naipe-ouros' }
};

const CARD_VALUES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const NORMAL_RANK = { '3': 10, '2': 9, A: 8, K: 7, J: 6, Q: 5, '7': 4, '6': 3, '5': 2, '4': 1 };
const PLAYER_ORDER = [0, 1, 2, 3];
const TEAM_BY_PLAYER = { 0: 'A', 1: 'B', 2: 'A', 3: 'B' };
const PLAYER_NAMES = { 0: 'Voce', 1: 'Adversario Esq', 2: 'Parceiro', 3: 'Adversario Dir' };
const TRUCO_STEPS = [1, 3, 6, 9, 12];

const gameState = {
  deck: [],
  hands: { 0: [], 1: [], 2: [], 3: [] },
  played: { 0: null, 1: null, 2: null, 3: null },
  roundResults: [],
  currentRound: 1,
  mao: -1,
  currentTurn: 0,
  firstOfRound: 0,
  scores: { A: 0, B: 0 },
  handValue: 1,
  trucoCalled: false,
  trucoBy: null,
  phase: 'loading',
  pendingTruco: null,
  highlightedPlayers: [],
  handInitialized: false,
  handLocked: false,
  pendingTimeouts: []
};

const TrucoGame = {
  async init() {
    await App.init();
    this.cacheElements();
    this.bindEvents();
    this.renderFixedPanel();
    this.showPreparingScreen();
  },

  cacheElements() {
    this.turnStatusEl = document.getElementById('turn-status');
    this.handMetaEl = document.getElementById('hand-meta');
    this.roundStatusEl = document.getElementById('round-status');
    this.currentValueLabelEl = document.getElementById('current-value-label');
    this.scoreAEl = document.getElementById('score-a');
    this.scoreBEl = document.getElementById('score-b');
    this.roundScoreEl = document.getElementById('round-score');
    this.myTurnLabelEl = document.getElementById('my-turn-label');
    this.turnChipEl = document.getElementById('turn-chip');
    this.trucoButton = document.getElementById('truco-button');
    this.acceptButton = document.getElementById('accept-button');
    this.raiseButton = document.getElementById('raise-button');
    this.runButton = document.getElementById('run-button');
    this.waitingButton = document.getElementById('waiting-button');
    this.myHandEl = document.getElementById('my-hand');
    this.fixedManilhasEl = document.getElementById('fixed-manilhas');
    this.trucoBannerEl = document.getElementById('truco-banner');
    this.roundToastEl = document.getElementById('round-toast');
    this.handResultModalEl = document.getElementById('hand-result-modal');
    this.handResultTextEl = document.getElementById('hand-result-text');
    this.preparingOverlayEl = document.getElementById('preparing-overlay');
    this.progressBarEl = document.getElementById('preparing-progress-bar');
    this.handsEls = {
      1: document.getElementById('player-cards-1'),
      2: document.getElementById('player-cards-2'),
      3: document.getElementById('player-cards-3')
    };
    this.avatarEls = {
      0: document.getElementById('avatar-0'),
      1: document.getElementById('avatar-1'),
      2: document.getElementById('avatar-2'),
      3: document.getElementById('avatar-3')
    };
    this.centerEls = {
      0: document.getElementById('center-bottom'),
      1: document.getElementById('center-left'),
      2: document.getElementById('center-top'),
      3: document.getElementById('center-right')
    };
    this.trickDots = [
      document.getElementById('trick-1'),
      document.getElementById('trick-2'),
      document.getElementById('trick-3')
    ];
  },

  bindEvents() {
    this.trucoButton.addEventListener('click', () => this.callTruco(0));
    this.acceptButton.addEventListener('click', () => this.respondTruco('accept'));
    this.raiseButton.addEventListener('click', () => this.respondTruco('raise'));
    this.runButton.addEventListener('click', () => {
      if (gameState.phase === 'truco_pending' && this.isHumanResponder()) {
        this.respondTruco('run');
        return;
      }
      if (gameState.phase === 'playing' && this.isHumanTurn()) {
        this.forceRun(0);
      }
    });
  },

  renderFixedPanel() {
    this.fixedManilhasEl.innerHTML = `
      <div class="manilha-item"><span>♣4</span><strong>Zap</strong></div>
      <div class="manilha-item"><span>♥7</span><strong>2a</strong></div>
      <div class="manilha-item"><span>♠A</span><strong>3a</strong></div>
      <div class="manilha-item"><span>♠7</span><strong>4a</strong></div>
    `;
  },

  resetPendingTimeouts() {
    gameState.pendingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    gameState.pendingTimeouts = [];
  },

  trackTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      gameState.pendingTimeouts = gameState.pendingTimeouts.filter((item) => item !== timeoutId);
      callback();
    }, delay);
    gameState.pendingTimeouts.push(timeoutId);
  },

  showPreparingScreen() {
    this.preparingOverlayEl.classList.remove('hidden');
    this.progressBarEl.style.width = '0%';
    this.trackTimeout(() => {
      this.progressBarEl.style.width = '52%';
    }, 300);
    this.trackTimeout(() => {
      this.progressBarEl.style.width = '100%';
    }, 1200);
    this.trackTimeout(() => {
      this.preparingOverlayEl.classList.add('hidden');
      this.initHand();
    }, 2000);
  },

  createDeck() {
    const deck = [];
    Object.keys(SUITS).forEach((suit) => {
      CARD_VALUES.forEach((value) => deck.push({ value, suit }));
    });
    return deck;
  },

  shuffleDeck(deck) {
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [deck[index], deck[randomIndex]] = [deck[randomIndex], deck[index]];
    }
    return deck;
  },

  initHand() {
    this.resetPendingTimeouts();
    gameState.handLocked = false;
    gameState.deck = this.shuffleDeck(this.createDeck());
    gameState.hands = { 0: [], 1: [], 2: [], 3: [] };
    gameState.played = { 0: null, 1: null, 2: null, 3: null };
    gameState.roundResults = [];
    gameState.highlightedPlayers = [];
    gameState.currentRound = 1;
    gameState.handValue = 1;
    gameState.trucoCalled = false;
    gameState.trucoBy = null;
    gameState.pendingTruco = null;
    gameState.phase = 'playing';

    if (!gameState.handInitialized) {
      gameState.mao = 0;
      gameState.handInitialized = true;
    } else {
      gameState.mao = (gameState.mao + 1) % 4;
    }

    for (let round = 0; round < 3; round += 1) {
      PLAYER_ORDER.forEach((playerIndex) => {
        gameState.hands[playerIndex].push(gameState.deck.shift());
      });
    }

    gameState.currentTurn = gameState.mao;
    gameState.firstOfRound = gameState.mao;

    this.turnStatusEl.textContent = `Mao: ${PLAYER_NAMES[gameState.mao]}`;
    this.handMetaEl.textContent = `Mao: ${PLAYER_NAMES[gameState.mao]} | Pe: ${PLAYER_NAMES[(gameState.mao + 3) % 4]}`;
    this.roundStatusEl.textContent = `Rodada 1 com saida de ${PLAYER_NAMES[gameState.firstOfRound]}.`;
    this.render();
    this.scheduleBotTurnIfNeeded();
  },

  getTeam(playerIndex) {
    return TEAM_BY_PLAYER[playerIndex];
  },

  getOppositeTeam(team) {
    return team === 'A' ? 'B' : 'A';
  },

  getCardId(card) {
    return `${card.value}-${card.suit}`;
  },

  getCardSymbol(card) {
    return SUITS[card.suit].symbol;
  },

  getCardPower(card) {
    if (card.value === '4' && card.suit === 'paus') return 14;
    if (card.value === '7' && card.suit === 'copas') return 13;
    if (card.value === 'A' && card.suit === 'espadas') return 12;
    if (card.value === '7' && card.suit === 'espadas') return 11;
    return NORMAL_RANK[card.value] || 0;
  },

  isManilha(card) {
    return this.getCardPower(card) >= 11;
  },

  isHumanTurn() {
    return gameState.phase === 'playing' && gameState.currentTurn === 0;
  },

  isHumanResponder() {
    return gameState.phase === 'truco_pending' && gameState.pendingTruco && gameState.pendingTruco.responderTeam === 'A';
  },

  getPlayersInOrder(startPlayer) {
    return PLAYER_ORDER.map((_, offset) => (startPlayer + offset) % 4);
  },

  getNextPlayerInRound(currentPlayer) {
    const ordered = this.getPlayersInOrder(gameState.firstOfRound);
    const currentIndex = ordered.indexOf(currentPlayer);
    for (let index = currentIndex + 1; index < ordered.length; index += 1) {
      if (!gameState.played[ordered[index]]) return ordered[index];
    }
    return null;
  },

  getPlayedEntriesInOrder() {
    return this.getPlayersInOrder(gameState.firstOfRound)
      .map((playerIndex) => gameState.played[playerIndex])
      .filter(Boolean);
  },

  playCard(playerIndex, cardId) {
    if (gameState.phase !== 'playing' || gameState.handLocked) return;
    if (gameState.currentTurn !== playerIndex) return;

    const hand = gameState.hands[playerIndex];
    const cardIndex = hand.findIndex((card) => this.getCardId(card) === cardId);
    if (cardIndex === -1) return;

    const [card] = hand.splice(cardIndex, 1);
    gameState.played[playerIndex] = { ...card, playerIndex, team: this.getTeam(playerIndex) };
    this.playCardSound();

    const nextPlayer = this.getNextPlayerInRound(playerIndex);
    if (nextPlayer === null) {
      this.render();
      this.trackTimeout(() => this.evaluateRound(), 1200);
      return;
    }

    gameState.currentTurn = nextPlayer;
    this.render();
    this.scheduleBotTurnIfNeeded();
  },

  evaluateRound() {
    const playedEntries = this.getPlayedEntriesInOrder();
    const highestPower = Math.max(...playedEntries.map((entry) => this.getCardPower(entry)));
    const strongest = playedEntries.filter((entry) => this.getCardPower(entry) === highestPower);
    const strongestTeams = [...new Set(strongest.map((entry) => entry.team))];

    let result = 'empate';
    let winningPlayer = null;

    if (strongestTeams.length === 1) {
      result = strongestTeams[0];
      winningPlayer = strongest[0].playerIndex;
    }

    gameState.roundResults[gameState.currentRound - 1] = result;
    gameState.highlightedPlayers = strongest.map((entry) => entry.playerIndex);

    if (result === 'A' || result === 'B') {
      gameState.firstOfRound = winningPlayer;
    } else {
      gameState.firstOfRound = gameState.mao;
    }

    this.render();
    this.showRoundFeedback(result);

    const shouldEndHand = this.shouldEndHandAfterCurrentRound();
    this.trackTimeout(() => {
      gameState.played = { 0: null, 1: null, 2: null, 3: null };
      gameState.highlightedPlayers = [];

      if (shouldEndHand) {
        this.evaluateHand();
        return;
      }

      gameState.currentRound += 1;
      gameState.currentTurn = gameState.firstOfRound;
      this.roundStatusEl.textContent = `Rodada ${gameState.currentRound} com saida de ${PLAYER_NAMES[gameState.firstOfRound]}.`;
      this.render();
      this.scheduleBotTurnIfNeeded();
    }, 1500);
  },

  shouldEndHandAfterCurrentRound() {
    const [r1, r2] = gameState.roundResults;

    if (gameState.currentRound >= 3) return true;
    if (gameState.currentRound === 1) return false;

    if ((r1 === 'A' || r1 === 'B') && r2 === r1) return true;
    if ((r1 === 'A' || r1 === 'B') && r2 === 'empate') return true;
    if (r1 === 'empate' && (r2 === 'A' || r2 === 'B')) return true;
    if (r1 === 'empate' && r2 === 'empate') return true;

    return false;
  },

  evaluateHand() {
    const [r1, r2, r3] = gameState.roundResults;
    const maoTeam = this.getTeam(gameState.mao);
    let winnerTeam = maoTeam;

    if (r1 === 'A' && r2 === 'A') winnerTeam = 'A';
    else if (r1 === 'B' && r2 === 'B') winnerTeam = 'B';
    else if (r1 === 'A' && r2 === 'empate') winnerTeam = 'A';
    else if (r1 === 'B' && r2 === 'empate') winnerTeam = 'B';
    else if (r1 === 'empate' && r2 === 'A') winnerTeam = 'A';
    else if (r1 === 'empate' && r2 === 'B') winnerTeam = 'B';
    else if (r1 === 'empate' && r2 === 'empate') winnerTeam = maoTeam;
    else if ((r1 === 'A' || r1 === 'B') && (r2 === 'A' || r2 === 'B') && r1 !== r2) winnerTeam = r3 === 'empate' ? maoTeam : r3;
    else if (r3 === 'empate') winnerTeam = maoTeam;
    else if (r3 === 'A' || r3 === 'B') winnerTeam = r3;

    this.finishHand(winnerTeam, gameState.handValue, false);
  },

  async finishHand(winnerTeam, awardedPoints, byRun) {
    if (gameState.handLocked) return;
    gameState.handLocked = true;
    gameState.scores[winnerTeam] += awardedPoints;
    const didHumanTeamWin = winnerTeam === 'A';
    gameState.phase = gameState.scores[winnerTeam] >= 12 ? 'game_over' : 'hand_over';

    this.turnStatusEl.textContent = didHumanTeamWin
      ? `Mao vencida! +${awardedPoints} ponto(s).`
      : `Mao perdida. Eles fizeram ${awardedPoints} ponto(s).`;

    this.showHandResult(didHumanTeamWin, awardedPoints, byRun);
    await this.registerHandSession(didHumanTeamWin, awardedPoints);

    if (gameState.phase === 'game_over') {
      await this.finishMatchRewards(didHumanTeamWin);
      this.roundStatusEl.textContent = didHumanTeamWin ? 'Partida encerrada. Nossa dupla venceu.' : 'Partida encerrada. A dupla adversaria venceu.';
      this.render();
      this.trackTimeout(() => {
        gameState.scores = { A: 0, B: 0 };
        gameState.handInitialized = false;
        gameState.mao = -1;
        this.showPreparingScreen();
      }, 2600);
      return;
    }

    this.render();
    this.trackTimeout(() => this.initHand(), 2100);
  },

  async registerHandSession(didHumanTeamWin, awardedPoints) {
    try {
      await App.fetchJson('/games/session', {
        method: 'POST',
        body: JSON.stringify({
          gameType: 'truco',
          result: didHumanTeamWin ? 'win' : 'loss',
          coinsDelta: didHumanTeamWin ? awardedPoints : -awardedPoints,
          durationSeconds: 45
        })
      });
    } catch (error) {
      App.showFeedback(error.message, 'danger');
    }
  },

  async finishMatchRewards(didHumanTeamWin) {
    try {
      if (didHumanTeamWin) {
        await App.fetchJson('/coins/add', {
          method: 'POST',
          body: JSON.stringify({ amount: 100, type: 'win', game: 'truco' })
        });
        App.showFeedback('+100 moedinhas', 'success');
        this.playVictorySound();
      } else {
        await App.fetchJson('/coins/subtract', {
          method: 'POST',
          body: JSON.stringify({ amount: 50, type: 'loss', game: 'truco' })
        });
        App.showFeedback('-50 moedinhas', 'danger');
      }
      await App.refreshBalance();
    } catch (error) {
      App.showFeedback(error.message, 'danger');
    }
  },

  getNextTrucoValue(value) {
    const currentIndex = TRUCO_STEPS.indexOf(value);
    return currentIndex >= 0 && currentIndex < TRUCO_STEPS.length - 1 ? TRUCO_STEPS[currentIndex + 1] : null;
  },

  getBetLabel(value) {
    const labels = { 3: 'Truco', 6: 'Seis', 9: 'Nove', 12: 'Doze' };
    return labels[value] || `${value} ponto(s)`;
  },

  callTruco(playerIndex) {
    if (gameState.phase !== 'playing' || gameState.currentTurn !== playerIndex || gameState.played[playerIndex]) return;
    const nextValue = this.getNextTrucoValue(gameState.handValue);
    if (!nextValue) return;

    const requesterTeam = this.getTeam(playerIndex);
    gameState.trucoCalled = true;
    gameState.trucoBy = requesterTeam;
    gameState.phase = 'truco_pending';
    gameState.pendingTruco = {
      requesterTeam,
      requesterPlayer: playerIndex,
      responderTeam: this.getOppositeTeam(requesterTeam),
      requestedValue: nextValue,
      previousValue: gameState.handValue
    };

    this.turnStatusEl.textContent = `${PLAYER_NAMES[playerIndex]} pediu ${this.getBetLabel(nextValue)}.`;
    this.showTrucoBanner(this.getBetLabel(nextValue).toUpperCase());
    this.playTrucoSound();
    this.render();

    if (gameState.pendingTruco.responderTeam === 'B') {
      this.trackTimeout(() => this.botRespondTruco(), 2000);
    }
  },

  respondTruco(response) {
    if (gameState.phase !== 'truco_pending' || !gameState.pendingTruco) return;
    const pending = gameState.pendingTruco;

    if (response === 'accept') {
      gameState.handValue = pending.requestedValue;
      gameState.phase = 'playing';
      gameState.trucoCalled = false;
      gameState.trucoBy = null;
      gameState.pendingTruco = null;
      this.turnStatusEl.textContent = `Pedido aceito. Mao vale ${gameState.handValue} ponto(s).`;
      this.render();
      this.scheduleBotTurnIfNeeded();
      return;
    }

    if (response === 'raise') {
      const nextValue = this.getNextTrucoValue(pending.requestedValue);
      if (!nextValue) {
        this.respondTruco('accept');
        return;
      }

      const newRequesterTeam = pending.responderTeam;
      gameState.trucoBy = newRequesterTeam;
      gameState.pendingTruco = {
        requesterTeam: newRequesterTeam,
        requesterPlayer: this.getTeamPlayers(newRequesterTeam)[0],
        responderTeam: pending.requesterTeam,
        requestedValue: nextValue,
        previousValue: pending.requestedValue
      };

      this.turnStatusEl.textContent = `${newRequesterTeam === 'A' ? 'Nossa dupla' : 'Eles'} pediram ${this.getBetLabel(nextValue)}.`;
      this.showTrucoBanner(this.getBetLabel(nextValue).toUpperCase());
      this.playTrucoSound();
      this.render();

      if (gameState.pendingTruco.responderTeam === 'B') {
        this.trackTimeout(() => this.botRespondTruco(), 2000);
      }
      return;
    }

    if (response === 'run') {
      this.finishHand(pending.requesterTeam, pending.previousValue, true);
    }
  },

  forceRun(playerIndex) {
    this.finishHand(this.getOppositeTeam(this.getTeam(playerIndex)), gameState.handValue, true);
  },

  botRespondTruco() {
    if (gameState.phase !== 'truco_pending' || !gameState.pendingTruco) return;
    const responderTeam = gameState.pendingTruco.responderTeam;
    const cards = this.getTeamPlayers(responderTeam).flatMap((playerIndex) => gameState.hands[playerIndex]);
    const hasManilha = cards.some((card) => this.isManilha(card));
    const hasStrong = cards.some((card) => ['3', '2'].includes(card.value));
    const canRaise = Boolean(this.getNextTrucoValue(gameState.pendingTruco.requestedValue));
    const random = Math.random();

    if (hasManilha) {
      if (canRaise && random > 0.7) this.respondTruco('raise');
      else this.respondTruco('accept');
      return;
    }

    if (hasStrong) {
      if (random <= 0.6) this.respondTruco('accept');
      else this.respondTruco('run');
      return;
    }

    if (random <= 0.2) this.respondTruco('accept');
    else this.respondTruco('run');
  },

  getTeamPlayers(team) {
    return PLAYER_ORDER.filter((playerIndex) => this.getTeam(playerIndex) === team);
  },

  maybeBotCallTruco(playerIndex) {
    if (gameState.phase !== 'playing' || gameState.handValue === 12 || gameState.currentTurn !== playerIndex) return false;
    const hand = gameState.hands[playerIndex];
    const hasManilha = hand.some((card) => this.isManilha(card));
    const strongCount = hand.filter((card) => ['3', '2'].includes(card.value)).length;
    const random = Math.random();

    if (hasManilha && random <= 0.24) {
      this.callTruco(playerIndex);
      return true;
    }

    if (strongCount >= 1 && random <= 0.12) {
      this.callTruco(playerIndex);
      return true;
    }

    return false;
  },

  botPlay() {
    if (gameState.phase !== 'playing' || gameState.handLocked) return;
    const playerIndex = gameState.currentTurn;
    if (playerIndex === 0) return;
    if (this.maybeBotCallTruco(playerIndex)) return;

    const hand = [...gameState.hands[playerIndex]];
    const card = playerIndex === 2 ? this.choosePartnerCard(hand) : this.chooseOpponentCard(hand, playerIndex);
    this.playCard(playerIndex, this.getCardId(card));
  },

  choosePartnerCard(hand) {
    const winningCard = this.getCurrentWinningCard();
    if (winningCard && winningCard.team === 'A' && winningCard.playerIndex === 0) {
      return this.sortCardsAsc(hand)[0];
    }
    return this.sortCardsDesc(hand)[0];
  },

  chooseOpponentCard(hand, playerIndex) {
    const playedEntries = this.getPlayedEntriesInOrder();
    if (playedEntries.length === 0) {
      const sorted = this.sortCardsAsc(hand);
      return sorted[Math.floor(sorted.length / 2)];
    }

    const winningCard = this.getCurrentWinningCard();
    if (winningCard && winningCard.team === this.getTeam(playerIndex)) {
      return this.sortCardsAsc(hand)[0];
    }

    const beatingCard = this.sortCardsAsc(hand).find((card) => this.getCardPower(card) > this.getCardPower(winningCard));
    return beatingCard || this.sortCardsAsc(hand)[0];
  },

  getCurrentWinningCard() {
    const entries = this.getPlayedEntriesInOrder();
    if (entries.length === 0) return null;
    const highestPower = Math.max(...entries.map((entry) => this.getCardPower(entry)));
    return entries.find((entry) => this.getCardPower(entry) === highestPower) || null;
  },

  sortCardsAsc(cards) {
    return [...cards].sort((a, b) => this.getCardPower(a) - this.getCardPower(b));
  },

  sortCardsDesc(cards) {
    return [...cards].sort((a, b) => this.getCardPower(b) - this.getCardPower(a));
  },

  scheduleBotTurnIfNeeded() {
    if (gameState.phase !== 'playing' || gameState.handLocked) return;
    if (gameState.currentTurn === 0) return;
    this.trackTimeout(() => this.botPlay(), 1200);
  },

  showTrucoBanner(text) {
    this.trucoBannerEl.textContent = text;
    this.trucoBannerEl.classList.remove('hidden');
    this.trucoBannerEl.classList.remove('truco-banner-pop');
    void this.trucoBannerEl.offsetWidth;
    this.trucoBannerEl.classList.add('truco-banner-pop');
    this.trackTimeout(() => {
      this.trucoBannerEl.classList.add('hidden');
    }, 1500);
  },

  showRoundFeedback(result) {
    const config = {
      A: { text: 'Nos vencemos!', className: 'success' },
      B: { text: 'Eles venceram!', className: 'danger' },
      empate: { text: 'Empate!', className: 'draw' }
    }[result];

    this.roundToastEl.textContent = config.text;
    this.roundToastEl.className = `round-toast ${config.className}`;
    this.roundToastEl.classList.remove('hidden');
    this.trackTimeout(() => this.roundToastEl.classList.add('hidden'), 1500);
  },

  showHandResult(didWin, points, byRun) {
    this.handResultTextEl.textContent = didWin
      ? `Mao vencida! +${points} pontos`
      : byRun
        ? 'Voce correu da mao.'
        : 'Mao perdida';
    this.handResultModalEl.classList.remove('hidden');
    this.trackTimeout(() => this.handResultModalEl.classList.add('hidden'), 2000);
  },

  createAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    return new AudioCtx();
  },

  playCardSound() {
    const ctx = this.createAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  },

  playTrucoSound() {
    const ctx = this.createAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 400;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  },

  playVictorySound() {
    const ctx = this.createAudioContext();
    if (!ctx) return;
    [660, 880, 990].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + index * 0.12;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  },

  renderCardFace(card, sizeClass = '') {
    const symbol = this.getCardSymbol(card);
    const manilhaClass = this.isManilha(card) ? 'manilha' : '';
    return `
      <div class="card ${SUITS[card.suit].colorClass} ${manilhaClass} ${sizeClass}">
        <span class="card-value-top">${card.value}${symbol}</span>
        <span class="card-center">${symbol}</span>
        <span class="card-value-bottom">${card.value}${symbol}</span>
      </div>
    `;
  },

  renderBackCard(sizeClass = '') {
    return `<div class="truco-card-back ${sizeClass}"></div>`;
  },

  renderOpponentHands() {
    [1, 2, 3].forEach((playerIndex) => {
      this.handsEls[playerIndex].innerHTML = gameState.hands[playerIndex]
        .map(() => this.renderBackCard('bot-card'))
        .join('');
      this.avatarEls[playerIndex].textContent = PLAYER_NAMES[playerIndex].charAt(0).toUpperCase();
      this.avatarEls[playerIndex].classList.toggle('turn-ring', gameState.currentTurn === playerIndex && gameState.phase === 'playing');
    });
    this.avatarEls[0].textContent = 'V';
    this.avatarEls[0].classList.toggle('turn-ring', this.isHumanTurn());
  },

  renderCenterCards() {
    PLAYER_ORDER.forEach((playerIndex) => {
      const target = this.centerEls[playerIndex];
      const card = gameState.played[playerIndex];
      if (!card) {
        const labels = { 0: 'Voce', 1: 'Esq', 2: 'Par', 3: 'Dir' };
        target.innerHTML = `<span class="subtle">${labels[playerIndex]}</span>`;
        target.classList.remove('center-slot-filled');
        return;
      }

      const winningClass = gameState.highlightedPlayers.includes(playerIndex) ? 'winner-highlight' : '';
      target.classList.add('center-slot-filled');
      target.innerHTML = `<div class="card-fly-wrap ${winningClass}">${this.renderCardFace(card, 'center-card')}</div>`;
    });
  },

  renderRoundTracker() {
    this.trickDots.forEach((dot, index) => {
      dot.className = 'trick-dot';
      if (gameState.roundResults[index] === 'A') dot.classList.add('us');
      if (gameState.roundResults[index] === 'B') dot.classList.add('them');
      if (gameState.roundResults[index] === 'empate') dot.classList.add('draw');
    });
  },

  renderHumanHand() {
    const transforms = [
      'rotate(-8deg) translateX(-20px)',
      'rotate(0deg) translateX(0px)',
      'rotate(8deg) translateX(20px)'
    ];
    this.myHandEl.innerHTML = gameState.hands[0]
      .map((card, index) => `
        <button class="card-button player-hand-card" style="transform:${transforms[index] || 'rotate(0deg)'};" ${this.isHumanTurn() ? `data-card-id="${this.getCardId(card)}"` : 'disabled'}>
          ${this.renderCardFace(card, 'player-card')}
        </button>
      `)
      .join('');

    this.myHandEl.querySelectorAll('[data-card-id]').forEach((button) => {
      button.addEventListener('click', () => this.playCard(0, button.dataset.cardId));
    });
  },

  renderActionButtons() {
    const canCallTruco = gameState.phase === 'playing' && gameState.currentTurn === 0 && !gameState.played[0] && Boolean(this.getNextTrucoValue(gameState.handValue));
    const showPendingResponse = this.isHumanResponder();
    const nextRaise = showPendingResponse ? this.getNextTrucoValue(gameState.pendingTruco.requestedValue) : null;
    const canRun = showPendingResponse || (gameState.phase === 'playing' && gameState.currentTurn === 0);

    this.trucoButton.classList.toggle('hidden', !canCallTruco);
    this.acceptButton.classList.toggle('hidden', !showPendingResponse);
    this.raiseButton.classList.toggle('hidden', !showPendingResponse || !nextRaise);
    this.runButton.disabled = !canRun;
    this.waitingButton.classList.toggle('hidden', this.isHumanTurn() || showPendingResponse);

    if (showPendingResponse) {
      this.acceptButton.textContent = 'Aceitar';
      this.raiseButton.textContent = nextRaise ? `Pedir ${this.getBetLabel(nextRaise)}` : 'Aumentar';
    }
  },

  renderStatus() {
    const displayedValue = gameState.pendingTruco ? gameState.pendingTruco.requestedValue : gameState.handValue;
    const roundWinsA = gameState.roundResults.filter((result) => result === 'A').length;
    const roundWinsB = gameState.roundResults.filter((result) => result === 'B').length;
    this.currentValueLabelEl.textContent = `${displayedValue} ponto${displayedValue > 1 ? 's' : ''}`;
    this.scoreAEl.textContent = gameState.scores.A;
    this.scoreBEl.textContent = gameState.scores.B;
    this.roundScoreEl.textContent = `${roundWinsA} x ${roundWinsB}`;
    this.turnChipEl.textContent = this.isHumanTurn() ? 'Sua vez' : 'Aguardando';
    this.turnChipEl.classList.toggle('turn-pulse', this.isHumanTurn());
    this.myTurnLabelEl.textContent = this.isHumanTurn()
      ? 'Toque em uma carta para jogar.'
      : this.isHumanResponder()
        ? 'Responda ao truco da dupla adversaria.'
        : 'A mesa esta jogando esta rodada.';
  },

  render() {
    this.renderOpponentHands();
    this.renderCenterCards();
    this.renderRoundTracker();
    this.renderHumanHand();
    this.renderStatus();
    this.renderActionButtons();
  }
};

window.TrucoGame = TrucoGame;
