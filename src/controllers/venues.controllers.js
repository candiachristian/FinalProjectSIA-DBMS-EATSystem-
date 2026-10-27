'use strict';

const Venue = require('../models/venues.model');

const MAX_VENUE_NAME_LENGTH = 120;
const MAX_LOCATION_LENGTH = 150;

function parseId(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }

    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function validateVenueBody(body) {
    const { venueName, location } = body || {};

    if (typeof venueName !== 'string' || !venueName.trim()) {
        return { error: 'venueName is required and must be a non-empty string.' };
    }

    const name = venueName.trim();

    if (name.length > MAX_VENUE_NAME_LENGTH) {
        return {
            error: `venueName must not exceed ${MAX_VENUE_NAME_LENGTH} characters.`
        };
    }

    let loc = null;

    if (location !== undefined && location !== null) {
        if (typeof location !== 'string') {
            return { error: 'location must be a string.' };
        }

        loc = location.trim() || null;

        if (loc && loc.length > MAX_LOCATION_LENGTH) {
            return {
                error: `location must not exceed ${MAX_LOCATION_LENGTH} characters.`
            };
        }
    }

    return { value: { venueName: name, location: loc } };
}

function badRequest(res, message) {
    return res.status(400).json({ success: false, message });
}

function notFound(res) {
    return res.status(404).json({
        success: false,
        message: 'Venue not found.'
    });
}

async function getAllVenues(req, res, next) {
    try {
        const venues = await Venue.getAllVenues();

        return res.status(200).json({
            success: true,
            data: venues
        });
    } catch (error) {
        next(error);
    }
}

async function getVenueById(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (id === null) {
            return badRequest(res, 'Invalid venue ID.');
        }

        const venue = await Venue.getVenueById(id);

        if (!venue) {
            return notFound(res);
        }

        return res.status(200).json({
            success: true,
            data: venue
        });
    } catch (error) {
        next(error);
    }
}

async function createVenue(req, res, next) {
    try {
        const { error, value } = validateVenueBody(req.body);

        if (error) {
            return badRequest(res, error);
        }

        const venue = await Venue.createVenue(value);

        return res.status(201).json({
            success: true,
            message: 'Venue created successfully.',
            data: venue
        });
    } catch (error) {
        if (error.code === 'ER_DATA_TOO_LONG') {
            return badRequest(res, 'One of the provided values is too long.');
        }

        next(error);
    }
}

async function updateVenue(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (id === null) {
            return badRequest(res, 'Invalid venue ID.');
        }

        const { error, value } = validateVenueBody(req.body);

        if (error) {
            return badRequest(res, error);
        }

        const venue = await Venue.updateVenue(id, value);

        if (!venue) {
            return notFound(res);
        }

        return res.status(200).json({
            success: true,
            message: 'Venue updated successfully.',
            data: venue
        });
    } catch (error) {
        if (error.code === 'ER_DATA_TOO_LONG') {
            return badRequest(res, 'One of the provided values is too long.');
        }

        next(error);
    }
}

async function deleteVenue(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (id === null) {
            return badRequest(res, 'Invalid venue ID.');
        }

        const deleted = await Venue.deleteVenue(id);

        if (!deleted) {
            return notFound(res);
        }

        return res.status(200).json({
            success: true,
            message: 'Venue deleted successfully.'
        });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                success: false,
                message:
                    'Venue cannot be deleted because it is being used by an event.'
            });
        }

        next(error);
    }
}

module.exports = {
    getAllVenues,
    getVenueById,
    createVenue,
    updateVenue,
    deleteVenue
};