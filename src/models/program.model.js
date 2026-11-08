'use strict';

const db = require('../config/db');

async function getAllPrograms(departmentId = null) {
    let sql = `
        SELECT
            p.program_id,
            p.program_name,
            p.department_id,
            d.department_name
        FROM programs AS p
        INNER JOIN departments AS d
            ON d.department_id = p.department_id
    `;

    const params = [];

    if (departmentId !== null) {
        sql += `
            WHERE p.department_id = ?
        `;

        params.push(departmentId);
    }

    sql += `
        ORDER BY
            d.department_name ASC,
            p.program_name ASC
    `;

    const [rows] = await db.execute(sql, params);

    return rows;
}

async function getProgramById(programId) {
    const [rows] = await db.execute(
        `SELECT
            p.program_id,
            p.program_name,
            p.department_id,
            d.department_name
         FROM programs AS p
         INNER JOIN departments AS d
            ON d.department_id = p.department_id
         WHERE p.program_id = ?
         LIMIT 1`,
        [programId]
    );

    return rows[0] || null;
}

async function createProgram(programName, departmentId) {
    const [result] = await db.execute(
        `INSERT INTO programs
            (program_name, department_id)
         VALUES (?, ?)`,
        [programName, departmentId]
    );

    return getProgramById(result.insertId);
}

async function updateProgram(programId, programName, departmentId) {
    const [result] = await db.execute(
        `UPDATE programs
         SET
            program_name = ?,
            department_id = ?
         WHERE program_id = ?`,
        [programName, departmentId, programId]
    );

    if (result.affectedRows === 0) {
        return null;
    }

    return getProgramById(programId);
}

async function deleteProgram(programId) {
    const [result] = await db.execute(
        `DELETE FROM programs
         WHERE program_id = ?`,
        [programId]
    );

    return result.affectedRows > 0;
}

module.exports = {
    getAllPrograms,
    getProgramById,
    createProgram,
    updateProgram,
    deleteProgram
};
