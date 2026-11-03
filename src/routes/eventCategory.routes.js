const express = require('express');
const EventCategoryController =
  require('../controllers/eventCategory.controller');

const router = express.Router();

router.get('/', EventCategoryController.getCategories);

module.exports = router;
