'use strict';
 
const pool = require('../config/db');
 
const VENUE_COLUMNS = `
    venue_id,
    venue_name,
    location
`;
 
async function getAllVenues() {
    const [rows] = await pool.execute(
        `SELECT ${VENUE_COLUMNS}
         FROM venues
         ORDER BY venue_name ASC`
    );
 
    return rows;
}
 
async function getVenueById(id) {
    const [rows] = await pool.execute(
        `SELECT ${VENUE_COLUMNS}
         FROM venues
         WHERE venue_id = ?`,
        [id]
    );
 
    return rows[0] || null;
}
 
async function createVenue({ venueName, location }) {
    if (!venueName) {
        throw new Error('venueName is required.');
    }
 
    const [result] = await pool.execute(
        `INSERT INTO venues (venue_name, location)
         VALUES (?, ?)`,
        [venueName, location || null]
    );
 
    return getVenueById(result.insertId);
}
 
async function updateVenue(id, { venueName, location }) {
    if (!venueName) {
        throw new Error('venueName is required.');
    }
 
    const [result] = await pool.execute(
        `UPDATE venues
         SET
            venue_name = ?,
            location = ?
         WHERE venue_id = ?`,
        [venueName, location || null, id]
    );
 
    if (result.affectedRows === 0) {
        return null;
    }
 
    return getVenueById(id);
}
 
async function deleteVenue(id) {
    const [result] = await pool.execute(
        `DELETE FROM venues
         WHERE venue_id = ?`,
        [id]
    );
 
    return result.affectedRows > 0;
}
 
module.exports = {
    getAllVenues,
    getVenueById,
    createVenue,
    updateVenue,
    deleteVenue
};