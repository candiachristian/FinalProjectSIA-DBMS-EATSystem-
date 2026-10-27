const Registration = require('../models/registration.model');

function isPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function getRegistrations(req, res, next) {
    try {
        const { student_id } = req.query;

        if (!student_id) {
            return res.status(400).json({
                success: false,
                message: 'student_id is required'
            });
        }

        if (!isPositiveInteger(student_id)) {
            return res.status(400).json({
                success: false,
                message: 'student_id must be a positive integer'
            });
        }

        const registrations =
            await Registration.listForStudent(Number(student_id));

        return res.status(200).json({
            success: true,
            data: registrations
        });

    } catch (error) {
        next(error);
    }
}

async function getRegistration(req, res, next) {
    try {
        const { id } = req.params;

        if (!isPositiveInteger(id)) {
            return res.status(400).json({
                success: false,
                message: 'registration id must be a positive integer'
            });
        }

        const registration =
            await Registration.getById(Number(id));

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: registration
        });

    } catch (error) {
        next(error);
    }
}

async function createRegistration(req, res, next) {
    try {
        const {
            student_id,
            event_id,
            registration_status_id
        } = req.body;

        if (
            !isPositiveInteger(student_id) ||
            !isPositiveInteger(event_id) ||
            !isPositiveInteger(registration_status_id)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'student_id, event_id, and registration_status_id must be positive integers'
            });
        }

        const duplicate =
            await Registration.findDuplicate(
                Number(student_id),
                Number(event_id)
            );

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: 'Student is already registered for this event'
            });
        }

        const registrationId =
            await Registration.add(
                Number(student_id),
                Number(event_id),
                Number(registration_status_id)
            );

        const registration =
            await Registration.getById(registrationId);

        return res.status(201).json({
            success: true,
            message: 'Registration created successfully',
            data: registration
        });

    } catch (error) {

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Student is already registered for this event'
            });
        }

        next(error);
    }
}

async function updateRegistration(req, res, next) {
    try {
        const { id } = req.params;
        const { registration_status_id } = req.body;

        if (!isPositiveInteger(id)) {
            return res.status(400).json({
                success: false,
                message: 'registration id must be a positive integer'
            });
        }

        if (!isPositiveInteger(registration_status_id)) {
            return res.status(400).json({
                success: false,
                message:
                    'registration_status_id must be a positive integer'
            });
        }

        const existing =
            await Registration.getById(Number(id));

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        await Registration.updateStatus(
            Number(id),
            Number(registration_status_id)
        );

        const updated =
            await Registration.getById(Number(id));

        return res.status(200).json({
            success: true,
            message: 'Registration updated successfully',
            data: updated
        });

    } catch (error) {
        next(error);
    }
}

async function deleteRegistration(req, res, next) {
    try {
        const { id } = req.params;

        if (!isPositiveInteger(id)) {
            return res.status(400).json({
                success: false,
                message: 'registration id must be a positive integer'
            });
        }

        const existing =
            await Registration.getById(Number(id));

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        await Registration.remove(Number(id));

        return res.status(200).json({
            success: true,
            message: 'Registration cancelled/deleted successfully'
        });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    getRegistrations,
    getRegistration,
    createRegistration,
    updateRegistration,
    deleteRegistration
};