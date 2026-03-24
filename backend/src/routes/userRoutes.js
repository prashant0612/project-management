const express = require("express");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");
const {
  getAllUsers,
  updateUser,
  deleteUser,
  updateUserRole, // Import the new controller
} = require("../controllers/userController");

const router = express.Router();

// All routes require authentication
router.use(auth);

// Admin and manager can view users
router.get("/", roleCheck("admin", "manager"), getAllUsers);

// Only admin can update and delete users
router.put("/:id", roleCheck("admin"), updateUser);
router.delete("/:id", roleCheck("admin"), deleteUser);
router.patch("/:id/role", roleCheck("admin"), updateUserRole); // New route for updating role

module.exports = router;
