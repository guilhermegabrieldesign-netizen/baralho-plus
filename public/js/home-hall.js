const HomeHall = {
  state: {
    activeTab: 'cartas',
    countdowns: {},
    feedIndex: 0
  },

  games: [
    {
      kind: 'button',
      className: 'truco-card cartas',
      label: 'Truco',
      subtitle: 'Mesa turbo 2v2',
      meta: 'Popular agora',
      icon: 'TR',
      accent: 'royal',
      href: '/modo-jogo.html'
    },
    {
      kind: 'button',
      className: 'domino-card cartas has-art',
      label: 'Domino',
      subtitle: 'Chega em breve',
      meta: 'Novo modo',
      icon: 'DO',
      accent: 'violet',
      comingSoon: true,
      title: 'Domino',
      description: 'Domino chega em breve.',
      art: '/assets/games/domino-card.jpg',
      artAlt: 'Arte do jogo Domino'
    },
    {
      kind: 'link',
      className: 'slots-card mini',
      label: 'Slots',
      subtitle: 'Jackpot room',
      meta: 'Bonus relampago',
      icon: '777',
      accent: 'gold',
      href: '/slots.html',
      countdown: 83715
    },
    {
      kind: 'button',
      className: 'buraco-card cartas',
      label: 'Buraco',
      subtitle: 'Preparando lobby',
      meta: 'Clube social',
      icon: 'AK',
      accent: 'emerald',
      comingSoon: true,
      title: 'Buraco',
      description: 'Buraco esta em producao.'
    },
    {
      kind: 'button',
      className: 'rush-card mini',
      label: 'Rush Truco',
      subtitle: 'Partidas curtas',
      meta: 'Fila quente',
      icon: 'R!',
      accent: 'ember',
      comingSoon: true,
      title: 'Rush Truco',
      description: 'Rush Truco sera liberado em breve.',
      countdown: 29717
    },
    {
      kind: 'button',
      className: 'blackjack-card mini',
      label: 'Blackjack',
      subtitle: 'Mesa premium',
      meta: 'Em producao',
      icon: '21',
      accent: 'ice',
      comingSoon: true,
      title: 'Blackjack',
      description: 'Blackjack sera liberado em breve.'
    }
  ],

  feed: [
    { author: 'LORDZERA', text: 'vai Corinthians hoje no truco', tone: 'green' },
    { author: 'NinaCartas', text: 'slot dourado pagando alto agora', tone: 'gold' },
    { author: 'MesaVip', text: 'sala Senior abrindo em 2 min', tone: 'violet' }
  ],

  promos: [
    {
      icon: 'BONUS',
      title: 'Bonus de sorte',
      description: 'Gire 3 vezes e ganhe recompensa extra',
      badge: 'Ao vivo'
    },
    {
      icon: 'VIP',
      title: 'Clube premium',
      description: 'Missoes curtas para subir o passe',
      badge: 'Novo'
    }
  ],

  init() {
    this.root = document.getElementById('games-grid');
    this.feedRoot = document.getElementById('social-feed-root');
    this.promoRoot = document.getElementById('promo-rail-root');
    this.tabButtons = Array.from(document.querySelectorAll('.arcade-tab'));

    if (!this.root) return;

    this.state.countdowns = this.games.reduce((accumulator, game) => {
      if (typeof game.countdown === 'number') accumulator[game.label] = game.countdown;
      return accumulator;
    }, {});

    this.bindEvents();
    this.render();
    this.startCountdowns();
    this.startFeedRotation();
  },

  bindEvents() {
    this.tabButtons.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.state.activeTab = tab.dataset.tab || 'cartas';
        this.renderGames();
        this.renderTabs();
      });
    });
  },

  render() {
    this.renderTabs();
    this.renderGames();
    this.renderFeed();
    this.renderPromos();
  },

  renderTabs() {
    this.tabButtons.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === this.state.activeTab);
    });
  },

  renderGames() {
    this.root.innerHTML = this.games.map((game) => this.renderGameCard(game)).join('');
  },

  renderFeed() {
    if (!this.feedRoot) return;
    const item = this.feed[this.state.feedIndex];
    this.feedRoot.innerHTML = `
      <div class="home-feed-pill tone-${item.tone}">
        <span class="home-feed-avatar">${item.author.slice(0, 1)}</span>
        <div class="home-feed-copy">
          <strong>${item.author}</strong>
          <span>${item.text}</span>
        </div>
      </div>
    `;
  },

  renderPromos() {
    if (!this.promoRoot) return;
    this.promoRoot.innerHTML = this.promos.map((promo) => `
      <button class="home-side-action" data-coming-soon data-title="${promo.title}" data-description="${promo.description}">
        <span class="home-side-action-badge"><strong>${promo.icon}</strong></span>
        <span>${promo.title}</span>
      </button>
    `).join('');
  },

  renderGameCard(game) {
    const art = game.art
      ? `<span class="arcade-card-art-image"><img src="${game.art}" alt="${game.artAlt || game.label}" /></span>`
      : '';
    const countdown = typeof game.countdown === 'number'
      ? `<span class="timer-badge">${this.formatCountdown(this.state.countdowns[game.label] || 0)}</span>`
      : '';
    const attrs = [
      `class="arcade-game-card ${game.className}"`,
      `data-accent="${game.accent}"`,
      game.href ? `href="${game.href}"` : '',
      game.href ? `data-nav-href="${game.href}"` : '',
      game.comingSoon ? 'data-coming-soon' : '',
      game.title ? `data-title="${game.title}"` : '',
      game.description ? `data-description="${game.description}"` : ''
    ].filter(Boolean).join(' ');

    const content = `
      ${countdown}
      ${art}
      <div class="arcade-card-sheen"></div>
      <span class="arcade-card-icon">${game.icon}</span>
      <div class="arcade-card-copy">
        <span class="arcade-card-name">${game.label}</span>
        <span class="arcade-card-subtitle">${game.subtitle}</span>
      </div>
      <span class="arcade-card-meta">${game.meta}</span>
    `;

    return game.kind === 'link'
      ? `<a ${attrs}>${content}</a>`
      : `<button ${attrs}>${content}</button>`;
  },

  startCountdowns() {
    const countdownLabels = Object.keys(this.state.countdowns);
    if (countdownLabels.length === 0) return;

    setInterval(() => {
      countdownLabels.forEach((label) => {
        this.state.countdowns[label] = Math.max((this.state.countdowns[label] || 0) - 1, 0);
      });
      this.renderGames();
    }, 1000);
  },

  startFeedRotation() {
    if (!this.feedRoot || this.feed.length <= 1) return;

    setInterval(() => {
      this.state.feedIndex = (this.state.feedIndex + 1) % this.feed.length;
      this.renderFeed();
    }, 4200);
  },

  formatCountdown(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }
};

window.HomeHall = HomeHall;
