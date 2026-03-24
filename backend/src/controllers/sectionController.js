const Section = require('../models/Section');
const Project = require('../models/Project');
const Task = require('../models/Task');

// @desc    Get sections by project
// @route   GET /api/sections/:projectId
// @access  Private
const getSectionsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Check project exists and user has access
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check access
    if (req.user.role !== 'admin' && 
        project.createdBy.toString() !== req.user._id.toString() &&
        !project.teamMembers.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const sections = await Section.find({ projectId }).sort('createdAt');
    
    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create section
// @route   POST /api/sections
// @access  Private (Admin & Manager)
const createSection = async (req, res) => {
  try {
    // Check role
    if (req.user.role === 'member') {
      return res.status(403).json({
        success: false,
        message: 'Only admins and managers can create sections'
      });
    }
    
    const { name, projectId } = req.body;
    
    // Check project exists and user has access
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add sections to this project'
      });
    }
    
    const section = new Section({
      name,
      projectId
    });
    
    await section.save();
    
    res.status(201).json({
      success: true,
      data: section
    });
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update section
// @route   PUT /api/sections/:id
// @access  Private (Admin & Manager)
const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const section = await Section.findById(id);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    // Check permission
    const project = await Project.findById(section.projectId);
    
    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this section'
      });
    }
    
    if (name) section.name = name;
    await section.save();
    
    res.json({
      success: true,
      data: section
    });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete section
// @route   DELETE /api/sections/:id
// @access  Private (Admin & Manager)
const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    
    const section = await Section.findById(id);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    // Check permission
    const project = await Project.findById(section.projectId);
    
    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this section'
      });
    }
    
    // Delete all tasks in this section
    await Task.deleteMany({ sectionId: id });
    await section.deleteOne();
    
    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getSectionsByProject,
  createSection,
  updateSection,
  deleteSection
};