const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  getProjects,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/projectController');

const router = express.Router();

router.use(auth); // All routes require authentication

router.get('/', getProjects);
router.post('/', roleCheck('admin', 'manager'), createProject);
router.put('/:id', roleCheck('admin', 'manager'), updateProject);
router.delete('/:id', roleCheck('admin', 'manager'), deleteProject);

module.exports = router;