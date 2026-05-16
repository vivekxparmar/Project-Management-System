import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  List,
  Plus,
  Moon,
  Sun,
  LogOut,
  User,
  // Archive,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useProject } from "@/hooks";
import { useAuthStore } from "@/stores";
import { useAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import PageLoader from "@/components/shared/PageLoader";
import ProjectKanban from "./ProjectKanban";
import ProjectList from "./ProjectList";
import CreateProjectDialog from "./CreateProjectDialog";
import { getInitials } from "@/lib/constants";
import Logo_Dark from "@/assets/pms_logo_dark.png";
import Logo_Light from "@/assets/pms_logo_light.png";

type ViewMode = "kanban" | "list";

export default function Projects() {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useAuthStore();
  // console.log("USER IN STORE:", user);
  const { logout } = useAuth();
  const { projects, isLoading, isInitialized, fetchProjects } = useProject();

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  if (isLoading && !isInitialized) {
    return <PageLoader rows={3} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <img
            src={resolvedTheme === "dark" ? Logo_Dark : Logo_Light}
            alt="PMS Logo"
            className="w-7"
          />

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-xl p-1 gap-0.5">
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-5" />

            {/* Create */}
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Project
            </Button>

            {/* Theme */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex items-center gap-2 rounded-xl px-2 py-1 bg-transparent transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-[11px] font-semibold bg-primary text-primary-foreground">
                      {getInitials(user?.name ?? "U")}
                    </AvatarFallback>
                  </Avatar>
                  {/* <span className="text-sm font-medium hidden sm:block">
                    {user?.name?.split(" ")[0]}
                  </span> */}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={2}
                className="w-48 rounded-2xl font-semibold"
              >
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold">{user?.name}</p>
                  <p className="text-[11px] text-muted-foreground font-semibold truncate">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl gap-2 text-xs"
                  onClick={() => navigate("/profile")}
                >
                  <User className="h-3.5 w-3.5" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl gap-2 text-xs text-destructive focus:text-destructive"
                  onClick={logout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground font-semibold mt-0.5">
              {projects.length} project{projects.length !== 1 ? "s" : ""} in
              your workspace
            </p>
          </div>
        </div>

        {/* Content */}
        {/* {isLoading && !isInitialized ? ( */}
        {!isInitialized ? (
          <PageLoader rows={3} />
        ) : (
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {viewMode === "kanban" ? (
              <ProjectKanban projects={projects} />
            ) : (
              <ProjectList projects={projects} />
            )}
          </motion.div>
        )}
      </main>

      {/* Create dialog */}
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
