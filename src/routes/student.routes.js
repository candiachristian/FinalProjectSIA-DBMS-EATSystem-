const express = require('express');
const StudentController = require('../controllers/student.controller');

const router = express.Router();

router.get('/', StudentController.getStudents);
router.post('/', StudentController.addStudent);
router.get('/:studentId', StudentController.getStudentById);
router.put('/:studentId', StudentController.editStudent);
router.delete('/:studentId', StudentController.deleteStudent);

module.exports = router;
