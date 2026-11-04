const db = require("../config/db");

async function listTerms() {
  const [rows] = await db.execute(
    `SELECT term_id, term_name
     FROM academic_terms
     ORDER BY term_name DESC, term_id DESC`
  );

  return rows;
}

async function findTermById(termId) {
  const [rows] = await db.execute(
    `SELECT term_id, term_name
     FROM academic_terms
     WHERE term_id = ?
     LIMIT 1`,
    [termId]
  );

  return rows[0] || null;
}

async function createTerm(termName) {
  const [result] = await db.execute(
    `INSERT INTO academic_terms (term_name)
     VALUES (?)`,
    [termName]
  );

  return findTermById(result.insertId);
}

module.exports = {
  listTerms,
  findTermById,
  createTerm
};
