const db = require('../config/db');

async function listCategories() {
  const [rows] = await db.execute(
    `SELECT category_id, category_name
     FROM event_categories
     ORDER BY category_name ASC`
  );

  return rows;
}

module.exports = {
  listCategories
};
