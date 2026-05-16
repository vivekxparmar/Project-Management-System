import { useNavigate } from "react-router-dom";
import {
  useProjectStore,
  useNotificationStore,
  // useAuthStore
} from "@/stores";
import { Bell, Moon, Sun, X, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { notificationService } from "@/services";
import { useEffect, useState } from "react";
import { getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";
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
import { toast } from "sonner";
// import { useSocket } from "@/hooks/useSocket";

const TAB_LABELS: Record<string, string> = {
  sprint: "Sprint",
  backlog: "Backlog",
  bugtracker: "Bug Tracker",
  resources: "Resources",
  team: "Team",
  dashboard: "Dashboard",
  settings: "Settings",
  chat: "Chat",
  audit: "Audit Log",
};

interface PortalHeaderProps {
  activeTab: string;
}

export default function PortalHeader({ activeTab }: PortalHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  const currentProject = useProjectStore((s) => s.currentProject);
  // const { socket, isConnected } = useSocket(currentProject?._id);

  const {
    notifications,
    unreadCount,
    setNotifications,
    // addNotification,
    markRead,
    markAllRead,
    removeNotification,
    clearAllNotifications,
  } = useNotificationStore();

  // Fetching notifications on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await notificationService.getAll();
        const notificationsData = res.data.data || res.data;
        setNotifications(notificationsData);
      } catch (err: any) {
        console.error("Failed to fetch notifications:", err.message);
      }
    };
    fetchNotifications();
  }, [setNotifications]);

  const handleNotifClick = async (notification: Notification) => {
    if (!notification.isRead) {
      markRead(notification._id);
      await notificationService.markRead(notification._id).catch(() => {});
    }
  };

  const handleMarkAll = async () => {
    markAllRead();
    await notificationService.markAllRead().catch(() => {});
    toast.success("All notifications marked as read");
  };

  const handleDeleteNotification = async (
    notificationId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      await notificationService.delete(notificationId);
      removeNotification(notificationId);
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await notificationService.deleteAll();
      clearAllNotifications();
      setDeleteAllDialogOpen(false);
      toast.success("All notifications cleared");
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background/95 backdrop-blur px-3">
        <SidebarTrigger className="h-7 w-7 rounded-lg" />
        <Separator orientation="vertical" className="h-4" />

        <Breadcrumb className="flex-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => navigate("/projects")}
                className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink className="text-xs font-semibold text-muted-foreground max-w-32 truncate">
                {currentProject?.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs font-semibold text-primary">
                {TAB_LABELS[activeTab] ?? activeTab}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </Button>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg relative"
              >
                <Bell className="h-3.5 w-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 p-0 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1.5 text-[10px] font-semibold rounded-lg"
                    >
                      {unreadCount} unread
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-lg"
                      onClick={() => setDeleteAllDialogOpen(true)}
                      title="Clear all notifications"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAll}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              <ScrollArea className="h-80">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Bell className="h-6 w-6 mb-2" />
                    <p className="text-xs font-bold">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.slice(0, 30).map((notification) => (
                      <div
                        key={notification._id}
                        className={cn(
                          "group relative flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                          !notification.isRead && "bg-primary/5",
                        )}
                        onClick={() => handleNotifClick(notification)}
                      >
                        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                          <AvatarImage
                            src={notification.sender?.avatar || undefined}
                          />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(notification.sender?.name ?? "System")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-tight">
                            {notification.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 font-semibold">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-lg absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) =>
                            handleDeleteNotification(notification._id, e)
                          }
                          title="Delete notification"
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <AlertDialog
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllNotifications}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
