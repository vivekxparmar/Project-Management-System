import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, MoreHorizontal, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useChatStore } from "@/stores";
import { chatService } from "@/services";
import { getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  isConsecutive: boolean | number;
}

export default function ChatMessageItem({
  message,
  isOwn,
  isConsecutive,
}: ChatMessageItemProps) {
  const { updateMessage, removeMessage } = useChatStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const isDeleted = !!message.deletedAt;

  // EDIT
  const handleEdit = async () => {
    const trimmed = editText.trim();

    if (!trimmed || trimmed === message.content) {
      setIsEditing(false);
      return;
    }

    updateMessage(message._id, { content: trimmed, isEdited: true });
    setIsEditing(false);

    try {
      await chatService.editMessage(message._id, trimmed);
    } catch {
      updateMessage(message._id, {
        content: message.content,
        isEdited: false,
      });
      toast.error("Failed to edit message.");
    }
  };

  // DELETE
  const handleDelete = async () => {
    setIsDeleting(true);

    // optimistic
    updateMessage(message._id, { deletedAt: new Date().toISOString() });

    try {
      await chatService.deleteMessage(message._id);
    } catch {
      toast.error("Failed to delete message.");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  // DELETED UI
  if (isDeleted) {
    return (
      <div
        className={cn(
          "flex gap-2.5 mb-1",
          isOwn && "flex-row-reverse",
          isConsecutive && "mt-0.5",
        )}
      >
        {!isConsecutive ? (
          <Avatar className="h-7 w-7 opacity-0" />
        ) : (
          <div className="w-7" />
        )}

        <p className="text-xs text-muted-foreground italic px-3 py-1.5 font-semibold">
          This message was deleted
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "group flex gap-2.5 mb-1",
          isOwn && "flex-row-reverse",
          isConsecutive ? "mt-0.5" : "mt-3",
        )}
      >
        {/* Avatar */}
        {!isConsecutive ? (
          <Avatar className="h-7 w-7 mt-1">
            <AvatarImage src={message.sender.avatar ?? ""} />
            <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
              {getInitials(message.sender.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-7" />
        )}

        {/* Content */}
        <div className={cn("flex flex-col max-w-[70%]", isOwn && "items-end")}>
          {/* Header */}
          {!isConsecutive && (
            <div
              className={cn(
                "flex items-center gap-2 mb-1",
                isOwn && "flex-row-reverse",
              )}
            >
              <span className="text-xs font-semibold">
                {isOwn ? "You" : message.sender.name}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {formatTime(message.createdAt)}
              </span>
            </div>
          )}

          {/* Message */}
          <div className="relative">
            {isEditing ? (
              <div className="flex gap-2 items-center">
                <Input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="h-8 text-sm rounded-xl min-w-48"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEdit();
                    if (e.key === "Escape") {
                      setIsEditing(false);
                      setEditText(message.content);
                    }
                  }}
                />
                <Button size="sm" className="h-8 text-xs" onClick={handleEdit}>
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(message.content);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "px-3 py-2 rounded-2xl text-sm break-words font-medium",
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm",
                )}
              >
                {message.content}
                {message.isEdited && (
                  <span className="text-[10px] ml-1 opacity-60 font-semibold">
                    (edited)
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            {!isEditing && isOwn && (
              <div
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition",
                  isOwn ? "-left-8" : "-right-8",
                )}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" className="h-6 w-6 bg-muted">
                      <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={15}
                    className="bg-muted"
                  >
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Time */}
          {isConsecutive && (
            <span className="text-[10px] text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 font-semibold">
              {formatTime(message.createdAt)}
            </span>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be removed for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
