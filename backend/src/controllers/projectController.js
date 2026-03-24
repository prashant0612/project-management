const Project = require('../models/Project');
const Task = require('../models/Task');
const Section = require('../models/Section');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    let query = {};
    
    // Filter based on role
    if (req.user.role === 'admin') {
      // Admin sees all projects
      query = {};
    } else if (req.user.role === 'manager') {
      // Manager sees projects they created or are team member
      query = {
        $or: [
          { createdBy: req.user._id },
          { teamMembers: req.user._id }
        ]
      };
    } else {
      // Member sees projects they are team member of
      query = { teamMembers: req.user._id };
    }
    
    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .populate('teamMembers', 'name email')
      .sort('-createdAt');
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private (Admin & Manager)
const createProject = async (req, res) => {
  try {
    // Check role
    if (req.user.role === 'member') {
      return res.status(403).json({
        success: false,
        message: 'Only admins and managers can create projects'
      });
    }
    
    const { name, description, teamMembers } = req.body;
    
    const project = new Project({
      name,
      description,
      teamMembers: teamMembers || [],
      createdBy: req.user._id
    });
    
    await project.save();
    
    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin & Manager)
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, teamMembers } = req.body;
    
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check permission
    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }
    
    // Update fields
    if (name) project.name = name;
    if (description) project.description = description;
    if (status) project.status = status;
    if (teamMembers) project.teamMembers = teamMembers;
    
    await project.save();
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin & Manager)
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check permission
    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project'
      });
    }
    
    // Delete all sections and tasks in this project
    await Section.deleteMany({ projectId: id });
    await Task.deleteMany({ projectId: id });
    await project.deleteOne();
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getProjects,
  createProject,
  updateProject,
  deleteProject
};