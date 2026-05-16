import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Pencil,
  Trash2,
  Loader2,
  Paperclip,
  ImageIcon,
  Check,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import {
  getPriorityColor,
  getBugStatusColor,
  getInitials,
  canDeleteBug,
  canReportBug,
} from "@/lib/constants";
import { useBugStore, useProjectStore, useAuthStore } from "@/stores";
import { bugService, commentService } from "@/services";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Bug, BugComment } from "@/types";

interface BugDetailSheetProps {
  bug: Bug | null;
  open: boolean;
  onClose: () => void;
  projectId: string;
  myRole: string;
}

export default function BugDetailSheet({
  bug,
  open,
  onClose,
  projectId,
  myRole,
}: BugDetailSheetProps) {
  const user = useAuthStore((s) => s.user);
  const { updateBug } = useBugStore();
  const members = useProjectStore((s) => s.currentProject?.members ?? []);

  const [sheetOpen, setSheetOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [comments, setComments] = useState<BugComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<string | null>(
    null,
  );

  // Inline editing states
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [editDescriptionValue, setEditDescriptionValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Gallery
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const commentEndRef = useRef<HTMLDivElement>(null);
  const canEdit = canReportBug(myRole);
  const canDelete = canDeleteBug(myRole);
  const commentEditTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setSheetOpen(true);
  }, [open]);

  const handleSheetOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && galleryOpen) return;
      if (!newOpen) {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => {
          onClose();
        }, 300);
      }
      setSheetOpen(newOpen);
    },
    [onClose, galleryOpen],
  );

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (galleryOpen) {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          setGalleryOpen(false);
          return;
        }
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          if (bug && bug.attachments.length > 1) {
            setGalleryIndex((i) =>
              i === bug.attachments.length - 1 ? 0 : i + 1,
            );
          }
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          if (bug && bug.attachments.length > 1) {
            setGalleryIndex((i) =>
              i === 0 ? bug.attachments.length - 1 : i - 1,
            );
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [sheetOpen, galleryOpen, bug]);

  // Auto-focus and set cursor to the end when editing starts
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.setSelectionRange(
        editTitleValue.length,
        editTitleValue.length,
      );
    }
  }, [editingTitle, editTitleValue]);

  useEffect(() => {
    if (editingDescription && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus();
      const len = editDescriptionValue.length;
      descriptionTextareaRef.current.setSelectionRange(len, len);
    }
  }, [editingDescription, editDescriptionValue]);

  useEffect(() => {
    if (editingCommentId && commentEditTextareaRef.current) {
      commentEditTextareaRef.current.focus();
      const len = editingCommentText.length;
      commentEditTextareaRef.current.setSelectionRange(len, len);
    }
  }, [editingCommentId, editingCommentText]);

  // Fetch comments
  useEffect(() => {
    if (!bug?._id || !sheetOpen) return;
    const fetch = async () => {
      setCommentsLoading(true);
      try {
        const res = await commentService.getAll(bug._id, bug.projectId);
        setComments(res.data.data);
      } catch {
        // ignore
      } finally {
        setCommentsLoading(false);
      }
    };
    fetch();
  }, [bug?._id, sheetOpen, bug?.projectId]);

  // useEffect(() => {
  //   commentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [comments]);

  // Inline edit handlers
  const handleStartEditTitle = () => {
    if (!bug) return;
    setEditTitleValue(bug.title);
    setEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!bug || !editTitleValue.trim() || isUpdating) return;
    setIsUpdating(true);
    const oldTitle = bug.title;
    updateBug(bug._id, { title: editTitleValue.trim() });
    setEditingTitle(false);
    try {
      await bugService.update(bug._id, {
        title: editTitleValue.trim(),
        projectId: bug.projectId,
      });
      toast.success("Title updated");
    } catch {
      updateBug(bug._id, { title: oldTitle });
      toast.error("Failed to update title");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartEditDescription = () => {
    if (!bug) return;
    setEditDescriptionValue(bug.description || "");
    setEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    if (!bug || isUpdating) return;
    setIsUpdating(true);
    const oldDescription = bug.description;
    updateBug(bug._id, { description: editDescriptionValue });
    setEditingDescription(false);
    try {
      await bugService.update(bug._id, {
        description: editDescriptionValue,
        projectId: bug.projectId,
      });
      toast.success("Description updated");
    } catch {
      updateBug(bug._id, { description: oldDescription });
      toast.error("Failed to update description");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = (e?: React.KeyboardEvent) => {
    e?.stopPropagation();
    setEditingTitle(false);
    setEditingDescription(false);
  };

  const handleUpdate = async (updates: Record<string, any>) => {
    if (!bug) return;
    const old = { ...bug };
    updateBug(bug._id, updates);
    try {
      await bugService.update(bug._id, {
        ...updates,
        projectId: bug.projectId,
      });
    } catch {
      updateBug(bug._id, old);
      toast.error("Failed to update bug.");
    }
  };

  const handleSendComment = async () => {
    if (!bug || !commentText.trim() || isSendingComment) return;
    setIsSendingComment(true);
    try {
      const res = await commentService.create(
        bug._id,
        commentText.trim(),
        bug.projectId,
      );
      setComments((prev) => [...prev, res.data.data]);
      setCommentText("");
    } catch {
      toast.error("Failed to send comment.");
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      const res = await commentService.update(
        commentId,
        editingCommentText.trim(),
        bug?.projectId,
      );
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? res.data.data : c)),
      );
      setEditingCommentId(null);
    } catch {
      toast.error("Failed to edit comment.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c._id !== commentId));
    try {
      await commentService.delete(commentId, bug?.projectId);
      toast.success("Comment deleted.");
    } catch {
      toast.error("Failed to delete comment.");
    }
    setDeleteCommentTarget(null);
  };

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const closeGallery = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setGalleryOpen(false);
  }, []);

  const navigateGallery = useCallback(
    (dir: 1 | -1, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!bug) return;
      setGalleryIndex((i) => {
        const len = bug.attachments.length;
        return dir === 1
          ? i === len - 1
            ? 0
            : i + 1
          : i === 0
            ? len - 1
            : i - 1;
      });
    },
    [bug],
  );

  const getInitialsInline = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:!w-[600px] sm:!max-w-[600px] flex flex-col p-0"
          aria-hidden={galleryOpen ? "true" : undefined}
          style={galleryOpen ? { pointerEvents: "none" } : undefined}
        >
          {bug && (
            <>
              {/* HEADER */}
              <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-primary">
                        {bug.bugNumber}
                      </span>
                    </div>

                    {/* Editable Title */}
                    {editingTitle ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          ref={titleInputRef}
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              handleSaveTitle();
                            }
                            if (e.key === "Escape") {
                              e.stopPropagation();
                              handleCancelEdit(e);
                            }
                          }}
                          className="text-base font-semibold h-9"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg"
                          onClick={handleSaveTitle}
                          disabled={isUpdating}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1 group/title">
                        <h2 className="text-base font-semibold leading-tight">
                          {bug.title}
                        </h2>
                        {canEdit && (
                          <button
                            onClick={handleStartEditTitle}
                            className="opacity-0 group-hover/title:opacity-100 transition-opacity"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* BODY */}
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="px-5 py-4 flex flex-col gap-5">
                  {/* Editable Description */}
                  {bug.description !== undefined && (
                    <>
                      <div className="flex flex-col gap-1.5 group/desc">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Description
                          </label>
                          {canEdit && !editingDescription && (
                            <button
                              onClick={handleStartEditDescription}
                              className="opacity-0 group-hover/desc:opacity-100 transition-opacity"
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                            </button>
                          )}
                        </div>

                        {editingDescription ? (
                          <div className="flex flex-col gap-2">
                            <Textarea
                              ref={descriptionTextareaRef}
                              value={editDescriptionValue}
                              onChange={(e) =>
                                setEditDescriptionValue(e.target.value)
                              }
                              rows={4}
                              className="text-sm rounded-xl resize-none"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.ctrlKey) {
                                  e.stopPropagation();
                                  handleSaveDescription();
                                }
                                if (e.key === "Escape") {
                                  e.stopPropagation();
                                  handleCancelEdit();
                                }
                              }}
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelEdit();
                                }}
                                className="h-7 text-xs rounded-lg"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveDescription}
                                disabled={isUpdating}
                                className="h-7 text-xs rounded-lg"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                            {bug.description || "No description provided."}
                          </p>
                        )}
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Meta fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Status
                      </label>
                      <Badge
                        className={cn(
                          "w-fit text-[12px] px-2 py-0.5 rounded-full font-semibold",
                          getBugStatusColor(bug.status),
                        )}
                      >
                        {bug.status}
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Priority
                      </label>
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit text-[10px] px-2 rounded-full",
                          getPriorityColor(bug.priority),
                        )}
                      >
                        {bug.priority}
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Reporter
                      </label>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={bug.reportedBy?.avatar} />
                          <AvatarFallback className="text-[12px] bg-primary text-primary-foreground">
                            {getInitials(bug.reportedBy?.name ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{bug.reportedBy?.name}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Assignee
                      </label>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={bug?.assignee?.avatar} />
                          <AvatarFallback className="text-[12px] bg-primary text-primary-foreground">
                            {getInitials(bug?.assignee?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{bug?.assignee?.name}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* ATTACHMENTS */}
                  {bug.attachments.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Paperclip className="h-3 w-3" />
                        Attachments ({bug.attachments.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {bug.attachments.map((att, i) => (
                          <button
                            key={att._id}
                            onClick={() => openGallery(i)}
                            className="relative w-12 h-12 rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors group shrink-0"
                          >
                            {att.type === "image" ||
                            att.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img
                                src={att.url}
                                alt={att.originalName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* COMMENTS */}
                  <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Comments ({comments.length})
                    </label>

                    {commentsLoading ? (
                      <div className="flex items-center justify-center py-0">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4 font-medium">
                        No comments yet. Be the first to comment.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {comments.map((comment) => {
                          const isOwn = comment.author._id === user?._id;
                          return (
                            <div
                              key={comment._id}
                              className="flex gap-2.5 group"
                            >
                              <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                                <AvatarImage src={comment.author.avatar} />
                                <AvatarFallback className="text-[12px] bg-primary text-primary-foreground">
                                  {getInitials(comment.author.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold">
                                    {comment.author.name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-semibold">
                                    {formatRelativeTime(comment.createdAt)}
                                  </span>
                                  {comment.isEdited && (
                                    <span className="text-[10px] text-muted-foreground/60 font-medium">
                                      (edited)
                                    </span>
                                  )}
                                </div>

                                {editingCommentId === comment._id ? (
                                  <div className="flex flex-col gap-2">
                                    <Textarea
                                      ref={commentEditTextareaRef} // Add this ref
                                      autoFocus
                                      value={editingCommentText}
                                      onChange={(e) =>
                                        setEditingCommentText(e.target.value)
                                      }
                                      rows={2}
                                      className="text-sm rounded-xl resize-none"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          handleEditComment(comment._id);
                                        }
                                        if (e.key === "Escape")
                                          setEditingCommentId(null);
                                      }}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs rounded-lg"
                                        onClick={() =>
                                          handleEditComment(comment._id)
                                        }
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs rounded-lg"
                                        onClick={() =>
                                          setEditingCommentId(null)
                                        }
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                    {comment.content}
                                  </p>
                                )}
                              </div>

                              {(isOwn || canDelete) &&
                                editingCommentId !== comment._id && (
                                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    {isOwn && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-lg"
                                        onClick={() => {
                                          setEditingCommentId(comment._id);
                                          setEditingCommentText(
                                            comment.content,
                                          );
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-lg hover:text-destructive hover:bg-destructive/10"
                                      onClick={() =>
                                        setDeleteCommentTarget(comment._id)
                                      }
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                        <div ref={commentEndRef} />
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* COMMENT INPUT */}
              <div className="px-5 pb-5 shrink-0 border-t border-border pt-3">
                <div className="flex gap-2 items-center">
                  <Avatar className="h-7 w-7 shrink-0 mb-0.5">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-[12px] bg-primary text-primary-foreground">
                      {getInitials(user?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={1}
                      className="text-sm rounded-xl resize-none pr-10 min-h-[36px] max-h-32 font-medium"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendComment();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="absolute right-2 bottom-1.5 flex h-7 w-7 items-center justify-center rounded-lg p-0"
                      onClick={handleSendComment}
                      disabled={!commentText.trim() || isSendingComment}
                    >
                      {isSendingComment ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* GALLERY LIGHTBOX */}
      {galleryOpen && bug && bug.attachments.length > 0 && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeGallery(e);
          }}
        >
          <button
            className="absolute top-4 right-4 z-[200] h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white"
            onClick={closeGallery}
            style={{ pointerEvents: "auto" }}
          >
            <X className="h-5 w-5" />
          </button>

          {bug.attachments.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white"
              onClick={(e) => navigateGallery(-1, e)}
              style={{ pointerEvents: "auto" }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <img
            src={bug.attachments[galleryIndex].url}
            alt={bug.attachments[galleryIndex].originalName}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {bug.attachments.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white"
              onClick={(e) => navigateGallery(1, e)}
              style={{ pointerEvents: "auto" }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
            {galleryIndex + 1} / {bug.attachments.length}
          </div>

          {bug.attachments.length > 1 && (
            <div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {bug.attachments.map((att, i) => (
                <button
                  key={att._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryIndex(i);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                    i === galleryIndex
                      ? "border-white scale-110"
                      : "border-white/30 opacity-60",
                  )}
                >
                  <img
                    src={att.url}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete comment confirm */}
      <AlertDialog
        open={!!deleteCommentTarget}
        onOpenChange={() => setDeleteCommentTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteCommentTarget && handleDeleteComment(deleteCommentTarget)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
