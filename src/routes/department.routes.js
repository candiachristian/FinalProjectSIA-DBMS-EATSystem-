'use strict';

const express = require('express');
const controller = require('../controllers/department.controller');

const router = express.Router();

router.get('/', controller.getAllDepartments);
router.get('/:id', controller.getDepartmentById);
router.post('/', controller.createDepartment);
router.put('/:id', controller.updateDepartment);
router.delete('/:id', controller.deleteDepartment);

module.exports = router;