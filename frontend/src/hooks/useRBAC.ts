import { useProjectStore, useAuthStore } from "../stores";
import {
  canManageSprint,
  canCreateTask,
  canEditTask,
  canDeleteTask,
  canReportBug,
  canDeleteBug,
  canManageTeam,
  canChangeSettings,
  canLockSprint,
  canAddResource,
  canDeleteResource,
} from "../lib/constants";

export const useRBAC = (): any => {
  const user = useAuthStore((s) => s.user);
  const currentProject = useProjectStore((s) => s.currentProject);

  const myRole = currentProject
    ? currentProject.members.find((member) => {
        if (member.user && typeof member.user === "object" && member.user._id) {
          return member.user._id === user?._id;
        }
        // If user is just an ID string
        if (typeof member.user === "string") {
          return member.user === user?._id;
        }
        return false;
      })?.role
    : undefined;

  return {
    myRole,
    canManageSprint: canManageSprint(myRole),
    canCreateTask: canCreateTask(myRole),
    canEditTask: canEditTask(myRole),
    canDeleteTask: canDeleteTask(myRole),
    canReportBug: canReportBug(myRole),
    canDeleteBug: canDeleteBug(myRole),
    canManageTeam: canManageTeam(myRole),
    canChangeSettings: canChangeSettings(myRole),
    canLockSprint: canLockSprint(myRole),
    canAddResource: canAddResource(myRole),
    canDeleteResource: canDeleteResource(myRole),
    isOwner: myRole === "Owner",
    isAdmin: myRole === "Admin",
    isClient: myRole === "Client",
  };
};
