'use strict';

const pool = require('../config/db');

const STATUS_COLUMNS = `
    status_id,
    status_name
`;

async function getAllStatuses() {
    const [rows] = await pool.execute(
        `SELECT ${STATUS_COLUMNS}
         FROM attendance_statuses
         ORDER BY status_id ASC`
    );

    return rows;
}

async function getStatusById(id) {
    const [rows] = await pool.execute(
        `SELECT ${STATUS_COLUMNS}
         FROM attendance_statuses
         WHERE status_id = ?`,
        [id]
    );

    return rows[0] || null;
}

async function createStatus({ statusName }) {
    if (!statusName) {
        throw new Error('statusName is required.');
    }

    const [result] = await pool.execute(
        `INSERT INTO attendance_statuses (status_name)
         VALUES (?)`,
        [statusName]
    );

    return getStatusById(result.insertId);
}

async function updateStatus(id, { statusName }) {
    if (!statusName) {
        throw new Error('statusName is required.');
    }

    const [result] = await pool.execute(
        `UPDATE attendance_statuses
         SET status_name = ?
         WHERE status_id = ?`,
        [statusName, id]
    );

    if (result.affectedRows === 0) {
        return null;
    }

    return getStatusById(id);
}

async function deleteStatus(id) {
    const [result] = await pool.execute(
        `DELETE FROM attendance_statuses
         WHERE status_id = ?`,
        [id]
    );

    return result.affectedRows > 0;
}

module.exports = {
    getAllStatuses,
    getStatusById,
    createStatus,
    updateStatus,
    deleteStatus
};