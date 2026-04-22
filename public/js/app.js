const App = {
  state: {
    player: null,
    coins: 0,
    onlineCount: 0
  },

  async init(options = {}) {
    this.ensureUi();
    this.initPageFade();

    if (!options.skipAuth) {
      const player = await this.fetchCurrentPlayer();
      if (!player) {
        window.location.href = '/login.html';
        return;
      }
    }

    this.bindGlobalActions();
    this.initSocket();
  },

  ensureUi() {
    if (!document.getElementById('feedback-toast')) {
      const toast = document.createElement('div');
      toast.id = 'feedback-toast';
      toast.className = 'feedback-toast';
      document.body.appendChild(toast);
    }

    if (!document.getElementById('global-modal-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'global-modal-overlay';
      overlay.className = 'modal-overlay hidden';
      overlay.innerHTML = `
        <div class="modal">
          <div class="section-header">
            <div>
              <div id="modal-title" class="section-title">Em breve</div>
              <div id="modal-message" class="subtle">Este conteudo esta em desenvolvimento.</div>
            </div>
            <button class="icon-button" data-close-modal>x</button>
          </div>
          <div style="margin-top: 18px;">
            <button class="primary-button" style="width: 100%;" data-close-modal>Fechar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
  },

  bindGlobalActions() {
    if (this.boundGlobalActions) return;

    this.boundGlobalActions = true;
    document.addEventListener('click', (event) => {
      const modalTarget = event.target.closest('[data-close-modal]');
      if (modalTarget) this.hideModal();

      const soonTarget = event.target.closest('[data-coming-soon]');
      if (soonTarget) {
        const title = soonTarget.getAttribute('data-title') || 'Em breve';
        const description = soonTarget.getAttribute('data-description') || 'Este conteudo esta em desenvolvimento!';
        this.showModal(title, description);
      }

      const navTarget = event.target.closest('[data-nav-href]');
      if (navTarget) {
        event.preventDefault();
        this.navigateWithFade(navTarget.getAttribute('data-nav-href'));
      }
    });
  },

  initPageFade() {
    document.body.style.opacity = '0';
    setTimeout(() => {
      document.body.style.opacity = '1';
    }, 50);
  },

  navigateWithFade(url) {
    document.body.style.opacity = '0';
    setTimeout(() => {
      window.location.href = url;
    }, 220);
  },

  initSocket() {
    if (typeof io === 'undefined' || this.socketInitialized) return;

    this.socketInitialized = true;
    this.socket = io();
    this.socket.on('online_count', (count) => {
      this.state.onlineCount = count;
      document.querySelectorAll('[data-online-count]').forEach((element) => {
        element.textContent = `${count} jogadores online`;
      });
    });
  },

  async fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Erro inesperado');
    return data;
  },

  async fetchCurrentPlayer() {
    try {
      const data = await this.fetchJson('/auth/me');
      this.state.player = data.player;
      this.state.coins = data.player.coins;
      this.renderPlayer();
      return data.player;
    } catch (error) {
      return null;
    }
  },

  renderPlayer() {
    const player = this.state.player;
    if (!player) return;
    const vipTier = this.getVipTier(player);
    const levelLabel = this.getLevelLabel(player);

    document.querySelectorAll('[data-username]').forEach((element) => {
      element.textContent = player.username;
    });
    document.querySelectorAll('[data-rank]').forEach((element) => {
      element.textContent = player.rank;
    });
    document.querySelectorAll('[data-avatar-initial]').forEach((element) => {
      element.textContent = player.username.charAt(0).toUpperCase();
    });
    document.querySelectorAll('[data-coin-balance]').forEach((element) => {
      element.textContent = this.formatCoins(this.state.coins);
    });
    document.querySelectorAll('[data-level]').forEach((element) => {
      element.textContent = levelLabel;
    });
    document.querySelectorAll('[data-vip-tier]').forEach((element) => {
      element.textContent = vipTier;
    });
  },

  async refreshBalance() {
    try {
      const data = await this.fetchJson('/coins/balance');
      this.state.coins = data.coins;
      this.renderPlayer();
      return data.coins;
    } catch (error) {
      return null;
    }
  },

  async logout() {
    await this.fetchJson('/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  },

  formatCoins(value) {
    return Number(value || 0).toLocaleString('pt-BR');
  },

  getVipTier(player) {
    const tier = Math.max(1, Math.min(9, Math.floor((Number(player?.level) || 1) / 3) + 1));
    return `VIP ${tier}`;
  },

  getLevelLabel(player) {
    const level = Number(player?.level) || 1;
    return `Nivel ${level}`;
  },

  setLoading(button, isLoading, loadingText) {
    if (!button) return;
    if (!button.dataset.originalText) button.dataset.originalText = button.innerHTML;
    button.disabled = isLoading;
    button.innerHTML = isLoading
      ? `<span style="display:inline-flex;align-items:center;gap:8px;justify-content:center;"><span class="spinner"></span><span>${loadingText || 'Aguarde...'}</span></span>`
      : button.dataset.originalText;
  },

  showFeedback(message, type = 'success') {
    const toast = document.getElementById('feedback-toast');
    if (!toast) return;

    toast.className = `feedback-toast ${type}`;
    toast.textContent = message;
    toast.classList.add('visible');

    clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2000);
  },

  showModal(title, message) {
    const overlay = document.getElementById('global-modal-overlay');
    if (!overlay) return;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    overlay.classList.remove('hidden');
  },

  hideModal() {
    const overlay = document.getElementById('global-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  goToStore() {
    this.navigateWithFade('/loja.html');
  },

  createBottomNav(activePage) {
    return `
      <nav class="bottom-nav bottom-nav-arcade">
        <div class="bottom-nav-inner">
          <button class="nav-item ${activePage === 'ajuda' ? 'active' : ''}" data-coming-soon data-title="Ajuda" data-description="A central de ajuda sera liberada em breve.">
            <div class="nav-icon">🎁</div>
            <span>Ajuda</span>
          </button>
          <button class="nav-item ${activePage === 'social' ? 'active' : ''}" data-coming-soon data-title="Social" data-description="A area social chega nas proximas atualizacoes.">
            <div class="nav-icon">💬</div>
            <span>Social</span>
          </button>
          <a class="nav-item nav-item-hall ${activePage === 'hall' ? 'active' : ''}" href="/index.html" data-nav-href="/index.html">
            <div class="nav-icon">🎮</div>
            <span>Hall</span>
          </a>
          <button class="nav-item ${activePage === 'evento' ? 'active' : ''}" data-coming-soon data-title="Evento" data-description="Os eventos sazonais do Baralho+ ainda estao sendo preparados.">
            <div class="nav-icon">⚽</div>
            <span>Evento</span>
          </button>
          <a class="nav-item ${activePage === 'loja' ? 'active' : ''}" href="/loja.html" data-nav-href="/loja.html">
            <div class="nav-icon">🛍</div>
            <span>Loja</span>
          </a>
        </div>
      </nav>
    `;
  }
};

window.App = App;
