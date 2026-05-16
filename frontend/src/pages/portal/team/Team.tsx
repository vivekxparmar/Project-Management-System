import {
  // useEffect,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import { useProjectStore, useAuthStore } from "@/stores";
import { teamService } from "@/services";
import { useRBAC } from "@/hooks";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  Crown,
  Shield,
  Code2,
  Palette,
  Eye,
  MoreHorizontal,
  Mail,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  // DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Separator } from "@/components/ui/separator";
import PageLoader from "@/components/shared/PageLoader";
import { getInitials, MEMBER_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { MemberRole } from "@/types";

const ROLE_ICONS: Record<string, any> = {
  Owner: Crown,
  Admin: Shield,
  Developer: Code2,
  Designer: Palette,
  Client: Eye,
};

const ROLE_COLORS: Record<string, string> = {
  Owner: "bg-yellow-400/15 text-yellow-600 border-yellow-400/30",
  Admin: "bg-purple-400/15 text-purple-600 border-purple-400/30",
  Developer: "bg-blue-400/15 text-blue-600 border-blue-400/30",
  Designer: "bg-pink-400/15 text-pink-600 border-pink-400/30",
  Client: "bg-gray-400/15 text-gray-600 border-gray-400/30",
};

export default function Team() {
  const { projectId } = useParams<{ projectId: string }>();
  const user = useAuthStore((s) => s.user);
  const { currentProject, updateProject } = useProjectStore();
  // const { canManageTeam, myRole } = useRBAC();
  const { canManageTeam } = useRBAC();

  // const [isLoading, setIsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const members = currentProject?.members ?? [];

  // Add member
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<MemberRole>("Developer");

  const handleAddMember = async () => {
    if (!addEmail.trim() || !projectId) return;
    setIsSubmitting(true);
    try {
      const res = await teamService.addMember(
        projectId,
        addEmail.trim(),
        addRole,
      );

      const updated = res.data.data;
      // updateProject(projectId, { members: updated });
      updateProject(projectId, {
        members: [...members, updated],
      });
      toast.success("Member added successfully.");
      setAddEmail("");
      setAddRole("Developer");
      setAddOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to add member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change role
  const handleRoleChange = async (memberId: string, role: MemberRole) => {
    if (!projectId) return;
    const old = members.find((m) => m.user._id === memberId)?.role;
    updateProject(projectId, {
      members: members.map((m) =>
        m.user._id === memberId ? { ...m, role } : m,
      ),
    });
    try {
      toast.success("Role updated.");
      await teamService.updateRole(projectId, memberId, role);
    } catch {
      updateProject(projectId, {
        members: members.map((m) =>
          m.user._id === memberId ? { ...m, role: old! } : m,
        ),
      });
      toast.error("Failed to update role.");
    }
  };

  // Remove member
  const handleRemove = async () => {
    if (!removeTarget || !projectId) return;
    setIsSubmitting(true);
    updateProject(projectId, {
      members: members.filter((m) => m.user._id !== removeTarget),
    });
    try {
      toast.success("Member removed.");
      await teamService.removeMember(projectId, removeTarget);
    } catch {
      toast.error("Failed to remove member.");
    } finally {
      setIsSubmitting(false);
      setRemoveTarget(null);
    }
  };

  // Leave project
  const handleLeave = async () => {
    if (!projectId) return;
    setIsSubmitting(true);
    try {
      await teamService.leave(projectId);
      window.location.href = "/projects";
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to leave project.");
      setIsSubmitting(false);
    }
  };

  if (!currentProject) return <PageLoader />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Team</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-semibold">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex-1" />
        {canManageTeam && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Member
          </Button>
        )}
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-2">
          {members.map((member) => {
            const Icon = ROLE_ICONS[member.role] ?? Eye;
            const isMe = member.user._id === user?._id;
            const isOwner = member.role === "Owner";

            return (
              <div
                key={member._id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl hover:border-border/80 transition-colors"
              >
                {/* Avatar */}
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={member.user.avatar} />
                  <AvatarFallback className="text-md font-semibold bg-primary text-primary-foreground">
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {member.user.name}
                    </span>
                    {isMe && (
                      <Badge
                        variant="outline"
                        className="text-[12px] px-1.5 py-0 rounded-full"
                      >
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3 font-semibold text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-semibold truncate">
                      {member.user.email}
                    </span>
                  </div>
                </div>

                {/* Role badge / selector */}
                <div className="shrink-0">
                  {canManageTeam && !isOwner && !isMe ? (
                    <Select
                      value={member.role}
                      onValueChange={(val: any) =>
                        handleRoleChange(member.user._id, val)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-7 border text-[12px] font-semibold px-2 gap-1.5 w-fit",
                          ROLE_COLORS[member.role],
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="w-[var(--radix-select-trigger-width)] p-2"
                      >
                        {MEMBER_ROLES.filter((r) => r !== "Owner").map(
                          (role) => (
                            <SelectItem
                              key={role}
                              value={role}
                              className="text-sm"
                            >
                              {role}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-xl border gap-1",
                        ROLE_COLORS[member.role],
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {member.role}
                    </Badge>
                  )}
                </div>

                {/* Joined date */}
                <span className="text-[11px] text-muted-foreground hidden sm:block w-20 text-right font-semibold">
                  {formatDate(member.joinedAt)}
                </span>

                {/* Actions */}
                {(canManageTeam || isMe) && !isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg shrink-0"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      sideOffset={20}
                      side="bottom"
                      align="end"
                      className="max-w-sm rounded-2xl bg-background"
                    >
                      {isMe && (
                        <DropdownMenuItem
                          className="rounded-xl gap-2 text-xs text-destructive focus:text-destructive font-semibold"
                          onClick={() => setLeaveOpen(true)}
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Leave project
                        </DropdownMenuItem>
                      )}
                      {canManageTeam && !isMe && (
                        <>
                          {/* <DropdownMenuSeparator /> */}
                          <DropdownMenuItem
                            className="rounded-xl gap-2 text-xs text-destructive focus:text-destructive font-semibold"
                            onClick={() => setRemoveTarget(member.user._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove member
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Member */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Enter the email address of a registered user to add them to this
              project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Email address</Label>
              <Input
                type="email"
                autoFocus
                placeholder="teammate@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="h-10 rounded-xl font-medium"
                onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Role</Label>
              <Select
                value={addRole}
                onValueChange={(val: any) => setAddRole(val)}
              >
                <SelectTrigger className="h-10 rounded-xl w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="rounded-2xl w-[var(--radix-select-trigger-width)]"
                >
                  {MEMBER_ROLES.filter((r) => r !== "Owner").map((role) => (
                    <SelectItem key={role} value={role} className="rounded-xl">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAddOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddMember}
                disabled={isSubmitting || !addEmail.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2">Adding...</span>
                  </>
                ) : (
                  "Add Member"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={() => setRemoveTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This member will lose access to the project immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Confirm */}
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave project?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to this project. You would need to be
              re-invited to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
