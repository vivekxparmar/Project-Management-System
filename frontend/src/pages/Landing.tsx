import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Zap,
  Bug,
  Users,
  MessageSquare,
  LayoutDashboard,
  Archive,
  ArrowRight,
  CheckCircle2,
  Moon,
  Sun,
  Mail,
  PhoneCall,
  ArrowUpRight,
  GraduationCap,
  Clock,
  TrendingUp,
  Shield,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo_Dark from "@/assets/pms_logo_dark.png";
import Logo_Light from "@/assets/pms_logo_light.png";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Zap,
    title: "Sprint Planning",
    desc: "Plan and track sprints with real-time task and subtask management.",
  },
  {
    icon: Archive,
    title: "Backlog",
    desc: "Keep unplanned work organized and move tasks to sprints with one click.",
  },
  {
    icon: Bug,
    title: "Bug Tracker",
    desc: "Report, assign, and resolve bugs with image attachments and comments.",
  },
  {
    icon: MessageSquare,
    title: "Team Chat",
    desc: "Real-time group chat for your project team — like a private workspace.",
  },
  {
    icon: Users,
    title: "RBAC Team",
    desc: "5 roles with granular permissions — Owner, Admin, Developer, Designer, Client.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    desc: "Visual charts and KPIs showing project health at a glance.",
  },
];

const highlights = [
  "Real-time updates across all modules",
  "In-app + email notifications",
  "Time tracking on tasks & bugs",
  "Kanban project board",
  "Audit log for all actions",
  "Cloudinary file & image uploads",
];

const boardTasks = {
  todo: [
    {
      title: "Design onboarding flow UI",
      priority: "P1",
      tag: "Design",
      avatars: ["SR"],
    },
    { title: "Write API docs for auth", priority: "P2", avatars: ["MK"] },
    { title: "Set up CI/CD pipeline", priority: "P1", avatars: ["JD", "PR"] },
  ],
  inProgress: [
    {
      title: "Implement JWT refresh token",
      priority: "P0",
      timer: "2h 14m",
      avatars: ["JD"],
    },
    {
      title: "Build project settings page",
      priority: "P1",
      timer: "45m",
      avatars: ["SR"],
    },
    {
      title: "Migrate DB to MongoDB Atlas",
      priority: "P2",
      avatars: ["MK", "JD"],
    },
  ],
  done: [
    { title: "Set up repository structure", priority: "P3", avatars: ["JD"] },
    {
      title: "Create initial Figma wireframes",
      priority: "P2",
      avatars: ["SR"],
    },
    { title: "Define sprint 1 scope", priority: "P1", avatars: ["PR"] },
  ],
};

const priorityColors: Record<string, string> = {
  P0: "bg-red-500/15 text-red-500",
  P1: "bg-amber-500/15 text-amber-500",
  P2: "bg-blue-500/15 text-blue-500",
  P3: "bg-muted text-muted-foreground",
};

const avatarColors: Record<string, string> = {
  JD: "bg-primary/20 text-primary",
  SR: "bg-red-500/20 text-red-500",
  MK: "bg-green-500/20 text-green-500",
  PR: "bg-amber-500/20 text-amber-500",
};

const teamMembers = [
  {
    initials: "PR",
    name: "Peter Raj",
    role: "Owner",
    tasks: 8,
    total: 12,
    online: true,
    roleColor: "bg-amber-500/15 text-amber-600",
  },
  {
    initials: "JD",
    name: "Jamie Dev",
    role: "Developer",
    tasks: 6,
    total: 10,
    online: true,
    roleColor: "bg-blue-500/15 text-blue-600",
  },
  {
    initials: "SR",
    name: "Sara Rossi",
    role: "Designer",
    tasks: 4,
    total: 8,
    online: true,
    roleColor: "bg-primary/15 text-primary",
  },
  {
    initials: "MK",
    name: "Mike K",
    role: "Developer",
    tasks: 3,
    total: 9,
    online: false,
    roleColor: "bg-blue-500/15 text-blue-600",
  },
];

const chatMessages = [
  {
    initials: "JD",
    name: "Jamie",
    text: "JWT refresh is done, moving to review 🎉",
    time: "10:42 AM",
    own: false,
  },
  {
    initials: "PR",
    name: "Peter",
    text: "@Sara can you review the auth flow designs before EOD?",
    time: "10:44 AM",
    own: false,
  },
  {
    initials: "SR",
    name: "You",
    text: "On it! Already have notes from the wireframe review",
    time: "10:45 AM",
    own: true,
  },
];

// Animation variants - simplified without explicit ease strings
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } },
};

const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

export default function Landing() {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-border bg-transparent backdrop-blur-md">
        <div className="mx-auto px-16 h-14 flex items-center justify-between">
          <img
            src={resolvedTheme === "dark" ? Logo_Dark : Logo_Light}
            alt="PMS Logo"
            className="w-7"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8 rounded-xl bg-transparent text-foreground"
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
            <Button
              variant="default"
              size="sm"
              className="bg-primary text-primary-foreground font-semibold hover:bg-primary/80"
              onClick={() => navigate("/login")}
            >
              Sign in
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-16 py-24 relative overflow-hidden">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.02) 50%, transparent 80%)",
              "radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.03) 50%, transparent 80%)",
              "radial-gradient(circle at 40% 80%, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.02) 50%, transparent 80%)",
              "radial-gradient(circle at 60% 20%, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.03) 50%, transparent 80%)",
              "radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.02) 50%, transparent 80%)",
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Animated floating orbs */}
        <motion.div
          className="absolute top-1/4 left-1/3 w-[200px] h-96 rounded-full bg-primary/10 blur-3xl"
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-primary/10 blur-3xl"
          animate={{
            x: [0, -40, 30, 0],
            y: [0, 30, -20, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Add a third floating orb for more depth */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/3 blur-3xl"
          animate={{
            scale: [1, 1.2, 0.8, 1],
            opacity: [1, 1, 1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="absolute inset-0 pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="z-10 max-w-3xl flex flex-col items-center justify-center gap-5"
        >
          <Badge
            variant="secondary"
            className="mb-6 rounded-full px-4 py-1 text-xs bg-muted/80 backdrop-blur-sm text-foreground"
          >
            Manage your Project at lightning speed
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Ship Faster With Your{" "}
            <span className="text-primary">Entire Team</span>
          </h1>
          <p className="text-base sm:text-md text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            PMS gives your team sprint planning, bug tracking, real-time chat,
            and powerful dashboards: all synced live across every member.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="lg"
              className="h-11 px-8 font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
              onClick={() => navigate("/register")}
            >
              Register Now
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-8 backdrop-blur-sm hover:bg-primary/10 transition-all duration-300"
              onClick={() => navigate("/login")}
            >
              Sign in
            </Button>
          </div>
        </motion.div>
      </section>

      {/* HIGHLIGHTS */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={staggerContainer}
        className="border-y border-border bg-muted/30 py-7 px-16"
      >
        <div className="mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {highlights.map((text, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground font-semibold">
                  {text}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* FEATURES */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="py-16 px-16"
      >
        <div className="mx-auto">
          <div className="text-center mb-12">
            <motion.p
              variants={fadeInUp}
              className="text-xs font-semibold text-primary uppercase tracking-widest mb-3"
            >
              Features
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
            >
              Everything Your Team Needs
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-sm text-muted-foreground font-semibold mx-auto"
            >
              A complete project management suite built for small, focused teams
              of 10–15 people.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  variants={scaleUp}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* SPRINT BOARD DEMO */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="py-16 px-16 bg-muted/20 border-y border-border"
      >
        <div className="mx-auto">
          <div className="text-center mb-10">
            <motion.p
              variants={fadeInUp}
              className="text-xs font-semibold text-primary uppercase tracking-widest mb-3"
            >
              Sprint Board
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
            >
              See Your Work In Motion
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-sm text-muted-foreground font-semibold"
            >
              Drag tasks across columns. Real-time updates for your whole team —
              no refresh needed.
            </motion.p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["todo", "inProgress", "done"] as const).map((col) => {
              const labels: Record<string, string> = {
                todo: "To Do",
                inProgress: "In Progress",
                done: "Done",
              };
              const tasks = boardTasks[col];
              return (
                <motion.div
                  key={col}
                  variants={fadeInUp}
                  className="bg-card border border-border rounded-2xl p-3"
                >
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {labels[col]}
                    </span>
                    <span className="text-[11px] font-bold bg-muted px-2 py-0.5 rounded-full">
                      {tasks.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {tasks.map((task, i) => (
                      <div
                        key={i}
                        className={cn(
                          "bg-background border border-border rounded-xl p-3 cursor-pointer hover:border-primary/40 transition-all",
                          col === "done" && "opacity-60",
                        )}
                      >
                        <p className="text-xs font-medium leading-snug mb-2">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                              priorityColors[task.priority],
                            )}
                          >
                            {task.priority}
                          </span>
                          {"tag" in task && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {task.tag}
                            </span>
                          )}

                          <div className="flex ml-auto">
                            {task.avatars.map((av) => (
                              <div
                                key={av}
                                className={cn(
                                  "w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center -ml-1 first:ml-0 border border-background",
                                  avatarColors[av],
                                )}
                              >
                                {av[0]}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* SPRINT PROGRESS */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="py-16 px-16"
      >
        <div className="mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeInLeft}>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                Sprint Health
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                Always know where your sprint stands
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Track completion, time usage, and story points in real time.
                Lock sprints to prevent scope creep. Get notified before
                deadlines slip.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Sprint velocity tracking", icon: TrendingUp },
                  { label: "Lock sprints to freeze scope", icon: Shield },
                  { label: "Built-in time tracking per task", icon: Clock },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    className="flex items-center gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={fadeInRight}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <p className="text-sm font-bold">
                    Sprint 3 — Auth & Dashboard
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    May 1 – May 14 · 12 tasks
                  </p>
                </div>
                <Badge className="bg-green-500/15 text-green-600 border-green-500/20 text-[11px] rounded-lg font-medium">
                  ● Active
                </Badge>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {[
                  { label: "Completion", val: 58, color: "bg-primary" },
                  { label: "Time used", val: 64, color: "bg-amber-500" },
                  { label: "Story points", val: 45, color: "bg-green-500" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0 font-medium">
                      {row.label}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", row.color)}
                        style={{ width: `${row.val}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-8 text-right">
                      {row.val}%
                    </span>
                  </div>
                ))}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[
                    {
                      num: "4",
                      label: "To Do",
                      color: "text-muted-foreground",
                    },
                    { num: "3", label: "Active", color: "text-amber-500" },
                    { num: "5", label: "Done", color: "text-green-500" },
                    { num: "2", label: "Bugs", color: "text-red-500" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-muted/50 rounded-xl p-2.5 text-center border border-border"
                    >
                      <div className={cn("text-xl font-bold", s.color)}>
                        {s.num}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-semibold">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* TEAM + CHAT SIDE BY SIDE */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="py-16 px-16 bg-muted/20 border-y border-border"
      >
        <div className="mx-auto">
          <div className="text-center mb-10">
            <motion.p
              variants={fadeInUp}
              className="text-xs font-semibold text-primary uppercase tracking-widest mb-3"
            >
              Team & Chat
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
            >
              Built for teams that move fast
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-sm text-muted-foreground font-semibold"
            >
              Role-based permissions, live presence, and in-project chat — all
              in one place.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Team table */}
            <motion.div
              variants={fadeInLeft}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border">
                <p className="text-sm font-bold">
                  Project Team · {teamMembers.length} members
                </p>
              </div>
              <div className="divide-y divide-border">
                {teamMembers.map((m, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        avatarColors[m.initials],
                      )}
                    >
                      {m.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{m.name}</p>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                          m.roleColor,
                        )}
                      >
                        {m.role}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] font-semibold">
                        {m.tasks}/{m.total} tasks
                      </span>
                      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(m.tasks / m.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        m.online ? "bg-green-500" : "bg-muted-foreground/30",
                      )}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Chat */}
            <motion.div
              variants={fadeInRight}
              className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center gap-2.5 p-4 border-b border-border">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-row items-center gap-2">
                  <p className="text-sm font-bold">Chat</p>
                  <p className="text-[11px] text-green-500 font-semibold">
                    ● 3 online
                  </p>
                </div>
              </div>
              <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    className={cn(
                      "flex gap-2 items-end",
                      msg.own && "flex-row-reverse",
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        avatarColors[msg.initials],
                      )}
                    >
                      {msg.initials}
                    </div>
                    <div
                      className={cn(
                        "max-w-[75%] px-3 py-2 rounded-2xl text-xs font-medium",
                        msg.own
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm",
                      )}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                <motion.div
                  variants={fadeInUp}
                  className="flex gap-2 items-end"
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      avatarColors["MK"],
                    )}
                  >
                    MK
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${dot * 0.2}s` }}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
              <div className="p-3 border-t border-border flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-xl px-3 py-2 text-xs text-muted-foreground font-medium">
                  Send a message...
                </div>
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center cursor-pointer">
                  <Send className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* FOOTER */}
      <motion.footer
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={staggerContainer}
        className="border-t border-border py-6 px-16"
      >
        <div className="mx-auto flex items-start justify-between flex-wrap gap-8">
          <motion.div variants={fadeInUp} className="flex flex-col gap-1">
            <img
              src={resolvedTheme === "dark" ? Logo_Dark : Logo_Light}
              alt="PMS Logo"
              className="w-7"
            />
            <h1 className="font-semibold">Project Management System</h1>
            <p className="text-xs text-muted-foreground max-w-xs mt-1 font-semibold">
              Built for developers who hate bloated tools.
            </p>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex flex-col gap-2">
            <p className="font-semibold text-sm">Contact Us</p>
            <p className="text-sm font-medium text-muted-foreground">
              <Mail className="h-3.5 w-3.5 inline-block mr-1" />
              <a
                href="mailto:projectflow07@gmail.com"
                className="hover:text-primary transition-colors"
              >
                projectflow07@gmail.com
              </a>
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              <PhoneCall className="h-3.5 w-3.5 inline-block mr-1" />
              <a
                href="tel:+919727591075"
                className="hover:text-primary transition-colors"
              >
                +91 9727591075
              </a>
            </p>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground font-semibold">
              Developed By
            </p>
            <a
              href="https://vivekxparmar.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              <ArrowUpRight className="h-3.5 w-3.5 inline-block mr-1" />
              Vivek Parmar
            </a>
            <span className="text-sm font-medium">
              <GraduationCap className="h-3.5 w-3.5 inline-block mr-1" />
              B.Tech. IT
            </span>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}
