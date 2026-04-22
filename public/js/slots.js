const SYMBOLS = ['7', '⭐', '♦', '🍒', '🍋', '🔔', 'BAR'];
const WEIGHTS = [2, 4, 8, 12, 14, 14, 6];
const PAYOUTS = {
  '7,7,7': 50,
  '⭐,⭐,⭐': 20,
  '♦,♦,♦': 10,
  'BAR,BAR,BAR': 8,
  '🍒,🍒,🍒': 5,
  '🍋,🍋,🍋': 4,
  '🔔,🔔,🔔': 3
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
    this.spinButton.textContent = `Girar — ${App.formatCoins(this.state.bet)} moedinhas`;
  },

  weightedRandomSymbol() {
    const total = WEIGHTS.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i += 1) {
      random -= WEIGHTS[i];
      if (random <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[SYMBOLS.length - 1];
  },

  animateSpin() {
    const stopTimes = [400, 700, 1000];
    const symbols = [];
    this.reels.forEach((reel) => reel.classList.remove('win'));

    return new Promise((resolve) => {
      stopTimes.forEach((delay, index) => {
        this.reels[index].classList.add('spinning');
        setTimeout(() => {
          const symbol = this.weightedRandomSymbol();
          symbols[index] = symbol;
          this.reels[index].textContent = symbol;
          this.reels[index].classList.remove('spinning');
          if (index === stopTimes.length - 1) resolve(symbols);
        }, delay);
      });
    });
  },

  calculatePayout(symbols) {
    const key = symbols.join(',');
    if (PAYOUTS[key]) {
      this.reels.forEach((reel) => reel.classList.add('win'));
      return { multiplier: PAYOUTS[key], message: 'Sequencia perfeita!' };
    }

    const counts = symbols.reduce((acc, symbol) => {
      acc[symbol] = (acc[symbol] || 0) + 1;
      return acc;
    }, {});

    if (Object.values(counts).some((count) => count === 2)) {
      return { multiplier: 1.5, message: 'Par formado na linha!' };
    }

    return { multiplier: 0, message: 'Nao foi dessa vez.' };
  },

  async spin() {
    if (this.state.isSpinning) return;

    this.state.isSpinning = true;
    App.setLoading(this.spinButton, true, 'Aguarde...');
    this.result.textContent = 'Girando...';

    try {
      await App.fetchJson('/coins/subtract', {
        method: 'POST',
        body: JSON.stringify({ amount: this.state.bet, type: 'loss', game: 'slots' })
      });
      await App.refreshBalance();

      const symbols = await this.animateSpin();
      const payout = this.calculatePayout(symbols);
      const prize = Math.floor(this.state.bet * payout.multiplier);
      const won = prize > 0;
      this.state.rounds += 1;

      if (won) {
        this.state.wins += 1;
        this.state.bestWin = Math.max(this.state.bestWin, prize);
        await App.fetchJson('/coins/add', {
          method: 'POST',
          body: JSON.stringify({ amount: prize, type: 'win', game: 'slots' })
        });
        App.showFeedback(`+${App.formatCoins(prize)} moedinhas`, 'success');
      } else {
        App.showFeedback(`-${App.formatCoins(this.state.bet)} moedinhas`, 'danger');
      }

      await App.fetchJson('/games/session', {
        method: 'POST',
        body: JSON.stringify({
          gameType: 'slots',
          result: won ? 'win' : 'loss',
          coinsDelta: won ? prize - this.state.bet : -this.state.bet,
          durationSeconds: 3
        })
      });

      await App.refreshBalance();
      this.result.textContent = prize > 0
        ? `${symbols.join(' ')} • ${payout.message} Premio de ${App.formatCoins(prize)} moedinhas.`
        : `${symbols.join(' ')} • ${payout.message}`;
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
