'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance.controller');

router.get('/', controller.list);
router.post('/', controller.create);

router.get('/:attendanceId/notes', controller.listNotes);
router.post('/:attendanceId/notes', controller.createNote);
router.delete('/:attendanceId/notes/:noteId', controller.deleteNote);

router.put('/:id', controller.update);

module.exports = router;
