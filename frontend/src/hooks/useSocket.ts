import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../stores";
import { useTaskStore } from "../stores";
import { useSprintStore } from "../stores";
import { useBugStore } from "../stores";
import { useNotificationStore } from "../stores";
import { useChatStore } from "../stores";
import { useProjectStore } from "../stores";
import { useResourceStore } from "../stores";
import { toast } from "sonner";

let socketInstance: Socket | null = null;

export const useSocket = (projectId?: string) => {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const taskStore = useTaskStore.getState;
  const sprintStore = useSprintStore.getState;
  const bugStore = useBugStore.getState;
  const notificationStore = useNotificationStore.getState;
  const chatStore = useChatStore.getState;
  const projectStore = useProjectStore.getState;
  const resourceStore = useResourceStore.getState;

  useEffect(() => {
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io(import.meta.env.VITE_SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }

    socketRef.current = socketInstance;
    const socket = socketRef.current;

    if (socket.connected && projectId) {
      socket.emit("project:join", projectId);
    }

    const onConnect = () => {
      setIsConnected(true);
      if (projectId) socket.emit("project:join", projectId);
    };

    const onDisconnect = () => {
      console.log("🔌 Socket disconnected");
      setIsConnected(false);
    };

    const onConnectError = (err: Error) => {
      console.error("Socket connection error:", err.message);
      setIsConnected(false);
    };

    const onUserProfileUpdated = (data: {
      userId: string;
      name?: string;
      avatar?: string;
    }) => {
      console.log("👤 Profile updated:", data);
      if (data.userId) {
        const updates: { name?: string; avatar?: string } = {};
        if (data.name) updates.name = data.name;
        if (data.avatar) updates.avatar = data.avatar;

        // Update in project store
        projectStore().updateMemberInProject(data.userId, updates);
        // Update in task store (for assignees)
        taskStore().updateAssigneeInTasks(data.userId, updates);
      }
    };

    // TASKS
    const onTaskCreated = (payload: any) => {
      const task = payload?.data?.task;

      if (!task?._id) return;

      if (task.isInBacklog) {
        taskStore().addBacklogTask({
          ...task,
          subtasks: task.subtasks ?? [],
          isExpanded: false,
        });

        return;
      }

      if (!task.sprintId) return;

      taskStore().addTask(task.sprintId, {
        ...task,
        subtasks: task.subtasks ?? [],
        isExpanded: false,
      });
    };
    const onTaskUpdated = (data: any) => {
      const updatedTask = data.task;

      if (!updatedTask?._id) return;

      taskStore().updateTask(updatedTask._id, updatedTask);
      taskStore().updateBacklogTask(updatedTask._id, updatedTask);
    };
    const onTaskDeleted = (data: {
      taskId: string;
      sprintId?: string | null;
    }) => {
      if (data.sprintId) {
        taskStore().removeTask(data.taskId, data.sprintId);
      }

      taskStore().removeBacklogTask(data.taskId);
    };
    const onTaskMovedToBacklog = (data: {
      taskId: string;
      fromSprintId: string;
    }) => {
      taskStore().moveTaskToBacklog(data.taskId, data.fromSprintId);
    };
    const onTaskMovedToSprint = (data: {
      taskId: string;
      sprintId: string;
      task: any;
    }) => {
      taskStore().moveTaskToSprint(data.taskId, data.sprintId, data.task);
    };
    const onTaskMoved = (data: any) => {
      const store = taskStore();

      // Remove from backlog
      if (data.fromBacklog) {
        store.removeBacklogTask(data.task._id);
      }

      // Remove from old sprint
      if (data.fromSprintId) {
        store.removeTask(data.task._id, data.fromSprintId);
      }

      // Prevent duplicate insertion
      const exists = store.tasksBySprintId[data.toSprintId]?.some(
        (t) => t._id === data.task._id,
      );

      if (!exists) {
        // Ensure subtasks have a safe creator fallback
        const safeSubtasks = (data.task.subtasks ?? []).map((s: any) => ({
          ...s,
          creator: s.creator ?? { _id: "", name: "Unknown", avatar: "" },
        }));

        store.addTask(data.toSprintId, {
          ...data.task,
          subtasks: safeSubtasks,
          creator: data.task.creator ?? {
            _id: "",
            name: "Unknown",
            avatar: "",
          },
          isExpanded: false,
        });
      }
    };

    // SUBTASKS
    const onSubtaskCreated = (data: {
      subtask: any;
      taskId: string;
      sprintId?: string;
    }) => {
      if (data.sprintId)
        taskStore().addSubtask(data.sprintId, data.taskId, data.subtask);
      else taskStore().addBacklogSubtask(data.taskId, data.subtask);
    };
    const onSubtaskUpdated = (data: {
      subtask: any;
      taskId: string;
      sprintId?: string;
    }) => {
      if (data.sprintId)
        taskStore().updateSubtask(
          data.sprintId,
          data.taskId,
          data.subtask._id,
          data.subtask,
        );
      else
        taskStore().updateBacklogSubtask(
          data.taskId,
          data.subtask._id,
          data.subtask,
        );
    };
    const onSubtaskDeleted = (data: {
      subtaskId: string;
      taskId: string;
      sprintId?: string;
    }) => {
      if (data.sprintId)
        taskStore().removeSubtask(data.sprintId, data.taskId, data.subtaskId);
      else taskStore().removeBacklogSubtask(data.taskId, data.subtaskId);
    };

    // SPRINTS
    const onSprintCreated = (data: { sprint: any; createdBy: string }) =>
      sprintStore().addSprint(data.sprint);
    const onSprintUpdated = (data: { sprint: any; updatedBy: string }) =>
      sprintStore().updateSprint(data.sprint._id, data.sprint);
    const onSprintDeleted = (data: { sprintId: string }) =>
      sprintStore().removeSprint(data.sprintId);
    const onSprintStatusChanged = (data: {
      sprintId: string;
      newStatus: any;
    }) => sprintStore().updateSprintStatus(data.sprintId, data.newStatus);
    const onSprintLockChanged = (data: {
      sprintId: string;
      isLocked: boolean;
    }) => sprintStore().toggleSprintLock(data.sprintId, data.isLocked);

    // BUGS
    const onBugCreated = (data: { bug: any; reportedBy: string }) =>
      bugStore().addBug(data.bug);
    const onBugUpdated = (data: {
      bug: any;
      changes: any;
      updatedBy: string;
    }) => bugStore().updateBug(data.bug._id, data.bug);
    const onBugDeleted = (data: { bugId: string }) =>
      bugStore().removeBug(data.bugId);

    // PROJECT
    const onProjectUpdated = (project: any) =>
      projectStore().updateProject(project._id, project);
    const onProjectStatusChanged = (data: { projectId: string; status: any }) =>
      projectStore().updateProjectStatus(data.projectId, data.status);
    const onProjectArchived = (data: {
      projectId: string;
      isArchived: boolean;
    }) =>
      projectStore().updateProject(data.projectId, {
        isArchived: data.isArchived,
      });
    const onProjectDeleted = (data: {
      projectId: string;
      projectName: string;
      deletedBy: string;
    }) => {
      projectStore().removeProject(data.projectId);
      toast.error(`Project "${data.projectName}" deleted`, {
        description: `Deleted by ${data.deletedBy}`,
        duration: 5000,
      });
      const currentProject = projectStore().currentProject;
      if (currentProject?._id === data.projectId) {
        window.location.href = "/projects";
      }
    };

    // RESOURCES
    const onResourceAdded = (data: any) => {
      const resource = data.resource;

      if (!resource?._id) return;

      resourceStore().addResource(resource);
    };

    const onResourceDeleted = (data: { resourceId: string }) => {
      resourceStore().removeResource(data.resourceId);
    };

    // TEAM
    const onTeamMemberAdded = (data: { member: any }) => {
      const currentProject = projectStore().currentProject;

      if (!currentProject) return;

      const exists = currentProject.members.some(
        (m) => m.user._id === data.member.user._id,
      );

      if (exists) return;

      projectStore().updateProject(currentProject._id, {
        members: [...currentProject.members, data.member],
      });
    };

    const onTeamMemberRemoved = (data: { memberId: string }) => {
      const currentUser = useAuthStore.getState().user;
      const currentProject = projectStore().currentProject;

      if (!currentProject) return;

      // Removing from UI
      projectStore().updateProject(currentProject._id, {
        members: currentProject.members.filter(
          (m) => m.user._id !== data.memberId,
        ),
      });

      // Cleaning up assignees in all sprint tasks and subtasks
      const taskState = taskStore();

      // Sprint tasks
      for (const sprintId in taskState.tasksBySprintId) {
        taskState.tasksBySprintId[sprintId].forEach((task) => {
          // Remove from task assignees
          if (task.assignees?.some((a) => a._id === data.memberId)) {
            taskStore().updateTask(task._id, {
              assignees: task.assignees.filter((a) => a._id !== data.memberId),
            });
          }

          // Remove from subtask assignees
          task.subtasks?.forEach((subtask) => {
            if (
              subtask.assignee &&
              typeof subtask.assignee === "object" &&
              subtask.assignee._id === data.memberId
            ) {
              taskStore().updateSubtask(sprintId, task._id, subtask._id, {
                assignee: null,
              });
            }
          });
        });
      }

      // Backlog tasks
      taskState.backlogTasks.forEach((task) => {
        if (task.assignees?.some((a) => a._id === data.memberId)) {
          taskStore().updateBacklogTask(task._id, {
            assignees: task.assignees.filter((a) => a._id !== data.memberId),
          });
        }

        task.subtasks?.forEach((subtask) => {
          if (
            subtask.assignee &&
            typeof subtask.assignee === "object" &&
            subtask.assignee._id === data.memberId
          ) {
            taskStore().updateBacklogSubtask(task._id, subtask._id, {
              assignee: null,
            });
          }
        });
      });

      // Clean up assignee in bugs
      bugStore().bugs.forEach((bug) => {
        if (
          bug.assignee &&
          typeof bug.assignee === "object" &&
          bug.assignee._id === data.memberId
        ) {
          bugStore().updateBug(bug._id, { assignee: null });
        }
      });

      // If current user removed
      if (currentUser?._id === data.memberId) {
        projectStore().setCurrentProject(null);
        window.location.href = "/projects";
        toast.success("You have been removed from the project");
      }
    };

    const onTeamRoleChanged = (data: { memberId: string; role: string }) => {
      const currentProject = projectStore().currentProject;

      if (!currentProject) return;

      projectStore().updateProject(currentProject._id, {
        members: currentProject.members.map((m) =>
          m.user._id === data.memberId ? { ...m, role: data.role as any } : m,
        ),
      });
    };

    // NOTIFICATIONS
    const onNotificationNew = (notification: any) => {
      notificationStore().addNotification(notification);
      toast(notification.title, {
        description: notification.message,
        duration: 4000,
      });
    };

    // CHAT
    const onChatMessage = (data: any) => {
      console.log("📨 chat:message received:", data);
      const message = data.message ?? data;
      chatStore().addMessage(message);
    };
    const onChatMessageEdited = (data: any) => {
      chatStore().updateMessage(data.message?._id ?? data.messageId, {
        content: data.message?.content ?? data.content,
        isEdited: true,
        editedAt: data.timestamp,
      });
    };
    const onChatMessageDeleted = (data: any) => {
      chatStore().removeMessage(data.messageId);
    };
    const onChatTyping = (data: {
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      chatStore().setTyping(
        { userId: data.userId, userName: data.userName },
        data.isTyping,
      );
    };

    // ONLINE USERS
    const onProjectOnlineUsers = (data: {
      projectId: string;
      users: any[];
      count: number;
    }) => {
      const onlineIds = data.users.map((u: any) => u._id);
      chatStore().setOnlineUsers(onlineIds);
    };
    const onUsersOnline = (data: {
      users: any[];
      count: number;
      timestamp: string;
    }) => {
      const onlineIds = data.users.map((u: any) => u._id);
      chatStore().setOnlineUsers(onlineIds);
    };
    const onUserOnline = (data: { userId: string }) =>
      chatStore().addOnlineUser(data.userId);
    const onUserOffline = (data: { userId: string }) =>
      chatStore().removeOnlineUser(data.userId);

    // Register all listeners
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.on("user:profileUpdated", onUserProfileUpdated);

    socket.on("task:created", onTaskCreated);
    socket.on("task:updated", onTaskUpdated);
    socket.on("task:deleted", onTaskDeleted);
    // socket.on("task:moved_to_backlog", onTaskMovedToBacklog);
    // socket.on("task:moved_to_sprint", onTaskMovedToSprint);
    socket.on("task:moved", onTaskMoved);
    socket.on("task:movedToBacklog", onTaskMovedToBacklog);

    socket.on("subtask:created", onSubtaskCreated);
    socket.on("subtask:updated", onSubtaskUpdated);
    socket.on("subtask:deleted", onSubtaskDeleted);

    socket.on("sprint:created", onSprintCreated);
    socket.on("sprint:updated", onSprintUpdated);
    socket.on("sprint:deleted", onSprintDeleted);
    socket.on("sprint:statusChanged", onSprintStatusChanged);
    socket.on("sprint:lockToggled", onSprintLockChanged);

    socket.on("bug:created", onBugCreated);
    socket.on("bug:updated", onBugUpdated);
    socket.on("bug:deleted", onBugDeleted);

    socket.on("project:updated", onProjectUpdated);
    socket.on("project:status_changed", onProjectStatusChanged);
    socket.on("project:archived", onProjectArchived);
    socket.on("project:deleted", onProjectDeleted);

    socket.on("resource:added", onResourceAdded);
    socket.on("resource:deleted", onResourceDeleted);

    socket.on("team:member_added", onTeamMemberAdded);
    socket.on("team:member_removed", onTeamMemberRemoved);
    socket.on("team:role_changed", onTeamRoleChanged);

    socket.on("notification:new", onNotificationNew);

    socket.on("chat:message", onChatMessage);
    socket.on("chat:messageEdited", onChatMessageEdited);
    socket.on("chat:messageDeleted", onChatMessageDeleted);
    socket.on("chat:typing", onChatTyping);

    socket.on("project:onlineUsers", onProjectOnlineUsers);
    socket.on("users:online", onUsersOnline);
    socket.on("user:online", onUserOnline);
    socket.on("user:offline", onUserOffline);

    // Cleanup on unmount or when token/projectId changes
    return () => {
      if (projectId) socket.emit("project:leave", projectId);

      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);

      socket.off("user:profileUpdated", onUserProfileUpdated);

      socket.off("task:created", onTaskCreated);
      socket.off("task:updated", onTaskUpdated);
      socket.off("task:deleted", onTaskDeleted);
      socket.off("task:moved_to_backlog", onTaskMovedToBacklog);
      socket.off("task:moved_to_sprint", onTaskMovedToSprint);
      socket.off("task:moved", onTaskMoved);
      socket.off("task:movedToBacklog", onTaskMovedToBacklog);

      socket.off("subtask:created", onSubtaskCreated);
      socket.off("subtask:updated", onSubtaskUpdated);
      socket.off("subtask:deleted", onSubtaskDeleted);

      socket.off("sprint:created", onSprintCreated);
      socket.off("sprint:updated", onSprintUpdated);
      socket.off("sprint:deleted", onSprintDeleted);
      socket.off("sprint:statusChanged", onSprintStatusChanged);
      socket.off("sprint:lockToggled", onSprintLockChanged);

      socket.off("bug:created", onBugCreated);
      socket.off("bug:updated", onBugUpdated);
      socket.off("bug:deleted", onBugDeleted);

      socket.off("project:updated", onProjectUpdated);
      socket.off("project:status_changed", onProjectStatusChanged);
      socket.off("project:archived", onProjectArchived);
      socket.off("project:deleted", onProjectDeleted);

      socket.off("resource:added", onResourceAdded);
      socket.off("resource:deleted", onResourceDeleted);

      socket.off("team:member_added", onTeamMemberAdded);
      socket.off("team:member_removed", onTeamMemberRemoved);
      socket.off("team:role_changed", onTeamRoleChanged);

      socket.off("notification:new", onNotificationNew);

      socket.off("chat:message", onChatMessage);
      socket.off("chat:messageEdited", onChatMessageEdited);
      socket.off("chat:messageDeleted", onChatMessageDeleted);
      socket.off("chat:typing", onChatTyping);

      socket.off("project:onlineUsers", onProjectOnlineUsers);
      socket.off("users:online", onUsersOnline);
      socket.off("user:online", onUserOnline);
      socket.off("user:offline", onUserOffline);
    };
  }, [token, projectId]);

  const emit = (event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  };

  return { socket: socketRef.current, isConnected, emit };
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
