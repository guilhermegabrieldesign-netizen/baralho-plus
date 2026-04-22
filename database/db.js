const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'BaralhoPlus');
const dbPath = path.join(dataDir, 'baralho-plus.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      coins INTEGER DEFAULT 1000,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      rank TEXT DEFAULT 'Bronze I',
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coin_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER,
      type TEXT,
      amount INTEGER,
      game TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_type TEXT,
      player_id INTEGER,
      result TEXT,
      coins_delta INTEGER,
      duration_seconds INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS game_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_type TEXT,
      room_code TEXT UNIQUE,
      status TEXT DEFAULT 'waiting',
      min_bet INTEGER DEFAULT 10,
      max_players INTEGER DEFAULT 4,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function getPlayerById(playerId) {
  return db
    .prepare(`
      SELECT id, username, coins, level, xp, rank, wins, losses, created_at
      FROM players
      WHERE id = ?
    `)
    .get(playerId);
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.playerId) {
    return res.status(401).json({ error: 'Nao autenticado' });
  }

  return next();
}

module.exports = {
  db,
  initializeDatabase,
  getPlayerById,
  requireAuth
};
