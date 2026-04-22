const express = require('express');
const bcrypt = require('bcrypt');
const { db, getPlayerById, requireAuth } = require('../database/db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario e senha sao obrigatorios' });
  }

  if (String(password).length < 4) {
    return res.status(400).json({ error: 'A senha precisa ter ao menos 4 caracteres' });
  }

  const normalizedUsername = String(username).trim();
  const existing = db.prepare('SELECT id FROM players WHERE username = ?').get(normalizedUsername);

  if (existing) {
    return res.status(409).json({ error: 'Este usuario ja existe' });
  }

  try {
    const passwordHash = await bcrypt.hash(String(password), 10);
    const info = db
      .prepare('INSERT INTO players (username, password_hash) VALUES (?, ?)')
      .run(normalizedUsername, passwordHash);

    req.session.playerId = info.lastInsertRowid;

    return res.status(201).json({
      message: 'Conta criada com sucesso',
      player: getPlayerById(info.lastInsertRowid)
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario e senha sao obrigatorios' });
  }

  const player = db
    .prepare('SELECT id, username, password_hash FROM players WHERE username = ?')
    .get(String(username).trim());

  if (!player) {
    return res.status(401).json({ error: 'Credenciais invalidas' });
  }

  try {
    const isValid = await bcrypt.compare(String(password), player.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    req.session.playerId = player.id;

    return res.json({
      message: 'Login realizado com sucesso',
      player: getPlayerById(player.id)
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logout realizado com sucesso' });
  });
});

router.get('/me', requireAuth, (req, res) => {
  const player = getPlayerById(req.session.playerId);

  if (!player) {
    return res.status(404).json({ error: 'Jogador nao encontrado' });
  }

  return res.json({ player });
});

module.exports = router;
