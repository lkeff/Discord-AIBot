const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function getAllUserSettings() {
  const { rows } = await pool.query('SELECT * FROM user_settings');
  return rows;
}

async function getAllConversations() {
  const { rows } = await pool.query('SELECT * FROM conversations ORDER BY user_id, timestamp');
  return rows;
}

async function upsertSystemPromptConversation(userId, systemPrompt) {
  // Insert a single row into conversations
  await pool.query(
    'INSERT INTO conversations (user_id, role, content) VALUES ($1, $2, $3)',
    [userId, systemPrompt.role, systemPrompt]
  );
}

async function deleteOldConversations(cutoffDate) {
  await pool.query('DELETE FROM conversations WHERE timestamp < $1', [cutoffDate]);
}

module.exports = {
  pool,
  getAllUserSettings,
  getAllConversations,
  upsertSystemPromptConversation,
  deleteOldConversations,
};
