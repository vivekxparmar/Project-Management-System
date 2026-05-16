import { useEffect } from "react";
import { Outlet, useParams, useNavigate, useLocation } from "react-router-dom";
import { useProjectStore, useAuthStore } from "@/stores";
import { useSocket } from "@/hooks";
import { useSprint } from "@/hooks";
import { projectService } from "@/services";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import PortalHeader from "@/components/layout/PortalHeader";
import AppLoader from "@/components/shared/AppLoader";
import { useSidebar } from "@/components/ui/sidebar";

function PortalLayout({ projectId, activeTab, children }: any) {
  const { state } = useSidebar();

  return (
    <div
      className="flex flex-col flex-1 min-w-0 overflow-hidden h-screen transition-all duration-200"
      style={{
        marginLeft: state === "collapsed" ? "4.1rem" : "13.1rem", // matches SIDEBAR_WIDTH_ICON and SIDEBAR_WIDTH
      }}
    >
      {children}
    </div>
  );
}

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useAuthStore((s) => s.user);
  const { currentProject, setCurrentProject, isLoading } = useProjectStore();
  const { fetchSprints, clearSprints } = useSprint(projectId);

  // Connect socket to this project room
  useSocket(projectId);

  // Load project
  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      try {
        if (currentProject?._id === projectId) {
          fetchSprints(projectId);
          return;
        }

        const res = await projectService.getById(projectId);
        const project = res.data.data;

        // Attach myRole
        const member = project.members.find(
          (m: any) => m.user._id === user?._id,
        );
        setCurrentProject({ ...project, myRole: member?.role ?? "Client" });
        fetchSprints(projectId);
      } catch {
        navigate("/projects");
      }
    };

    load();

    return () => {
      clearSprints();
    };
  }, [projectId]);

  if (isLoading && !currentProject) return <AppLoader />;

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("backlog")) return "backlog";
    if (path.includes("bugtracker")) return "bugtracker";
    if (path.includes("resources")) return "resources";
    if (path.includes("team")) return "team";
    if (path.includes("dashboard")) return "dashboard";
    if (path.includes("settings")) return "settings";
    if (path.includes("chat")) return "chat";
    if (path.includes("audit")) return "audit";
    return "sprint";
  };

  return (
    <SidebarProvider>
      <AppSidebar projectId={projectId!} activeTab={getActiveTab()} />
      <PortalLayout projectId={projectId} activeTab={getActiveTab()}>
        <PortalHeader activeTab={getActiveTab()} />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </PortalLayout>
    </SidebarProvider>
  );
}
