const TrucoCore = (() => {
  const suits = {
    paus: { key: 'paus', symbol: '♣', colorClass: 'naipe-paus', order: 4 },
    copas: { key: 'copas', symbol: '♥', colorClass: 'naipe-copas', order: 3 },
    espadas: { key: 'espadas', symbol: '♠', colorClass: 'naipe-espadas', order: 2 },
    ouros: { key: 'ouros', symbol: '♦', colorClass: 'naipe-ouros', order: 1 }
  };

  const cardValues = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
  const normalRank = { '3': 10, '2': 9, A: 8, K: 7, J: 6, Q: 5, '7': 4, '6': 3, '5': 2, '4': 1 };
  const paulistaPower = {
    '4-paus': 100,
    '7-copas': 99,
    'A-espadas': 98,
    '7-ouros': 97
  };

  const playerOrder = [0, 1, 2, 3];
  const teamByPlayer = { 0: 'A', 1: 'B', 2: 'A', 3: 'B' };
  const playerNames = { 0: 'Você', 1: 'Adversário Esq', 2: 'Parceiro', 3: 'Adversário Dir' };
  const trucoSteps = [1, 3, 6, 9, 12];
  const handFanTransforms = [
    'rotate(-10deg) translateX(12px)',
    'rotate(0deg) translateY(-6px)',
    'rotate(10deg) translateX(-12px)'
  ];

  class TrucoDeckGame extends DeckGame {
    constructor() {
      super({ suits: Object.keys(suits), ranks: cardValues });
    }

    createDeck() {
      return super.createDeck((value, suit) => ({ value, suit }));
    }

    getCardId(card) {
      return `${card.value}-${card.suit}`;
    }

    getCardSymbol(card) {
      return suits[card.suit].symbol;
    }

    getPaulistaCardPower(card) {
      return paulistaPower[this.getCardId(card)] || normalRank[card.value] || 0;
    }

    getMineiroCardPower(card, viraCard) {
      const manilhaValue = viraCard ? this.getNextValue(viraCard.value) : null;
      if (card.value === manilhaValue) {
        return 200 + (suits[card.suit]?.order || 0);
      }
      return normalRank[card.value] || 0;
    }

    getNextValue(value) {
      const currentIndex = cardValues.indexOf(value);
      return cardValues[(currentIndex + 1) % cardValues.length];
    }

    isPaulistaManilha(card) {
      return this.getPaulistaCardPower(card) >= 11;
    }
  }

  return {
    suits,
    playerOrder,
    teamByPlayer,
    playerNames,
    trucoSteps,
    handFanTransforms,
    TrucoDeckGame
  };
})();

window.TrucoCore = TrucoCore;
