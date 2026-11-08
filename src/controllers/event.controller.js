const Event = require('../models/event.model');

function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

function validateEvent(body) {
  const requiredFields = [
    'eventName',
    'eventDate',
    'startTime',
    'endTime',
    'categoryId'
  ];

  for (const field of requiredFields) {
    if (body[field] === undefined || String(body[field]).trim() === '') {
      return `${field} is required.`;
    }
  }

  if (!isValidDate(String(body.eventDate))) {
    return 'eventDate must use YYYY-MM-DD format.';
  }

  if (
    !isValidTime(String(body.startTime)) ||
    !isValidTime(String(body.endTime))
  ) {
    return 'startTime and endTime must use HH:MM or HH:MM:SS format.';
  }

  if (!isPositiveInteger(body.categoryId)) {
    return 'categoryId must be a valid positive number.';
  }

  if (
    body.gracePeriodMinutes !== undefined &&
    (!Number.isInteger(Number(body.gracePeriodMinutes)) ||
      Number(body.gracePeriodMinutes) < 0 ||
      Number(body.gracePeriodMinutes) > 180)
  ) {
    return 'gracePeriodMinutes must be a whole number from 0 to 180.';
  }

  return null;
}

function validateEventAudience(body) {
  if (body.allDepartments !== true && !isPositiveInteger(body.departmentId)) {
    return 'departmentId must be a valid positive number.';
  }

  if (
    !Array.isArray(body.programIds) ||
    body.programIds.length === 0 ||
    body.programIds.some((programId) => !isPositiveInteger(programId))
  ) {
    return 'Select at least one valid eligible program.';
  }

  return null;
}

function handleDatabaseError(error, res) {
  if (error.code === 'PROGRAM_DEPARTMENT_MISMATCH') {
    return res.status(400).json({
      success: false,
      message: error.message,
      data: null
    });
  }

  if (error.code === 'VENUE_NOT_FOUND') {
    return res.status(400).json({
      success: false,
      message: error.message,
      data: null
    });
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'A selected category, venue, status, term, or creator does not exist.',
      data: null
    });
  }

  console.error('Event API error:', error);

  return res.status(500).json({
    success: false,
    message: 'A server error occurred while processing the event.',
    data: null
  });
}

async function getEvents(req, res) {
  try {
    const { search = '', categoryId, date } = req.query;

    if (categoryId && !isPositiveInteger(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'categoryId must be a valid positive number.',
        data: null
      });
    }

    if (date && !isValidDate(String(date))) {
      return res.status(400).json({
        success: false,
        message: 'date must use YYYY-MM-DD format.',
        data: null
      });
    }

    const events = await Event.listEvents({
      search: String(search).trim(),
      categoryId,
      date
    });

    return res.status(200).json({ success: true, data: events });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

async function getEventById(req, res) {
  try {
    const { eventId } = req.params;

    if (!isPositiveInteger(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid eventId is required.',
        data: null
      });
    }

    const event = await Event.findEventById(Number(eventId));

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
        data: null
      });
    }

    return res.status(200).json({ success: true, data: event });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

async function addEvent(req, res) {
  try {
    const body = req.body || {};
    const validationError = validateEvent(body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
        data: null
      });
    }

    const audienceError = validateEventAudience(body);
    if (audienceError) {
      return res.status(400).json({
        success: false,
        message: audienceError,
        data: null
      });
    }

    const event = await Event.createEvent({
      eventName: String(body.eventName).trim(),
      eventDate: body.eventDate,
      startTime: body.startTime,
      endTime: body.endTime,
      gracePeriodMinutes: body.gracePeriodMinutes ?? 15,
      venueId: body.venueId,
      venueName: body.venue,
      categoryId: Number(body.categoryId),
      statusId: body.statusId,
      termId: body.termId,
      departmentId: body.allDepartments === true
        ? null
        : Number(body.departmentId),
      allDepartments: body.allDepartments === true,
      programIds: [...new Set(body.programIds.map(Number))],
    });

    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      data: event
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

async function editEvent(req, res) {
  try {
    const { eventId } = req.params;

    if (!isPositiveInteger(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid eventId is required.',
        data: null
      });
    }

    const body = req.body || {};
    const validationError = validateEvent(body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
        data: null
      });
    }

    const event = await Event.updateEvent(Number(eventId), {
      eventName: String(body.eventName).trim(),
      eventDate: body.eventDate,
      startTime: body.startTime,
      endTime: body.endTime,
      gracePeriodMinutes: body.gracePeriodMinutes ?? 15,
      venueId: body.venueId,
      venueName: body.venue,
      categoryId: Number(body.categoryId),
      termId: body.termId
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      data: event
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

async function deleteEvent(req, res) {
  const eventId = Number(req.params.eventId);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'A valid eventId is required.',
      data: null
    });
  }

  try {
    const deleted = await Event.deleteEvent(eventId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
      data: null
    });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete this event because registrations or attendance records reference it.',
        data: null
      });
    }

    console.error('Delete event error:', error);

    return res.status(500).json({
      success: false,
      message: 'A server error occurred while deleting the event.',
      data: null
    });
  }
}

module.exports = {
  getEvents,
  getEventById,
  addEvent,
  editEvent,
  deleteEvent
};
