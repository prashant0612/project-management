const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const { register, login, getMe, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], login);

router.get('/me', auth, getMe);
router.post('/logout', auth, logout);

module.exports = router;