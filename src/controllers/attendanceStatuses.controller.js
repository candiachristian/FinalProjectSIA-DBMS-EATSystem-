'use strict';

const AttendanceStatus = require('../models/attendanceStatus.model');

const MAX_STATUS_NAME_LENGTH = 40;

function parseId(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }

    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validateStatusBody(body) {
    const { statusName } = body || {};

    if (typeof statusName !== 'string' || !statusName.trim()) {
        return { error: 'statusName is required and must be a non-empty string.' };
    }

    const name = statusName.trim();

    if (name.length > MAX_STATUS_NAME_LENGTH) {
        return {
            error: `statusName must not exceed ${MAX_STATUS_NAME_LENGTH} characters.`
        };
    }

    return { value: { statusName: name } };
}

function badRequest(res, message) {
    return res.status(400).json({ success: false, message });
}

function notFound(res) {
    return res.status(404).json({
        success: false,
        message: 'Attendance status not found.'
    });
}

function duplicateName(res) {
    return res.status(409).json({
        success: false,
        message: 'Attendance status name already exists.'
    });
}

async function getAllStatuses(req, res, next) {
    try {
        const statuses = await AttendanceStatus.getAllStatuses();

        return res.status(200).json({
            success: true,
            data: statuses
        });
    } catch (error) {
        next(error);
    }
}

async function getStatusById(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (id === null) {
            return badRequest(res, 'Invalid attendance status ID.');
        }

        const status = await AttendanceStatus.getStatusById(id);

        if (!status) {
            return notFound(res);
        }

        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        next(error);
    }
}

async function createStatus(req, res, next) {
    try {
        const { error, value } = validateStatusBody(req.body);

        if (error) {
            return badRequest(res, error);
        }

        const status = await AttendanceStatus.createStatus(value);

        return res.status(201).json({
            success: true,
            message: 'Attendance status created successfully.',
            data: status
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return duplicateName(res);
        }

        next(error);
    }
}

async function updateStatus(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (id === null) {
            return badRequest(res, 'Invalid attendance status ID.');
        }

        const { error, value } = validateStatusBody(req.body);

        if (error) {
            return badRequest(res, error);
        }

        const status = await AttendanceStatus.updateStatus(id, value);

        if (!status) {
            return notFound(res);
        }

        return res.status(200).json({
            success: true,
            message: 'Attendance status updated successfully.',
            data: status
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return duplicateName(res);
        }

        next(error);
    }
}

async function deleteStatus(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (id === null) {
            return badRequest(res, 'Invalid attendance status ID.');
        }

        const deleted = await AttendanceStatus.deleteStatus(id);

        if (!deleted) {
            return notFound(res);
        }

        return res.status(200).json({
            success: true,
            message: 'Attendance status deleted successfully.'
        });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                success: false,
                message:
                    'Attendance status cannot be deleted because it is being used by an attendance record or correction.'
            });
        }

        next(error);
    }
}

module.exports = {
    getAllStatuses,
    getStatusById,
    createStatus,
    updateStatus,
    deleteStatus
};