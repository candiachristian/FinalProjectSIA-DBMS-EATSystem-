'use strict';

const express = require('express');
const venueController = require('../controllers/venues.controller');

const router = express.Router();

router.get('/', venueController.getAllVenues);
router.get('/:id', venueController.getVenueById);
router.post('/', venueController.createVenue);
router.put('/:id', venueController.updateVenue);
router.delete('/:id', venueController.deleteVenue);

module.exports = router;