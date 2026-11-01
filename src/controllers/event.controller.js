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
    'venue',
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

  if (!isValidTime(String(body.startTime)) || !isValidTime(String(body.endTime))) {
    return 'startTime and endTime must use HH:MM or HH:MM:SS format.';
  }

  if (!isPositiveInteger(body.categoryId)) {
    return 'categoryId must be a valid positive number.';
  }

  return null;
}

function sendDatabaseError(error, res) {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'The selected event category does not exist.',
      data: null
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: 'A server error occurred while processing the event.',
    data: null
  });
}

async function getEvents(req, res) {
  try {
    const search = String(req.query.search || '').trim();
    const categoryId = req.query.categoryId;
    const date = req.query.date;

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

    const events = await Event.listEvents({ search, categoryId, date });

    return res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    return sendDatabaseError(error, res);
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

    return res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    return sendDatabaseError(error, res);
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

    const event = await Event.createEvent({
      eventName: String(body.eventName).trim(),
      description: body.description
        ? String(body.description).trim()
        : null,
      eventDate: body.eventDate,
      startTime: body.startTime,
      endTime: body.endTime,
      venue: String(body.venue).trim(),
      categoryId: Number(body.categoryId)
    });

    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      data: event
    });
  } catch (error) {
    return sendDatabaseError(error, res);
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
      description: body.description
        ? String(body.description).trim()
        : null,
      eventDate: body.eventDate,
      startTime: body.startTime,
      endTime: body.endTime,
      venue: String(body.venue).trim(),
      categoryId: Number(body.categoryId)
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
    return sendDatabaseError(error, res);
  }
}

module.exports = {
  getEvents,
  getEventById,
  addEvent,
  editEvent
};
