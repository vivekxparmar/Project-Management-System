import { useNavigate } from "react-router-dom";
import {
  useAuthStore,
  // useProjectStore,
  // useNotificationStore,
  useChatStore,
} from "@/stores";
import { useAuth } from "@/hooks";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Zap,
  Archive,
  Bug,
  FolderOpen,
  Users,
  Settings,
  MessageSquare,
  ScrollText,
  LogOut,
  ChevronLeft,
  // Bell,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Logo_Dark from "@/assets/pms_logo_dark.png";
import Logo_Light from "@/assets/pms_logo_light.png";

interface AppSidebarProps {
  projectId: string;
  activeTab: string;
}

const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "dashboard",
  },
  { key: "sprint", label: "Sprint", icon: Zap, path: "sprint" },
  { key: "backlog", label: "Backlog", icon: Archive, path: "backlog" },
  { key: "bugtracker", label: "Bug Tracker", icon: Bug, path: "bugtracker" },
  { key: "resources", label: "Resources", icon: FolderOpen, path: "resources" },
  { key: "team", label: "Team", icon: Users, path: "team" },
  { key: "chat", label: "Chat", icon: MessageSquare, path: "chat" },
  { key: "audit", label: "Audit Log", icon: ScrollText, path: "audit" },
  { key: "settings", label: "Settings", icon: Settings, path: "settings" },
];

export default function AppSidebar({ projectId, activeTab }: AppSidebarProps) {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const [tooltipEnabled, setTooltipEnabled] = useState(false);
  const isCollapsed = state === "collapsed";

  const user = useAuthStore((s) => s.user);
  // const currentProject = useProjectStore((s) => s.currentProject);
  // const unreadCount = useNotificationStore((s) => s.unreadCount);
  const chatUnreadCount = useChatStore((s) => s.unreadCount);
  const { logout } = useAuth();

  const goTo = (path: string) => {
    navigate(`/projects/portal/${projectId}/${path}`);
  };

  useEffect(() => {
    if (isCollapsed) {
      const t = setTimeout(() => setTooltipEnabled(true), 200);
      return () => clearTimeout(t);
    } else {
      setTooltipEnabled(false);
    }
  }, [isCollapsed]);

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={0}>
      <Sidebar
        collapsible="icon"
        className={cn(
          "border-r border-border shrink-0 overflow-hidden",
          isCollapsed
            ? "min-w-[var(--sidebar-width-icon)] max-w-[var(--sidebar-width-icon)]"
            : "min-w-[var(--sidebar-width)] max-w-[var(--sidebar-width)]",
        )}
      >
        {/* Header */}
        <SidebarHeader className="px-3 py-4">
          <div
            className="flex items-start gap-2 cursor-pointer pl-1"
            onClick={() => navigate("/projects")}
          >
            <img
              src={resolvedTheme === "dark" ? Logo_Dark : Logo_Light}
              alt="PMS Logo"
              className="w-8"
            />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1 overflow-hidden transition-all duration-200">
                <span className="text-[12px] font-semibold text-muted-foreground truncate leading-tight">
                  PMS Portal
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        {/* Nav */}
        <SidebarContent className="px-2 py-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;

                  return (
                    <SidebarMenuItem key={item.key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            onClick={() => goTo(item.path)}
                            isActive={isActive}
                            className={cn(
                              "relative h-9 font-semibold transition-all duration-150",
                              isActive
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                : "hover:bg-muted",
                            )}
                          >
                            <Icon
                              className={cn("h-4 w-4 shrink-0 font-semibold")}
                            />
                            {!isCollapsed && (
                              <span
                                className={cn(
                                  "text-sm font-medium transition-all duration-200",
                                  isCollapsed
                                    ? "opacity-0 w-0 overflow-hidden"
                                    : "opacity-100 w-auto",
                                )}
                              >
                                {item.label}
                              </span>
                            )}
                            {/* Chat unread badge */}
                            {item.key === "chat" && chatUnreadCount > 0 && (
                              <Badge
                                variant="destructive"
                                className={cn(
                                  "h-4 min-w-4 px-1 text-[10px] rounded-lg leading-none",
                                  isCollapsed
                                    ? "absolute -top-1 -right-1"
                                    : "ml-auto",
                                )}
                              >
                                {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                              </Badge>
                            )}
                          </SidebarMenuButton>
                        </TooltipTrigger>

                        {isCollapsed && tooltipEnabled && (
                          <TooltipContent
                            side="right"
                            className="font-semibold bg-primary text-primary-foreground"
                          >
                            {item.label}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        {/* Footer */}
        <SidebarFooter className="px-2 py-3 gap-1">
          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => navigate("/projects")}
                className={cn(
                  "w-full justify-start gap-2 h-9 rounded-xl relative",
                  isCollapsed && "justify-center px-0",
                )}
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm text-muted-foreground">
                    All Projects
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent
                side="right"
                className="bg-primary text-primary-foreground font-semibold"
              >
                All Projects
              </TooltipContent>
            )}
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted cursor-pointer transition-colors",
                  isCollapsed && "justify-center px-0",
                )}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="text-[11px] font-semibold bg-primary text-primary-foreground">
                    {getInitials(user?.name ?? "U")}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <span className="text-xs font-semibold truncate leading-tight">
                      {user?.name}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground truncate leading-tight">
                      {user?.email}
                    </span>
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="right"
              align="end"
              className="w-56 rounded-xl p-1"
              sideOffset={10}
            >
              <div className="px-2 py-1.5 mb-1 border-b border-border">
                <p className="text-xs font-semibold truncate">{user?.name}</p>
                <p className="text-[10px] font-semibold text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>

              <DropdownMenuItem
                className="rounded-lg gap-2 text-sm cursor-pointer mt-1"
                onClick={() => navigate("/profile")}
              >
                <User className="h-3.5 w-3.5" />
                <span>Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="rounded-lg gap-2 text-sm text-destructive focus:text-destructive cursor-pointer"
                onClick={logout}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
