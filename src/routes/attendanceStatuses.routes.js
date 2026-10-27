'use strict';

const express = require('express');
const attendanceStatusController = require('../controllers/attendanceStatus.controller');

const router = express.Router();

router.get('/', attendanceStatusController.getAllStatuses);
router.get('/:id', attendanceStatusController.getStatusById);
router.post('/', attendanceStatusController.createStatus);
router.put('/:id', attendanceStatusController.updateStatus);
router.delete('/:id', attendanceStatusController.deleteStatus);

module.exports = router;