"use strict";
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH =
  process.env.SQLITE_PATH ||
  path.join(__dirname, "..", "..", "..", "data", "bot.db");
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    userId      TEXT PRIMARY KEY,
    guildId     TEXT,
    language    TEXT DEFAULT 'en',
    xp          INTEGER DEFAULT 0,
    level       INTEGER DEFAULT 1,
    coins       INTEGER DEFAULT 0,
    lastCookie  TEXT,
    preferences TEXT DEFAULT '{}',
    updatedAt   TEXT DEFAULT (datetime('now'))
  )
`);

function rowToObj(row) {
  if (!row) return null;
  return { ...row, preferences: JSON.parse(row.preferences || "{}") };
}

class UserSettings {
  static findOne(query) {
    const userId = query && query.userId;
    if (!userId) return Promise.resolve(null);
    return Promise.resolve(
      rowToObj(
        db
          .prepare("SELECT * FROM user_settings WHERE userId = ?")
          .get(userId),
      ),
    );
  }

  static find() {
    return Promise.resolve(
      db.prepare("SELECT * FROM user_settings").all().map(rowToObj),
    );
  }

  static findOneAndUpdate(filter, update, _options = {}) {
    const userId = filter.userId;
    const payload = { ...update };
    if (payload.preferences && typeof payload.preferences === "object") {
      payload.preferences = JSON.stringify(payload.preferences);
    }
    const cols = Object.keys(payload).join(", ");
    const placeholders = Object.keys(payload)
      .map(() => "?")
      .join(", ");
    const updates = Object.keys(payload)
      .map((k) => `${k} = excluded.${k}`)
      .join(", ");
    db.prepare(
      `INSERT INTO user_settings (userId, ${cols}) VALUES (?, ${placeholders})
       ON CONFLICT(userId) DO UPDATE SET ${updates}, updatedAt = datetime('now')`,
    ).run(userId, ...Object.values(payload));
    return UserSettings.findOne({ userId });
  }
}

module.exports = UserSettings;
