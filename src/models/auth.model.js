const db = require('../config/db');

async function findAdminByUsername(username) {
  const sql = `
    SELECT
      u.user_id,
      u.username,
      u.password_hash,
      r.role_name
    FROM users AS u
    INNER JOIN roles AS r
      ON r.role_id = u.role_id
    WHERE u.username = ?
    LIMIT 1
  `;

  const [rows] = await db.execute(sql, [username]);

  return rows[0] || null;
}

module.exports = {
  findAdminByUsername
};
