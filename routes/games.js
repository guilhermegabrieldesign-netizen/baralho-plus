const express = require('express');
const { db, getPlayerById, requireAuth } = require('../database/db');

const router = express.Router();
const SLOT_SYMBOLS = ['7', 'STAR', 'DIAMOND', 'CHERRY', 'LEMON', 'BELL', 'BAR'];
const SLOT_WEIGHTS = [2, 4, 8, 12, 14, 14, 6];
const SLOT_PAYOUTS = {
  '7,7,7': 50,
  'STAR,STAR,STAR': 20,
  'DIAMOND,DIAMOND,DIAMOND': 10,
  'BAR,BAR,BAR': 8,
  'CHERRY,CHERRY,CHERRY': 5,
  'LEMON,LEMON,LEMON': 4,
  'BELL,BELL,BELL': 3
};

function insertCoinTransaction(playerId, type, amount, game = null) {
  db.prepare(
    'INSERT INTO coin_transactions (player_id, type, amount, game) VALUES (?, ?, ?, ?)'
  ).run(playerId, type, amount, game);
}

function insertGameSession(playerId, gameType, result, coinsDelta = 0, durationSeconds = 0) {
  db.prepare(
    `
      INSERT INTO game_sessions (game_type, player_id, result, coins_delta, duration_seconds)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(gameType, playerId, result, coinsDelta, durationSeconds);
}

function applyPlayerProgress(playerId, result) {
  if (result === 'win') {
    db.prepare('UPDATE players SET wins = wins + 1, xp = xp + 15 WHERE id = ?').run(playerId);
    return;
  }

  if (result === 'loss') {
    db.prepare('UPDATE players SET losses = losses + 1, xp = xp + 5 WHERE id = ?').run(playerId);
    return;
  }

  db.prepare('UPDATE players SET xp = xp + 8 WHERE id = ?').run(playerId);
}

function getWeightedRandomSymbol() {
  const total = SLOT_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * total;

  for (let index = 0; index < SLOT_SYMBOLS.length; index += 1) {
    random -= SLOT_WEIGHTS[index];
    if (random <= 0) return SLOT_SYMBOLS[index];
  }

  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
}

function calculateSlotPayout(symbols) {
  const key = symbols.join(',');
  if (SLOT_PAYOUTS[key]) {
    return { prizeMultiplier: SLOT_PAYOUTS[key], message: 'Sequencia perfeita!' };
  }

  const counts = symbols.reduce((accumulator, symbol) => {
    accumulator[symbol] = (accumulator[symbol] || 0) + 1;
    return accumulator;
  }, {});

  if (Object.values(counts).some((count) => count === 2)) {
    return { prizeMultiplier: 1.5, message: 'Par formado na linha!' };
  }

  return { prizeMultiplier: 0, message: 'Nao foi dessa vez.' };
}

router.get('/ranking', requireAuth, (req, res) => {
  const metric = req.query.metric === 'wins' ? 'wins' : 'coins';
  const orderBy = metric === 'wins' ? 'wins DESC, coins DESC' : 'coins DESC, wins DESC';
  const ranking = db
    .prepare(`
      SELECT id, username, coins, wins, losses, level, rank
      FROM players
      ORDER BY ${orderBy}
      LIMIT 20
    `)
    .all();

  return res.json({ ranking, metric });
});

router.get('/history', requireAuth, (req, res) => {
  const history = db
    .prepare(`
      SELECT id, game_type, result, coins_delta, duration_seconds, created_at
      FROM game_sessions
      WHERE player_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 20
    `)
    .all(req.session.playerId);

  return res.json({ history });
});

router.post('/session', requireAuth, (req, res) => {
  const { gameType, result, durationSeconds = 0 } = req.body || {};

  if (!gameType || !result) {
    return res.status(400).json({ error: 'gameType e result sao obrigatorios' });
  }

  insertGameSession(req.session.playerId, gameType, result, 0, Number(durationSeconds) || 0);
  applyPlayerProgress(req.session.playerId, result);

  const player = getPlayerById(req.session.playerId);
  return res.status(201).json({ message: 'Partida registrada com sucesso', player });
});

router.post('/slots/spin', requireAuth, (req, res) => {
  const bet = Number(req.body?.bet);
  const player = getPlayerById(req.session.playerId);

  if (!Number.isInteger(bet) || bet <= 0) {
    return res.status(400).json({ error: 'Aposta invalida' });
  }

  if (!player || player.coins < bet) {
    return res.status(400).json({ error: 'Saldo insuficiente' });
  }

  const symbols = [getWeightedRandomSymbol(), getWeightedRandomSymbol(), getWeightedRandomSymbol()];
  const payout = calculateSlotPayout(symbols);
  const prize = Math.floor(bet * payout.prizeMultiplier);
  const coinsDelta = prize - bet;
  const result = prize > 0 ? 'win' : 'loss';

  const transaction = db.transaction(() => {
    db.prepare('UPDATE players SET coins = coins + ? WHERE id = ?').run(coinsDelta, req.session.playerId);
    insertCoinTransaction(req.session.playerId, 'loss', -bet, 'slots');
    if (prize > 0) insertCoinTransaction(req.session.playerId, 'win', prize, 'slots');
    insertGameSession(req.session.playerId, 'slots', result, coinsDelta, 3);
    applyPlayerProgress(req.session.playerId, result);
  });

  transaction();

  return res.json({
    symbols,
    prize,
    message: payout.message,
    coins: getPlayerById(req.session.playerId).coins
  });
});

module.exports = router;
