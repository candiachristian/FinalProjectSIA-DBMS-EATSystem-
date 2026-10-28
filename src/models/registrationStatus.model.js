'use strict';
const db = require('../config/db');

const PROTECTED_NAMES = ['Registered', 'Cancelled'];

async function listAll() {
    const [rows] = await db.query(
        'SELECT status_id, status_name FROM registration_statuses ORDER BY status_id'
    );
    return rows;
}

async function getById(statusId) {
    const [rows] = await db.query(
        'SELECT status_id, status_name FROM registration_statuses WHERE status_id = ?',
        [statusId]
    );
    return rows[0];
}

async function getByName(statusName) {
    const [rows] = await db.query(
        'SELECT status_id, status_name FROM registration_statuses WHERE status_name = ?',
        [statusName]
    );
    return rows[0];
}

async function add(statusName) {
    const [result] = await db.query(
        'INSERT INTO registration_statuses (status_name) VALUES (?)',
        [statusName]
    );
    return result.insertId;
}

async function update(statusId, statusName) {
    const [result] = await db.query(
        'UPDATE registration_statuses SET status_name = ? WHERE status_id = ?',
        [statusName, statusId]
    );
    return result.affectedRows;
}

async function remove(statusId) {
    const [result] = await db.query(
        'DELETE FROM registration_statuses WHERE status_id = ?',
        [statusId]
    );
    return result.affectedRows;
}

module.exports = { 
    PROTECTED_NAMES,
    listAll,
    getById,
    getByName,
    add,
    update,
    remove 
};