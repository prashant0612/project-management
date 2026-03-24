const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { exportData } = require('../controllers/exportController');

const router = express.Router();

router.use(auth);
router.post('/', roleCheck('admin', 'manager'), exportData);

module.exports = router;