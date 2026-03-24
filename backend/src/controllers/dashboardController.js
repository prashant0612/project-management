const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

// @desc    Admin dashboard stats
// @route   GET /api/dashboard/admin
// @access  Private (Admin only)
const getAdminDashboard = async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments();
    const totalTasks = await Task.countDocuments();
    const totalUsers = await User.countDocuments();
    
    const projectsByStatus = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const tasksByStatus = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalProjects,
        totalTasks,
        totalUsers,
        projectsByStatus,
        tasksByStatus
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Manager dashboard overview
// @route   GET /api/dashboard/manager
// @access  Private (Manager only)
const getManagerDashboard = async (req, res) => {
  try {
    // Get projects managed by this manager
    const projects = await Project.find({
      $or: [
        { createdBy: req.user._id },
        { teamMembers: req.user._id }
      ]
    }).select('_id');
    
    const projectIds = projects.map(p => p._id);
    
    // Get tasks from these projects
    const totalTasks = await Task.countDocuments({ projectId: { $in: projectIds } });
    const completedTasks = await Task.countDocuments({ 
      projectId: { $in: projectIds },
      status: 'done'
    });
    
    const tasksByStatus = await Task.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const teamMembers = await User.find({
      _id: { $in: projects.flatMap(p => p.teamMembers) }
    }).select('name email');
    
    res.json({
      success: true,
      data: {
        totalProjects: projects.length,
        totalTasks,
        completedTasks,
        completionRate: totalTasks ? (completedTasks / totalTasks * 100).toFixed(2) : 0,
        tasksByStatus,
        teamMembers
      }
    });
  } catch (error) {
    console.error('Manager dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Member dashboard tasks
// @route   GET /api/dashboard/member
// @access  Private (Member only)
const getMemberDashboard = async (req, res) => {
  try {
    const tasks = await Task.find({ assigneeId: req.user._id })
      .populate('projectId', 'name')
      .populate('sectionId', 'name')
      .sort('dueDate');
    
    const todoTasks = tasks.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    const reviewTasks = tasks.filter(t => t.status === 'review');
    const completedTasks = tasks.filter(t => t.status === 'done');
    
    // Calendar view - tasks grouped by due date
    const upcomingTasks = tasks
      .filter(t => t.status !== 'done' && t.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 10);
    
    res.json({
      success: true,
      data: {
        tasks,
        stats: {
          total: tasks.length,
          todo: todoTasks.length,
          inProgress: inProgressTasks.length,
          review: reviewTasks.length,
          completed: completedTasks.length
        },
        upcomingTasks
      }
    });
  } catch (error) {
    console.error('Member dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
  getMemberDashboard
};