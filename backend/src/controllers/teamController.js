const Project = require("../models/Project");
const User = require("../models/User");
const Invitation = require("../models/Invitation");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const { USER_ROLES, AUDIT_ACTIONS } = require("../utils/constants");
const { generateToken } = require("../utils/helpers");
const { sendNotificationEmail } = require("../services/emailService");

// @desc    Get all team members of a project
// @route   GET /api/v1/team/:projectId
// @access  Private
const getTeamMembers = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
      .populate("members.user", "name email avatar role isActive lastLogin")
      .populate("owner", "name email avatar");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Get all members with their roles
    const members = project.members.map((member) => ({
      user: member.user,
      role: member.role,
      joinedAt: member.joinedAt,
    }));

    // Add owner to members list
    const ownerExists = members.some(
      (m) => m.user._id.toString() === project.owner._id.toString(),
    );
    if (!ownerExists) {
      members.unshift({
        user: project.owner,
        role: USER_ROLES.OWNER,
        joinedAt: project.createdAt,
      });
    }

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add team member to project
// @route   POST /api/v1/team/:projectId
// @access  Private (Owner/Admin only)
const addTeamMember = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { email, role } = req.body;

    // Validate role
    if (!Object.values(USER_ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please ask them to register first.",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is already a member
    const isMember = project.members.some(
      (m) => m.user.toString() === user._id.toString(),
    );
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a team member",
      });
    }

    // Check if user is the owner
    if (project.owner.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "User is already the project owner",
      });
    }

    // Add member to project
    project.members.push({
      user: user._id,
      role: role,
      joinedAt: new Date(),
    });
    await project.save();

    const addedMember = project.members[project.members.length - 1];

    // Add project to user's projects list
    user.projects.push({
      projectId: project._id,
      role: role,
      joinedAt: new Date(),
    });
    await user.save();

    // Create audit log
    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "team_member",
      entityId: user._id,
      entityName: user.name,
      changes: { email, role, action: "added_to_team" },
    });

    // Create notification for the new member
    await Notification.create({
      userId: user._id,
      projectId,
      type: "team_member_added",
      title: "Added to Project Team",
      message: `You have been added to project "${project.name}" as ${role}`,
      data: { projectId, projectName: project.name, role },
    });

    // Send email notification
    await sendNotificationEmail(
      user.email,
      user.name,
      `Added to Project: ${project.name}`,
      `You have been added to project "${project.name}" as ${role}. Click below to view the project.`,
      `${process.env.FRONTEND_URL}/projects/${projectId}`,
    );

    const recipients = new Set();

    // Add owner
    if (project.owner.toString() !== req.user._id.toString()) {
      recipients.add(project.owner.toString());
    }

    // Add admins
    project.members.forEach((member) => {
      if (
        member.role === USER_ROLES.ADMIN &&
        member.user.toString() !== req.user._id.toString()
      ) {
        recipients.add(member.user.toString());
      }
    });

    // Create notifications
    const notifications = Array.from(recipients).map((userId) => ({
      userId,
      projectId,
      type: "team_member_added",
      title: "New Team Member Added",
      message: `${user.name} was added to "${project.name}" as ${role} by ${req.user.name}`,
      sender: req.user._id,
      data: {
        addedUserId: user._id,
        addedUserName: user.name,
        role,
        addedBy: req.user.name,
        projectId,
        projectName: project.name,
      },
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    const populatedNotifications = await Notification.find({
      _id: { $in: createdNotifications.map((n) => n._id) },
    })
      .populate("sender", "name email avatar")
      .lean();

    const io = req.app.get("io");

    populatedNotifications.forEach((notification) => {
      io.to(`user:${notification.userId}`).emit(
        "notification:new",
        notification,
      );
    });

    // Send real-time update to all team members
    io.to(`project:${projectId}`).emit("team:member_added", {
      member: {
        _id: addedMember._id,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        },
        role,
        joinedAt: addedMember.joinedAt,
      },
      addedBy: req.user.name,
    });

    res.status(201).json({
      success: true,
      message: `User ${user.name} added to project as ${role}`,
      data: {
        _id: addedMember._id,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        },
        role,
        joinedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team member role
// @route   PUT /api/v1/team/:projectId/:userId
// @access  Private (Owner/Admin only)
const updateMemberRole = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!Object.values(USER_ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is the owner
    if (project.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot change role of project owner",
      });
    }

    // Find the member
    const member = project.members.find((m) => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found in project",
      });
    }

    const oldRole = member.role;
    member.role = role;
    await project.save();

    // Update user's project role
    const user = await User.findById(userId);
    const userProject = user.projects.find(
      (p) => p.projectId.toString() === projectId,
    );
    if (userProject) {
      userProject.role = role;
      await user.save();
    }

    // Create audit log
    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "team_member",
      entityId: userId,
      entityName: user.name,
      changes: { role: { old: oldRole, new: role } },
    });

    // Create notification for the user
    const notification = await Notification.create({
      userId,
      projectId,
      type: "role_changed",
      title: "Your Role Has Been Updated",
      message: `Your role in project "${project.name}" has been changed from ${oldRole} to ${role}`,
      sender: req.user._id,
      data: { projectId, projectName: project.name, oldRole, newRole: role },
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email avatar")
      .lean();

    // Send email notification
    await sendNotificationEmail(
      user.email,
      user.name,
      `Role Updated in Project: ${project.name}`,
      `Your role has been changed from ${oldRole} to ${role} in project "${project.name}".`,
      `${process.env.FRONTEND_URL}/projects/${projectId}`,
    );

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("team:role_changed", {
      memberId: userId,
      role,
      userName: user.name,
      updatedBy: req.user.name,
    });

    io.to(`user:${userId}`).emit("notification:new", populatedNotification);

    res.status(200).json({
      success: true,
      message: `User ${user.name} role updated from ${oldRole} to ${role}`,
      data: { userId, role },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove team member from project
// @route   DELETE /api/v1/team/:projectId/:userId
// @access  Private (Owner/Admin only)
const removeTeamMember = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    const Task = require("../models/Task");
    const Subtask = require("../models/Subtask");
    const Bug = require("../models/Bug");

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is the owner
    if (project.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove project owner",
      });
    }

    // Check if user is trying to remove themselves
    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Use "Leave Project" option to remove yourself',
      });
    }

    // Find the member
    const memberIndex = project.members.findIndex(
      (m) => m.user.toString() === userId,
    );
    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Member not found in project",
      });
    }

    const removedMember = project.members[memberIndex];
    project.members.splice(memberIndex, 1);
    await project.save();

    // Remove project from user's projects list
    const user = await User.findById(userId);
    const projectIndex = user.projects.findIndex(
      (p) => p.projectId.toString() === projectId,
    );
    if (projectIndex !== -1) {
      user.projects.splice(projectIndex, 1);
      await user.save();
    }

    // Unassign from all tasks, subtasks, bugs in parallel
    await Promise.all([
      Task.updateMany(
        { projectId, assignees: userId },
        { $pull: { assignees: userId } },
      ),
      Subtask.updateMany(
        { projectId, assignee: userId },
        { $set: { assignee: null } },
      ),
      Bug.updateMany(
        { projectId, assignee: userId },
        { $set: { assignee: null } },
      ),
    ]);

    // Create audit log
    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "team_member",
      entityId: userId,
      entityName: user.name,
      changes: { action: "removed_from_team", role: removedMember.role },
    });

    // Create notification for the removed user
    await Notification.create({
      userId,
      projectId,
      type: "team_member_removed",
      title: "Removed from Project",
      message: `You have been removed from project "${project.name}"`,
      data: { projectId, projectName: project.name },
    });

    // Send email notification
    await sendNotificationEmail(
      user.email,
      user.name,
      `Removed from Project: ${project.name}`,
      `You have been removed from project "${project.name}".`,
      process.env.FRONTEND_URL,
    );

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("team:member_removed", {
      memberId: userId,
      userName: user.name,
      removedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: `User ${user.name} removed from project`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave project (user removes themselves)
// @route   POST /api/v1/team/:projectId/leave
// @access  Private
const leaveProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is the owner
    if (project.owner.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message:
          "Project owner cannot leave. Transfer ownership first or delete the project.",
      });
    }

    // Check if user is a member
    const memberIndex = project.members.findIndex(
      (m) => m.user.toString() === userId.toString(),
    );
    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "You are not a member of this project",
      });
    }

    // Remove user from project
    project.members.splice(memberIndex, 1);
    await project.save();

    // Remove project from user's projects list
    const user = await User.findById(userId);
    const projectIndex = user.projects.findIndex(
      (p) => p.projectId.toString() === projectId,
    );
    if (projectIndex !== -1) {
      user.projects.splice(projectIndex, 1);
      await user.save();
    }

    // Create audit log
    await AuditLog.create({
      projectId,
      user: userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "team_member",
      entityId: userId,
      entityName: req.user.name,
      changes: { action: "left_project" },
    });

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("team:memberLeft", {
      userId,
      userName: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: "You have left the project",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send invitation to user
// @route   POST /api/v1/team/:projectId/invite
// @access  Private (Owner/Admin only)
const sendInvitation = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { email, role } = req.body;

    // Validate role
    if (!Object.values(USER_ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Check if already a member
      const isMember = project.members.some(
        (m) => m.user.toString() === existingUser._id.toString(),
      );
      if (
        isMember ||
        project.owner.toString() === existingUser._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "User is already a team member",
        });
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      email,
      projectId,
      status: "pending",
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: "An invitation has already been sent to this email",
      });
    }

    // Create invitation token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await Invitation.create({
      email,
      projectId,
      invitedBy: req.user._id,
      role,
      token,
      expiresAt,
    });

    // Send invitation email
    const inviteLink = `${process.env.FRONTEND_URL}/invite/${token}`;
    await sendNotificationEmail(
      email,
      email.split("@")[0],
      `Invitation to join project: ${project.name}`,
      `${req.user.name} has invited you to join project "${project.name}" as ${role}. Click the link below to accept the invitation.`,
      inviteLink,
    );

    // Create audit log
    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "invitation",
      entityId: invitation._id,
      entityName: email,
      changes: { email, role },
    });

    res.status(201).json({
      success: true,
      message: `Invitation sent to ${email}`,
      data: {
        email,
        role,
        expiresAt,
        inviteLink,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept invitation
// @route   POST /api/v1/team/invite/:token
// @access  Public (authenticated)
const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user._id;

    const invitation = await Invitation.findOne({ token, status: "pending" });
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired invitation",
      });
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return res.status(400).json({
        success: false,
        message: "Invitation has expired",
      });
    }

    // Check if user email matches invitation email
    if (invitation.email !== req.user.email) {
      return res.status(400).json({
        success: false,
        message: "This invitation was sent to a different email address",
      });
    }

    const project = await Project.findById(invitation.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is already a member
    const isMember = project.members.some(
      (m) => m.user.toString() === userId.toString(),
    );
    if (isMember || project.owner.toString() === userId.toString()) {
      invitation.status = "accepted";
      await invitation.save();
      return res.status(400).json({
        success: false,
        message: "You are already a member of this project",
      });
    }

    // Add user to project
    project.members.push({
      user: userId,
      role: invitation.role,
      joinedAt: new Date(),
    });
    await project.save();

    // Add project to user's projects list
    const user = await User.findById(userId);
    user.projects.push({
      projectId: project._id,
      role: invitation.role,
      joinedAt: new Date(),
    });
    await user.save();

    // Update invitation status
    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Create audit log
    await AuditLog.create({
      projectId: project._id,
      user: userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "team_member",
      entityId: userId,
      entityName: req.user.name,
      changes: { action: "accepted_invitation", role: invitation.role },
    });

    // Notify project owner and admins
    const notifyUsers = [
      ...project.members.filter(
        (m) => m.role === "Admin" || m.role === "Owner",
      ),
    ];
    for (const notifyUser of notifyUsers) {
      await Notification.create({
        userId: notifyUser.user,
        projectId: project._id,
        type: "team_member_added",
        title: "New Team Member Joined",
        message: `${req.user.name} has joined the project as ${invitation.role}`,
        data: {
          projectId: project._id,
          projectName: project.name,
          userId: req.user._id,
        },
      });
    }

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${project._id}`).emit("team:memberAdded", {
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      role: invitation.role,
      joinedBy: "invitation",
    });

    res.status(200).json({
      success: true,
      message: `You have joined project "${project.name}" as ${invitation.role}`,
      data: {
        projectId: project._id,
        projectName: project.name,
        role: invitation.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Transfer project ownership
// @route   POST /api/v1/team/:projectId/transfer
// @access  Private (Owner only)
const transferOwnership = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if current user is owner
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only project owner can transfer ownership",
      });
    }

    // Find the new owner
    const newOwner = await User.findById(userId);
    if (!newOwner) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is a member
    const isMember = project.members.some((m) => m.user.toString() === userId);
    if (!isMember && project.owner.toString() !== userId) {
      return res.status(400).json({
        success: false,
        message: "User must be a team member to become owner",
      });
    }

    // Remove new owner from members if present
    const memberIndex = project.members.findIndex(
      (m) => m.user.toString() === userId,
    );
    if (memberIndex !== -1) {
      project.members.splice(memberIndex, 1);
    }

    // Add current owner as admin
    const currentOwnerId = project.owner;
    project.members.push({
      user: currentOwnerId,
      role: USER_ROLES.ADMIN,
      joinedAt: new Date(),
    });

    // Update user's project roles
    const currentOwner = await User.findById(currentOwnerId);
    const ownerProject = currentOwner.projects.find(
      (p) => p.projectId.toString() === projectId,
    );
    if (ownerProject) {
      ownerProject.role = USER_ROLES.ADMIN;
      await currentOwner.save();
    }

    // Set new owner
    project.owner = userId;
    await project.save();

    // Update new owner's project role
    const newOwnerProject = newOwner.projects.find(
      (p) => p.projectId.toString() === projectId,
    );
    if (newOwnerProject) {
      newOwnerProject.role = USER_ROLES.OWNER;
      await newOwner.save();
    }

    // Create audit log
    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes: { ownership: { old: req.user.name, new: newOwner.name } },
    });

    // Notify both users
    await Notification.create({
      userId: currentOwnerId,
      projectId,
      type: "role_changed",
      title: "Ownership Transferred",
      message: `You have transferred ownership of "${project.name}" to ${newOwner.name}`,
      data: { projectId, projectName: project.name },
    });

    await Notification.create({
      userId,
      projectId,
      type: "role_changed",
      title: "You are now the Project Owner",
      message: `You have been made the owner of project "${project.name}"`,
      data: { projectId, projectName: project.name },
    });

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("team:ownershipTransferred", {
      newOwnerId: userId,
      newOwnerName: newOwner.name,
      transferredBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: `Ownership transferred to ${newOwner.name}`,
      data: {
        newOwner: {
          _id: newOwner._id,
          name: newOwner.name,
          email: newOwner.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeamMembers,
  addTeamMember,
  updateMemberRole,
  removeTeamMember,
  leaveProject,
  sendInvitation,
  acceptInvitation,
  transferOwnership,
};
