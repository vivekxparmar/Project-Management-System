import { useChatStore, useProjectStore } from "@/stores";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  projectId: string;
}

export default function ChatHeader({ projectId }: ChatHeaderProps) {
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const members = useProjectStore((s) => s.currentProject?.members ?? []);
  const projectName = useProjectStore((s) => s.currentProject?.name ?? "");

  const onlineMembers = members.filter((m) =>
    onlineUserIds.includes(m.user._id),
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
        {/* Title */}
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Chat</h2>
        </div>

        {/* Online indicator */}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground font-semibold">
            {onlineMembers.length} online
          </span>
        </div>

        <div className="flex-1" />

        {/* Online member avatars */}
        <div className="flex -space-x-1.5">
          {onlineMembers.slice(0, 6).map((m) => (
            <Tooltip key={m.user._id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={m.user.avatar ?? undefined} />
                    <AvatarFallback className="text-[10px] font-semibold bg-primary text-primary-foreground">
                      {getInitials(m.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-xs font-medium bg-primary text-primary-foreground"
              >
                {m.user.name} — online
              </TooltipContent>
            </Tooltip>
          ))}
          {onlineMembers.length > 6 && (
            <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center">
              <span className="text-[10px] font-semibold text-muted-foreground">
                +{onlineMembers.length - 6}
              </span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
