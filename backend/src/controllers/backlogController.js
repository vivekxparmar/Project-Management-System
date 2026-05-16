const Task = require("../models/Task");
const Subtask = require("../models/Subtask");

// @desc    Get all backlog tasks
// @route   GET /api/v1/backlog/:projectId
// @access  Private
const getBacklogTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const tasks = await Task.find({
      projectId,
      isInBacklog: true,
      sprintId: null,
    })
      .populate("creator assignees", "name email avatar")
      .populate({
        path: "subtasks",
        populate: [
          {
            path: "creator",
            select: "name email avatar",
          },
          {
            path: "assignee",
            select: "name email avatar",
          },
        ],
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBacklogTasks };
