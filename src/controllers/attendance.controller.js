'use strict';

const Attendance = require('../models/attendance.model');
const AttendanceNote = require('../models/attendanceNote.model');

const isPositiveInt = (value) =>
  Number.isInteger(Number(value)) && Number(value) > 0;

function sendError(res, error) {
  if (error.httpStatus ) {
    return res.status(error.httpStatus ).json({
      success: false,
      error: error.code,
      message: error.message,
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    error: 'SERVER_ERROR',
    message: 'Something went wrong.',
  });
}

exports.list = async (req, res) => {
  try {
    const { eventId } = req.query;

    if (!isPositiveInt(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'eventId query parameter is required.',
      });
    }

    const data = await Attendance.getEventAttendance(Number(eventId));
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.create = async (req, res) => {
  try {
    const { registrationId, status, timeIn } = req.body || {};

    if (!isPositiveInt(registrationId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid registrationId is required.',
      });
    }

    const data = await Attendance.recordAttendance({
      registrationId: Number(registrationId),
      statusName:
        status === undefined || status === null || status === ''
          ? undefined
          : status,
      timeIn,
      recordedBy: null,
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.update = async (req, res) => {
  try {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid attendance id required.',
      });
    }

    const { status, timeIn } = req.body || {};

    const data = await Attendance.editAttendance({
      attendanceId: Number(req.params.id),
      statusName:
        status === undefined || status === null || status === ''
          ? undefined
          : status,
      timeIn,
    });

    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.listNotes = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    if (!isPositiveInt(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid attendanceId is required.',
      });
    }

    const data = await AttendanceNote.listNotes(Number(attendanceId));
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.createNote = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const noteText = String(req.body?.noteText || '').trim();

    if (!isPositiveInt(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid attendanceId is required.',
      });
    }

    if (!noteText || noteText.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Note text is required and must be 255 characters or fewer.',
      });
    }

    const data = await AttendanceNote.addNote(
      Number(attendanceId),
      noteText,
    );

    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { attendanceId, noteId } = req.params;

    if (!isPositiveInt(attendanceId) || !isPositiveInt(noteId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid attendanceId and noteId are required.',
      });
    }

    const deleted = await AttendanceNote.deleteNote(
      Number(attendanceId),
      Number(noteId),
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Attendance note not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Attendance note deleted.',
    });
  } catch (error) {
    return sendError(res, error);
  }
};
