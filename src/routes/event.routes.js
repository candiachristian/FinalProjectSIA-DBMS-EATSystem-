const express = require('express');
const EventController = require('../controllers/event.controller');

const router = express.Router();

router.get('/', EventController.getEvents);
router.get('/:eventId', EventController.getEventById);
router.post('/', EventController.addEvent);
router.put('/:eventId', EventController.editEvent);
router.delete('/:eventId', EventController.deleteEvent);

module.exports = router;

