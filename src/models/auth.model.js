"use strict";

const db = require("../config/db");

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

async function getUsers() {
  const [rows] = await db.execute(`
    SELECT
      u.user_id,
      u.username,
      r.role_id,
      r.role_name
    FROM users AS u
    INNER JOIN roles AS r
      ON r.role_id = u.role_id
    ORDER BY u.user_id ASC
  `);

  return rows;
}

async function getUserById(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        u.user_id,
        u.username,
        r.role_id,
        r.role_name
      FROM users AS u
      INNER JOIN roles AS r
        ON r.role_id = u.role_id
      WHERE u.user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

async function createUser(username, passwordHash, roleId) {
  const [result] = await db.execute(
    `
      INSERT INTO users
        (username, password_hash, role_id)
      VALUES (?, ?, ?)
    `,
    [username, passwordHash, roleId]
  );

  return getUserById(result.insertId);
}

async function updateUser(
  userId,
  username,
  roleId,
  passwordHash = null
) {
  let sql;
  let params;

  if (passwordHash) {
    sql = `
      UPDATE users
      SET
        username = ?,
        password_hash = ?,
        role_id = ?
      WHERE user_id = ?
    `;

    params = [
      username,
      passwordHash,
      roleId,
      userId
    ];
  } else {
    sql = `
      UPDATE users
      SET
        username = ?,
        role_id = ?
      WHERE user_id = ?
    `;

    params = [
      username,
      roleId,
      userId
    ];
  }

  const [result] = await db.execute(sql, params);

  if (result.affectedRows === 0) {
    return null;
  }

  return getUserById(userId);
}

async function deleteUser(userId) {
  const [result] = await db.execute(
    `
      DELETE FROM users
      WHERE user_id = ?
    `,
    [userId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  findAdminByUsername,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
