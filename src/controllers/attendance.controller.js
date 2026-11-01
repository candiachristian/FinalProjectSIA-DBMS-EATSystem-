'use strict';
const Attendance = require('../models/attendance.model');

const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

function getAdminId(req) {
    if (req.user && (req.user.user_id || req.user.id)) return Number(req.user.user_id || req.user.id);
    if (process.env.NODE_ENV !== 'production' && process.env.DEV_ADMIN_ID) {
        return Number(process.env.DEV_ADMIN_ID);
    }
    return null;
}

function sendError(res, error) {
    if (error.httpStatus) {
        return res.status(error.httpStatus).json({ success: false, error: error.code, message: error.message });
    }
    console.error(error);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Something went wrong.' });
}

exports.list = async (req, res) => {
    try {
        const { eventId } = req.query;
        if (!isPositiveInt(eventId)) {
            return res.status(400).json({ success: false, message: 'eventId query parameter is required.' });
        }
        res.json({ success: true, data: await Attendance.getEventAttendance(Number(eventId)) });
    } catch (e) { sendError(res, e); }
};

exports.create = async (req, res) => {
    try {
        const { registrationId, status, timeIn } = req.body || {};
        if (!isPositiveInt(registrationId)) {
            return res.status(400).json({ success: false, message: 'Valid registrationId is required.' });
        }
        const recordedBy = getAdminId(req);
        if (!recordedBy) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }
        const data = await Attendance.recordAttendance({
            registrationId: Number(registrationId),
            statusName: status === undefined || status === null || status === '' ? undefined : status,
            timeIn,
            recordedBy
        });
        res.status(201).json({ success: true, data });
    } catch (e) { sendError(res, e); }
};

exports.update = async (req, res) => {
    try {
        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Valid attendance id required.' });
        }
        const { status, timeIn } = req.body || {};
        const data = await Attendance.editAttendance({
            attendanceId: Number(req.params.id),
            statusName: status === undefined || status === null || status === '' ? undefined : status,
            timeIn
        });
        res.json({ success: true, data });
    } catch (e) { sendError(res, e); }
};