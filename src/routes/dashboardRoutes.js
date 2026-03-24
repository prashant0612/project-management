const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  getAdminDashboard,
  getManagerDashboard,
  getMemberDashboard
} = require('../controllers/dashboardController');

const router = express.Router();

router.use(auth);

router.get('/admin', roleCheck('admin'), getAdminDashboard);
router.get('/manager', roleCheck('manager'), getManagerDashboard);
router.get('/member', roleCheck('member'), getMemberDashboard);

module.exports = router;