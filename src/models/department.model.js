'use strict';

const db = require('../config/db');

async function getAllDepartments() {
    const [rows] = await db.execute(
        `SELECT
            d.department_id,
            d.department_name,
            COUNT(p.program_id) AS program_count
         FROM departments AS d
         LEFT JOIN programs AS p
            ON p.department_id = d.department_id
         GROUP BY
            d.department_id,
            d.department_name
         ORDER BY d.department_name ASC`
    );

    return rows;
}

async function getDepartmentById(departmentId) {
    const [rows] = await db.execute(
        `SELECT
            department_id,
            department_name
         FROM departments
         WHERE department_id = ?
         LIMIT 1`,
        [departmentId]
    );

    return rows[0] || null;
}

async function createDepartment(departmentName) {
    const [result] = await db.execute(
        `INSERT INTO departments (department_name)
         VALUES (?)`,
        [departmentName]
    );

    return getDepartmentById(result.insertId);
}

async function updateDepartment(departmentId, departmentName) {
    const [result] = await db.execute(
        `UPDATE departments
         SET department_name = ?
         WHERE department_id = ?`,
        [departmentName, departmentId]
    );

    if (result.affectedRows === 0) {
        return null;
    }

    return getDepartmentById(departmentId);
}

async function deleteDepartment(departmentId) {
    const [result] = await db.execute(
        `DELETE FROM departments
         WHERE department_id = ?`,
        [departmentId]
    );

    return result.affectedRows > 0;
}

module.exports = {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
};