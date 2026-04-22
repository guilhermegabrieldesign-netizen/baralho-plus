class DeckGame {
  constructor({ suits = [], ranks = [] } = {}) {
    this.suits = suits;
    this.ranks = ranks;
  }

  createDeck(createCard = (rank, suit) => ({ rank, suit })) {
    return this.suits.flatMap((suit) => this.ranks.map((rank) => createCard(rank, suit)));
  }

  shuffle(deck) {
    const nextDeck = [...deck];
    for (let index = nextDeck.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [nextDeck[index], nextDeck[randomIndex]] = [nextDeck[randomIndex], nextDeck[index]];
    }
    return nextDeck;
  }

  dealRoundRobin(deck, playerIds, cardsPerPlayer) {
    const mutableDeck = [...deck];
    const hands = playerIds.reduce((accumulator, playerId) => {
      accumulator[playerId] = [];
      return accumulator;
    }, {});

    for (let round = 0; round < cardsPerPlayer; round += 1) {
      playerIds.forEach((playerId) => {
        const card = mutableDeck.shift();
        if (card) hands[playerId].push(card);
      });
    }

    return { hands, remainingDeck: mutableDeck };
  }
}

window.DeckGame = DeckGame;
