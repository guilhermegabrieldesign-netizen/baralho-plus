const SLOT_SYMBOL_MAP = {
  STAR: '\u2605',
  DIAMOND: '\u2666',
  CHERRY: '\ud83c\udf52',
  LEMON: '\ud83c\udf4b',
  BELL: '\ud83d\udd14'
};

const SlotsGame = {
  state: {
    bet: 10,
    isSpinning: false,
    rounds: 0,
    wins: 0,
    bestWin: 0
  },

  async init() {
    await App.init();
    this.reels = Array.from(document.querySelectorAll('[data-reel]'));
    this.result = document.getElementById('slots-result');
    this.spinButton = document.getElementById('spin-button');
    this.betButtons = Array.from(document.querySelectorAll('[data-bet]'));

    this.betButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (this.state.isSpinning) return;
        this.state.bet = Number(button.dataset.bet);
        this.updateBetUi();
      });
    });

    this.spinButton.addEventListener('click', () => this.spin());
    this.updateBetUi();
    this.renderStats();
  },

  updateBetUi() {
    this.betButtons.forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.bet) === this.state.bet);
    });
    this.spinButton.textContent = `Girar - ${App.formatCoins(this.state.bet)} moedinhas`;
  },

  presentSymbol(symbol) {
    return SLOT_SYMBOL_MAP[symbol] || symbol;
  },

  animateSpin(symbols) {
    const stopTimes = [400, 700, 1000];
    this.reels.forEach((reel) => reel.classList.remove('win'));

    return new Promise((resolve) => {
      stopTimes.forEach((delay, index) => {
        this.reels[index].classList.add('spinning');
        setTimeout(() => {
          this.reels[index].textContent = this.presentSymbol(symbols[index]);
          this.reels[index].classList.remove('spinning');
          if (index === stopTimes.length - 1) resolve(symbols);
        }, delay);
      });
    });
  },

  async spin() {
    if (this.state.isSpinning) return;

    this.state.isSpinning = true;
    App.setLoading(this.spinButton, true, 'Aguarde...');
    this.result.textContent = 'Girando...';

    try {
      const outcome = await App.fetchJson('/games/slots/spin', {
        method: 'POST',
        body: JSON.stringify({ bet: this.state.bet })
      });

      const symbols = await this.animateSpin(outcome.symbols);
      const won = outcome.prize > 0;
      this.state.rounds += 1;

      if (won) {
        this.state.wins += 1;
        this.state.bestWin = Math.max(this.state.bestWin, outcome.prize);
        this.reels.forEach((reel) => reel.classList.add('win'));
        App.showFeedback(`+${App.formatCoins(outcome.prize)} moedinhas`, 'success');
      } else {
        App.showFeedback(`-${App.formatCoins(this.state.bet)} moedinhas`, 'danger');
      }

      await App.refreshBalance();
      const visibleSymbols = symbols.map((symbol) => this.presentSymbol(symbol));
      this.result.textContent = outcome.prize > 0
        ? `${visibleSymbols.join(' ')} - ${outcome.message} Premio de ${App.formatCoins(outcome.prize)} moedinhas.`
        : `${visibleSymbols.join(' ')} - ${outcome.message}`;
      this.renderStats();
    } catch (error) {
      this.result.textContent = error.message;
      App.showFeedback(error.message, 'danger');
    } finally {
      this.state.isSpinning = false;
      App.setLoading(this.spinButton, false);
      this.updateBetUi();
    }
  },

  renderStats() {
    document.getElementById('stats-wins').textContent = this.state.wins;
    document.getElementById('stats-rounds').textContent = this.state.rounds;
    document.getElementById('stats-best').textContent = App.formatCoins(this.state.bestWin);
  }
};

window.SlotsGame = SlotsGame;
