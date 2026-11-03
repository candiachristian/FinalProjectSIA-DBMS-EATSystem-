const Report = require('../models/report.model');

function isValidId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

async function getAttendanceReport(req, res) {
  try {
    const rows = await Report.getAttendanceReport();

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Attendance report error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not retrieve the attendance report.',
      data: null
    });
  }
}

async function getEventReport(req, res) {
  try {
    const { eventId } = req.params;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid eventId is required.',
        data: null
      });
    }

    const event = await Report.findEventById(Number(eventId));

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
        data: null
      });
    }

    const rows = await Report.getAttendanceReport(Number(eventId));

    return res.status(200).json({
      success: true,
      event,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Event report error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not retrieve the event report.',
      data: null
    });
  }
}

module.exports = {
  getAttendanceReport,
  getEventReport
};