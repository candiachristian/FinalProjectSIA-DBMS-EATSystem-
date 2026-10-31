const express = require('express');
const ReportController = require('../controllers/report.controller');

const router = express.Router();

router.get('/attendance', ReportController.getAttendanceReport);
router.get('/events/:eventId', ReportController.getEventReport);

module.exports = router;