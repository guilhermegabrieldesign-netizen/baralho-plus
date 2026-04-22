const express = require('express');
const { db, getPlayerById, requireAuth } = require('../database/db');

const router = express.Router();

function insertTransaction(playerId, type, amount, game = null) {
  db.prepare(
    'INSERT INTO coin_transactions (player_id, type, amount, game) VALUES (?, ?, ?, ?)'
  ).run(playerId, type, amount, game);
}

function hasClaimedBonus(playerId, game) {
  return db
    .prepare(`
      SELECT id
      FROM coin_transactions
      WHERE player_id = ?
        AND type = 'bonus'
        AND game = ?
      LIMIT 1
    `)
    .get(playerId, game);
}

router.get('/balance', requireAuth, (req, res) => {
  const player = getPlayerById(req.session.playerId);
  return res.json({ coins: player ? player.coins : 0 });
});

router.post('/add', requireAuth, (req, res) => {
  return res.status(403).json({ error: 'Credito direto bloqueado; use os fluxos seguros do jogo' });
});

router.post('/subtract', requireAuth, (req, res) => {
  return res.status(403).json({ error: 'Debito direto bloqueado; use os fluxos seguros do jogo' });
});

router.get('/history', requireAuth, (req, res) => {
  const history = db
    .prepare(`
      SELECT id, type, amount, game, created_at
      FROM coin_transactions
      WHERE player_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 20
    `)
    .all(req.session.playerId);

  return res.json({ history });
});

router.post('/daily-bonus', requireAuth, (req, res) => {
  const alreadyClaimed = db
    .prepare(`
      SELECT id
      FROM coin_transactions
      WHERE player_id = ?
        AND type = 'bonus'
        AND game = 'daily-bonus'
        AND date(created_at) = date('now', 'localtime')
      LIMIT 1
    `)
    .get(req.session.playerId);

  if (alreadyClaimed) {
    return res.status(400).json({ error: 'Bonus diario ja resgatado hoje' });
  }

  const transaction = db.transaction(() => {
    db.prepare('UPDATE players SET coins = coins + 100 WHERE id = ?').run(req.session.playerId);
    insertTransaction(req.session.playerId, 'bonus', 100, 'daily-bonus');
  });

  transaction();

  return res.json({
    message: 'Bonus diario resgatado com sucesso',
    coins: getPlayerById(req.session.playerId).coins
  });
});

router.post('/profile-bonus', requireAuth, (req, res) => {
  if (hasClaimedBonus(req.session.playerId, 'profile-task')) {
    return res.status(400).json({ error: 'Bonus de perfil ja resgatado' });
  }

  const transaction = db.transaction(() => {
    db.prepare('UPDATE players SET coins = coins + 50 WHERE id = ?').run(req.session.playerId);
    insertTransaction(req.session.playerId, 'bonus', 50, 'profile-task');
  });

  transaction();

  return res.json({
    message: 'Bonus de perfil resgatado com sucesso',
    coins: getPlayerById(req.session.playerId).coins
  });
});

module.exports = router;
