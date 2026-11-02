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




department.controller.js

'use strict';

const Department = require('../models/department.model');

const MAX_DEPARTMENT_NAME_LENGTH = 120;

function parseId(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }

    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return null;
    }

    return id;
}

function getDepartmentNameFromRequest(req) {
    const body = req.body || {};

    const value = body.departmentName ?? body.department_name;

    if (value === undefined || value === null) {
        return null;
    }

    return String(value).trim();
}

function validateDepartmentName(departmentName) {
    if (departmentName === null || departmentName === undefined) {
        return 'departmentName is required.';
    }

    if (typeof departmentName !== 'string') {
        return 'departmentName must be text.';
    }

    if (departmentName.length === 0) {
        return 'departmentName cannot be empty.';
    }

    if (departmentName.length > MAX_DEPARTMENT_NAME_LENGTH) {
        return `departmentName must not exceed ${MAX_DEPARTMENT_NAME_LENGTH} characters.`;
    }

    return null;
}

function handleDatabaseError(error, res) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: 'A department with that name already exists.',
            data: null
        });
    }

    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
            success: false,
            message:
                'This department cannot be deleted because it is being used by a program.',
            data: null
        });
    }

    if (error.code === 'ER_DATA_TOO_LONG') {
        return res.status(400).json({
            success: false,
            message: 'Department name must not exceed 120 characters.',
            data: null
        });
    }

    console.error('Department API error:', error);

    return res.status(500).json({
        success: false,
        message: 'A server error occurred while processing the department request.',
        data: null
    });
}

async function getAllDepartments(req, res) {
    try {
        const departments = await Department.getAllDepartments();

        return res.status(200).json({
            success: true,
            data: departments
        });
    } catch (error) {
        return handleDatabaseError(error, res);
    }
}

async function getDepartmentById(req, res) {
    try {
        const departmentId = parseId(req.params.id);

        if (departmentId === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid department ID.',
                data: null
            });
        }

        const department = await Department.getDepartmentById(departmentId);

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found.',
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            data: department
        });
    } catch (error) {
        return handleDatabaseError(error, res);
    }
}

async function createDepartment(req, res) {
    try {
        const departmentName = getDepartmentNameFromRequest(req);
        const validationError = validateDepartmentName(departmentName);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError,
                data: null
            });
        }

        const department = await Department.createDepartment(departmentName);

        return res.status(201).json({
            success: true,
            message: 'Department created successfully.',
            data: department
        });
    } catch (error) {
        return handleDatabaseError(error, res);
    }
}

async function updateDepartment(req, res) {
    try {
        const departmentId = parseId(req.params.id);

        if (departmentId === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid department ID.',
                data: null
            });
        }

        const departmentName = getDepartmentNameFromRequest(req);
        const validationError = validateDepartmentName(departmentName);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError,
                data: null
            });
        }

        const department = await Department.updateDepartment(
            departmentId,
            departmentName
        );

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found.',
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Department updated successfully.',
            data: department
        });
    } catch (error) {
        return handleDatabaseError(error, res);
    }
}

async function deleteDepartment(req, res) {
    try {
        const departmentId = parseId(req.params.id);

        if (departmentId === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid department ID.',
                data: null
            });
        }

        const deleted = await Department.deleteDepartment(departmentId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Department not found.',
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Department deleted successfully.',
            data: null
        });
    } catch (error) {
        return handleDatabaseError(error, res);
    }
}

module.exports = {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
};