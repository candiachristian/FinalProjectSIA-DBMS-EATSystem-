'use strict';
const Registration = require('../models/registration.model');

const VALID_STATUSES = ['Registered', 'Cancelled'];
const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

function getAdminId(req) {
    if (req.user && (req.user.user_id || req.user.id)) return req.user.user_id || req.user.id;
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
        const { eventId, student_id } = req.query;
        if (eventId !== undefined) {
            if (!isPositiveInt(eventId)) {
                return res.status(400).json({ success: false, message: 'eventId must be a positive number.' });
            }
            return res.json({ success: true, data: await Registration.getRosterByEvent(Number(eventId)) });
        }
        if (student_id !== undefined) {
            if (!isPositiveInt(student_id)) {
                return res.status(400).json({ success: false, message: 'student_id must be a positive number.' });
            }
            return res.json({ success: true, data: await Registration.listForStudent(Number(student_id)) });
        }
        return res.status(400).json({ success: false, message: 'eventId query parameter is required.' });
    } catch (e) { sendError(res, e); }
};

exports.create = async (req, res) => {
    try {
        const { studentId, eventId } = req.body;
        if (!isPositiveInt(studentId) || !isPositiveInt(eventId)) {
            return res.status(400).json({ success: false, message: 'Valid studentId and eventId are required.' });
        }
        const registeredBy = getAdminId(req);
        if (registeredBy == null) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }
        const data = await Registration.createRegistration({
            studentId: Number(studentId), eventId: Number(eventId), registeredBy });
        res.status(201).json({ success: true, data });
    } catch (e) { sendError(res, e); }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!isPositiveInt(req.params.id) || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid id and status (Registered or Cancelled) required.' });
        }
        const data = await Registration.updateStatusByName(Number(req.params.id), status);
        res.json({ success: true, data });
    } catch (e) { sendError(res, e); }
};

exports.remove = async (req, res) => {
    try {
        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Valid id required.' });
        }
        await Registration.deleteRegistration(Number(req.params.id));
        res.json({ success: true, message: 'Registration deleted.' });
    } catch (e) { sendError(res, e); }
};

exports.lookupStudents = async (req, res) => {
    try {
        const term = String(req.query.search || '').trim();
        if (term.length < 1) {
            return res.status(400).json({ success: false, message: 'search is required.' });
        }
        res.json({ success: true, data: await Registration.searchStudents(term) });
    } catch (e) { sendError(res, e); }
};

exports.lookupEvents = async (req, res) => {
    try {
        res.json({ success: true, data: await Registration.listEvents() });
    } catch (e) { sendError(res, e); }
};