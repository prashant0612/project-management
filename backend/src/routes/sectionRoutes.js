const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  getSectionsByProject,
  createSection,
  updateSection,
  deleteSection
} = require('../controllers/sectionController');

const router = express.Router();

router.use(auth); // All routes require authentication

router.get('/:projectId', getSectionsByProject);
router.post('/', roleCheck('admin', 'manager'), createSection);
router.put('/:id', roleCheck('admin', 'manager'), updateSection);
router.delete('/:id', roleCheck('admin', 'manager'), deleteSection);

module.exports = router;