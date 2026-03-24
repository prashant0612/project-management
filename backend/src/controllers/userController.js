const User = require("../models/User");
const bcrypt = require("bcryptjs");

// @desc    Get all users with filtering, searching, and pagination
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter parameters
    const { role, status, search, sortBy, sortOrder } = req.query;

    // Build filter object
    let filter = {};

    // Filter by role
    if (role && ["admin", "manager", "member"].includes(role)) {
      filter.role = role;
    }

    // Filter by status (active/inactive)
    if (status === "active" || status === "inactive") {
      filter.isActive = status === "active";
    }

    // Search functionality (search in name and email)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    let sort = {};
    const sortField = sortBy || "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    sort[sortField] = sortDirection;

    // Execute queries
    const users = await User.find(filter)
      .select("-password")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);

    // Get statistics
    const stats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format statistics
    const roleStats = {
      admin: 0,
      manager: 0,
      member: 0,
      total: totalUsers,
    };

    stats.forEach((stat) => {
      if (stat._id === "admin") roleStats.admin = stat.count;
      if (stat._id === "manager") roleStats.manager = stat.count;
      if (stat._id === "member") roleStats.member = stat.count;
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          limit,
          hasNextPage: page < Math.ceil(totalUsers / limit),
          hasPrevPage: page > 1,
        },
        stats: roleStats,
        filters: {
          role: role || null,
          search: search || null,
          status: status || null,
        },
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive, password } = req.body;
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof isActive !== "undefined") updateData.isActive = isActive;

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "User deleted successfully",
      data: {
        id: userId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};

// @desc    Update user role
// @route   PATCH /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    // Validate role
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const validRoles = ["admin", "manager", "member"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be admin, manager, or member",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent admin from changing their own role to non-admin
    if (user._id.toString() === req.user.id && role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot change your own admin role",
      });
    }

    // Check if trying to change the last admin's role
    if (user.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount === 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot change the role of the last admin user",
        });
      }
    }

    // Update role
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    res.json({
      success: true,
      message: "User role updated successfully",
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user role",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  updateUser,
  deleteUser,
  updateUserRole,
};
