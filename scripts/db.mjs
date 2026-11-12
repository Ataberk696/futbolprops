// SQLite bağlantısı ve şema. Veritabanı: data/props.db
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dataDir = fileURLToPath(new URL("../data/", import.meta.url));

export function openDb() {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(dataDir + "props.db");
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS leagues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL REFERENCES leagues(id),
      season TEXT NOT NULL,
      date TEXT NOT NULL,
      time_utc TEXT,
      status TEXT NOT NULL,
      home_team_id TEXT NOT NULL REFERENCES teams(id),
      away_team_id TEXT NOT NULL REFERENCES teams(id),
      score_home INTEGER,
      score_away INTEGER,
      round_name TEXT,
      referee TEXT,
      details_at TEXT            -- oyuncu/takım istatistikleri çekildiyse zaman damgası
    );
    CREATE INDEX IF NOT EXISTS matches_league_date ON matches(league_id, season, date);

    -- Maçta süre alan her oyuncu için bir satır.
    CREATE TABLE IF NOT EXISTS player_match_stats (
      match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL REFERENCES players(id),
      team_id TEXT NOT NULL REFERENCES teams(id),
      minutes INTEGER,           -- kaynak bazı maçlarda dakika vermiyor; o zaman NULL
      goals INTEGER NOT NULL DEFAULT 0,
      assists INTEGER NOT NULL DEFAULT 0,
      shots INTEGER NOT NULL DEFAULT 0,
      shots_on_target INTEGER NOT NULL DEFAULT 0,
      fouls INTEGER NOT NULL DEFAULT 0,
      was_fouled INTEGER NOT NULL DEFAULT 0,
      corners INTEGER NOT NULL DEFAULT 0,
      offsides INTEGER NOT NULL DEFAULT 0,
      tackles INTEGER NOT NULL DEFAULT 0,
      saves INTEGER NOT NULL DEFAULT 0,
      yellow_cards INTEGER NOT NULL DEFAULT 0,
      red_cards INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (match_id, player_id)
    );
    CREATE INDEX IF NOT EXISTS pms_player ON player_match_stats(player_id);
    CREATE INDEX IF NOT EXISTS pms_team ON player_match_stats(team_id);

    -- period: All | FirstHalf | SecondHalf
    CREATE TABLE IF NOT EXISTS team_match_stats (
      match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      team_id TEXT NOT NULL REFERENCES teams(id),
      period TEXT NOT NULL,
      corners INTEGER,
      fouls INTEGER,
      yellow_cards INTEGER,
      red_cards INTEGER,
      shots INTEGER,
      shots_on_target INTEGER,
      offsides INTEGER,
      possession INTEGER,
      PRIMARY KEY (match_id, team_id, period)
    );
  `);
  // Sonradan eklenen sütunlar; var olan veritabanlarında da oluşsun diye ayrı eklenir.
  addColumn(db, "players", "position", "INTEGER"); // 0 kaleci, 1 defans, 2 orta saha, 3 forvet
  addColumn(db, "matches", "lineup_at", "TEXT"); // kadro (mevki) bilgisi çekildiyse zaman damgası
  return db;
}

function addColumn(db, table, column, type) {
  const exists = db.prepare(`SELECT 1 FROM pragma_table_info('${table}') WHERE name = ?`).get(column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
