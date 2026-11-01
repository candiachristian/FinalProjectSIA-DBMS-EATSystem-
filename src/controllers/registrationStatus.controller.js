'use strict';
const Status = require('../models/registrationStatus.model');

const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;
const cleanName = (v) => (typeof v === 'string' ? v.trim() : '');
const validName = (n) => n.length >= 1 && n.length <= 40;

function sendError(res, error) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, error: 'STATUS_DUPLICATE',
            message: 'That status name already exists.' });
    }
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({ success: false, error: 'STATUS_IN_USE',
            message: 'This status is used by existing registrations and cannot be deleted.' });
    }
    console.error(error);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR',
        message: 'Something went wrong.' });
}

exports.list = async (req, res) => {
    try {
        res.json({ success: true, data: await Status.listAll() });
    } catch (e) { sendError(res, e); }
};

exports.getOne = async (req, res) => {
    try {
        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ success: false,
                message: 'Valid id required.' });
        }
        const row = await Status.getById(Number(req.params.id));
        if (!row) return res.status(404).json({ success: false,
            message: 'Status not found.' });
        res.json({ success: true, data: row });
    } catch (e) { sendError(res, e); }
};

exports.create = async (req, res) => {
    try {
        const name = cleanName(req.body.statusName);
        if (!validName(name)) {
            return res.status(400).json({ success: false,
                message: 'statusName is required (1-40 characters).' });
        }
        const id = await Status.add(name);
        res.status(201).json({ success: true, data: { status_id: id, status_name: name } });
    } catch (e) { sendError(res, e); }
};

exports.update = async (req, res) => {
    try {
        const name = cleanName(req.body.statusName);
        if (!isPositiveInt(req.params.id) || !validName(name)) {
            return res.status(400).json({ success: false,
                message: 'Valid id and statusName (1-40 characters) required.' });
        }
        const existing = await Status.getById(Number(req.params.id));
        if (!existing) return res.status(404).json({ success: false,
            message: 'Status not found.' });

        if (Status.PROTECTED_NAMES.includes(existing.status_name)) {
            return res.status(409).json({ success: false, error: 'STATUS_PROTECTED',
                message: `"${existing.status_name}" is a system status and cannot be renamed.` });
        }
        await Status.update(existing.status_id, name);
        res.json({ success: true, data: { status_id: existing.status_id, status_name: name } });
    } catch (e) { sendError(res, e); }
};

exports.remove = async (req, res) => {
    try {
        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ success: false,
                message: 'Valid id required.' });
        }
        const existing = await Status.getById(Number(req.params.id));
        if (!existing) return res.status(404).json({ success: false,
            message: 'Status not found.' });

        if (Status.PROTECTED_NAMES.includes(existing.status_name)) {
            return res.status(409).json({ success: false, error: 'STATUS_PROTECTED',
                message: `"${existing.status_name}" is a system status and cannot be deleted.` });
        }
        await Status.remove(existing.status_id);
        res.json({ success: true,
            message: 'Status deleted.' });
    } catch (e) { sendError(res, e); }
};