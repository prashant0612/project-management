const Task = require('../models/Task');
const Section = require('../models/Section');
const Project = require('../models/Project');

// @desc    Get tasks with filters
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    let query = {};
    
    // Apply filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.assignee) query.assigneeId = req.query.assignee;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.projectId) query.projectId = req.query.projectId;
    
    // Role-based filtering
    if (req.user.role === 'member') {
      // Members only see their own tasks
      query.assigneeId = req.user._id;
    } else if (req.user.role === 'manager') {
      // Managers see tasks from projects they manage
      const projects = await Project.find({
        $or: [
          { createdBy: req.user._id },
          { teamMembers: req.user._id }
        ]
      }).select('_id');
      
      const projectIds = projects.map(p => p._id);
      query.projectId = { $in: projectIds };
    }
    
    const tasks = await Task.find(query)
      .populate('assigneeId', 'name email')
      .populate('sectionId', 'name')
      .populate('projectId', 'name')
      .sort('-createdAt');
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const { title, description, sectionId, projectId, assigneeId, priority, dueDate } = req.body;
    
    // Check section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    // Check project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check permission
    if (req.user.role === 'member') {
      // Members can only create tasks assigned to themselves
      if (assigneeId && assigneeId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Members can only create tasks for themselves'
        });
      }
    }
    
    const task = new Task({
      title,
      description,
      sectionId,
      projectId,
      assigneeId: assigneeId || req.user._id,
      priority,
      dueDate,
      status: 'todo'
    });
    
    await task.save();
    
    const populatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email')
      .populate('sectionId', 'name')
      .populate('projectId', 'name');
    
    res.status(201).json({
      success: true,
      data: populatedTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assigneeId, status, priority, dueDate } = req.body;
    
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check permission
    const project = await Project.findById(task.projectId);
    
    if (req.user.role === 'member') {
      // Members can only update their own tasks
      if (task.assigneeId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this task'
        });
      }
      // Members can only update status
      if (status) task.status = status;
    } else {
      // Admins and managers can update all fields
      if (title) task.title = title;
      if (description) task.description = description;
      if (assigneeId) task.assigneeId = assigneeId;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (dueDate) task.dueDate = dueDate;
    }
    
    await task.save();
    
    const updatedTask = await Task.findById(id)
      .populate('assigneeId', 'name email')
      .populate('sectionId', 'name')
      .populate('projectId', 'name');
    
    res.json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check permission
    if (req.user.role === 'member') {
      // Members can only delete their own tasks
      if (task.assigneeId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this task'
        });
      }
    }
    
    await task.deleteOne();
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};