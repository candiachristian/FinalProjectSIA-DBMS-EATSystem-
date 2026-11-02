'use strict';

const express = require('express');
const controller = require('../controllers/program.controller');

const router = express.Router();

router.get('/', controller.getAllPrograms);
router.get('/:id', controller.getProgramById);
router.post('/', controller.createProgram);
router.put('/:id', controller.updateProgram);
router.delete('/:id', controller.deleteProgram);

module.exports = router;
