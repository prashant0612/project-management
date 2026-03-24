const { Parser } = require('json2csv');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Export filtered data to CSV
// @route   POST /api/export
// @access  Private (Admin & Manager)
const exportData = async (req, res) => {
  try {
    // Check permission
    if (req.user.role === 'member') {
      return res.status(403).json({
        success: false,
        message: 'Only admins and managers can export data'
      });
    }
    
    const { type, filters, format = 'csv' } = req.body;
    
    let data = [];
    let fields = [];
    
    // Get data based on type
    if (type === 'tasks') {
      let query = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.assignee) query.assigneeId = filters.assignee;
      if (filters.projectId) query.projectId = filters.projectId;
      if (filters.dateRange) {
        query.dueDate = {};
        if (filters.dateRange.from) query.dueDate.$gte = new Date(filters.dateRange.from);
        if (filters.dateRange.to) query.dueDate.$lte = new Date(filters.dateRange.to);
      }
      
      // Role-based filtering
      if (req.user.role === 'manager') {
        const projects = await Project.find({
          $or: [
            { createdBy: req.user._id },
            { teamMembers: req.user._id }
          ]
        }).select('_id');
        query.projectId = { $in: projects.map(p => p._id) };
      }
      
      const tasks = await Task.find(query)
        .populate('assigneeId', 'name email')
        .populate('projectId', 'name')
        .populate('sectionId', 'name');
      
      data = tasks.map(task => ({
        'Task Title': task.title,
        'Description': task.description,
        'Project': task.projectId?.name,
        'Section': task.sectionId?.name,
        'Assignee': task.assigneeId?.name,
        'Status': task.status,
        'Priority': task.priority,
        'Due Date': task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
        'Created At': new Date(task.createdAt).toLocaleDateString()
      }));
      
      fields = ['Task Title', 'Description', 'Project', 'Section', 'Assignee', 'Status', 'Priority', 'Due Date', 'Created At'];
      
    } else if (type === 'projects') {
      let query = {};
      
      if (req.user.role === 'manager') {
        query = {
          $or: [
            { createdBy: req.user._id },
            { teamMembers: req.user._id }
          ]
        };
      }
      
      const projects = await Project.find(query)
        .populate('createdBy', 'name')
        .populate('teamMembers', 'name');
      
      data = projects.map(project => ({
        'Project Name': project.name,
        'Description': project.description,
        'Status': project.status,
        'Created By': project.createdBy?.name,
        'Team Members': project.teamMembers.map(m => m.name).join(', '),
        'Created At': new Date(project.createdAt).toLocaleDateString()
      }));
      
      fields = ['Project Name', 'Description', 'Status', 'Created By', 'Team Members', 'Created At'];
    }
    
    // Convert to CSV
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    
    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_export_${Date.now()}.csv`);
    
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  exportData
};