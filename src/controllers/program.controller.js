'use strict';

const Program = require('../models/program.model');

const MAX_PROGRAM_NAME_LENGTH = 120;

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

function parseQueryId(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    return parseId(String(value));
}

function getProgramNameFromRequest(req) {
    const body = req.body || {};

    const value = body.programName ?? body.program_name;

    if (value === undefined || value === null) {
        return null;
    }

    return String(value).trim();
}

function getDepartmentIdFromRequest(req) {
    const body = req.body || {};

    const value = body.departmentId ?? body.department_id;

    if (value === undefined || value === null || value === '') {
        return null;
    }

    return parseId(String(value));
}

function validateProgramName(programName) {
    if (programName === null || programName === undefined) {
        return 'programName is required.';
    }

    if (typeof programName !== 'string') {
        return 'programName must be text.';
    }

    if (programName.trim().length === 0) {
        return 'programName cannot be empty.';
    }

    if (programName.length > MAX_PROGRAM_NAME_LENGTH) {
        return `programName must not exceed ${MAX_PROGRAM_NAME_LENGTH} characters.`;
    }

    return null;
}

function handleDatabaseError(error, res) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message:
                'A program with that name already exists in the selected department.',
            data: null
        });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            success: false,
            message: 'The selected department does not exist.',
            data: null
        });
    }

    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
            success: false,
            message:
                'This program cannot be deleted because it is being used by a student or event.',
            data: null
        });
    }

    if (error.code === 'ER_DATA_TOO_LONG') {
        return res.status(400).json({
            success: false,
            message: 'Program name must not exceed 120 characters.',
            data: null
        });
    }

    console.error('Program API error:', error);

    return res.status(500).json({
        success: false,
        message: 'A server error occurred while processing the program request.',
        data: null
    });
}

async function getAllPrograms(req, res) {
    try {
        const rawDepartmentId = req.query.departmentId;

        let departmentId = null;

        if (
            rawDepartmentId !== undefined &&
            rawDepartmentId !== null &&
            rawDepartmentId !== ''
        ) {
            departmentId = parseQueryId(rawDepartmentId);

            if (departmentId === null) {
                return res.status(400).json({
                    success: false,
                    message: 'departmentId must be a valid positive number.',
                    data: null
                });
            }
        }

        const programs = await Program.getAllPrograms(departmentId);

        return res.status(200).json({
            success: true,
            data: programs
        });
    } catch (error) {
        return handleDatabaseError(error, res);
    }
}

async function getProgramById(req, res) {
    try {
        const programId = parseId(req.params.id);

        if (programId === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID.',
                data: null
            });
        }

        const program = await Program.getProgramById(programId);

        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Program not found.',
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            data: program
        });
    } catch (error) {
        return handleDatabaseError(error, res);
    }
}

async function createProgram(req, res) {
    try {
        const programName = getProgramNameFromRequest(req);
        const departmentId = getDepartmentIdFromRequest(req);

        const nameError = validateProgramName(programName);

        if (nameError) {
            return res.status(400).json({
                success: false,
                message: nameError,
                data: null
            });
        }

        if (departmentId === null) {
            return res.status(400).json({
                success: false,
                message: 'departmentId is required and must be valid.',
                data: null
            });
        }

        const program = await Program.createProgram(
            programName,
            departmentId
        );

        return res.status(201).json({
            success: true,
            message: 'Program created successfully.',
            data: program
        });
    } catch (error) {
        return handleDatabaseError(error, res);
    }
}

async function updateProgram(req, res) {
    try {
        const programId = parseId(req.params.id);

        if (programId === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID.',
                data: null
            });
        }

        const programName = getProgramNameFromRequest(req);
        const departmentId = getDepartmentIdFromRequest(req);

        const nameError = validateProgramName(programName);

        if (nameError) {
            return res.status(400).json({
                success: false,
                message: nameError,
                data: null
            });
        }

        if (departmentId === null) {
            return res.status(400).json({
                success: false,
                message: 'departmentId is required and must be valid.',
                data: null
            });
        }

        const program = await Program.updateProgram(
            programId,
            programName,
            departmentId
        );

        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Program not found.',
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Program updated successfully.',
            data: program
        });
    } catch (error) {
        return handleDatabaseError(error, res);
    }
}

async function deleteProgram(req, res) {
    try {
        const programId = parseId(req.params.id);

        if (programId === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID.',
                data: null
            });
        }

        const deleted = await Program.deleteProgram(programId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Program not found.',
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Program deleted successfully.',
            data: null
        });
    } catch (error) {
        return handleDatabaseError(error, res);
    }
}

module.exports = {
    getAllPrograms,
    getProgramById,
    createProgram,
    updateProgram,
    deleteProgram
};
