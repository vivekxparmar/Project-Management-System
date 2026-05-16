import { useState, useRef, useEffect } from "react";
// import { useParams } from "react-router-dom";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// import { useSocket } from "@/hooks";
import { getSocket } from "@/lib/socket";
// import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import type { ProjectMember } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/constants";

interface ChatInputProps {
  projectId: string;
  members: ProjectMember[];
}

export default function ChatInput({ projectId, members }: ChatInputProps) {
  // const user = useAuthStore((s) => s.user);
  // const { emit } = useSocket(projectId);
  const emit = (event: string, data?: any) => getSocket()?.emit(event, data);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  //mention state
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  // const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const startTyping = () => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emit("chat:typing", { projectId, isTyping: true });
    }
    // Reset the stop-typing timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
  };

  const stopTyping = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emit("chat:typing", { projectId, isTyping: false });
    }
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content || isSending) return;

    stopTyping();
    setIsSending(true);
    setText("");

    try {
      // Send via socket - use correct event name 'chat:message'
      emit("chat:message", {
        projectId,
        content,
        type: "text",
        attachments: [],
        // mentions: [],
        mentions,
      });
      // console.log("Message emit successful");
      setMentions([]);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore text on failure
      setText(content);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  //   setText(e.target.value);
  //   if (e.target.value.trim()) {
  //     startTyping();
  //   } else {
  //     stopTyping();
  //   }
  // };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    setText(value);

    if (value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }

    const cursorPosition = e.target.selectionStart;

    const textBeforeCursor = value.slice(0, cursorPosition);

    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      setShowMentions(true);
      setMentionQuery(match[1]);
    } else {
      setShowMentions(false);
    }
  };

  const filteredMembers = members.filter((member) =>
    member.user.name.toLowerCase().includes(mentionQuery.toLowerCase()),
  );

  const insertMention = (member: ProjectMember) => {
    const newText = text.replace(/@([a-zA-Z0-9_]*)$/, `@${member.user.name} `);

    setText(newText);

    setMentions((prev) => {
      if (prev.includes(member.user._id)) return prev;

      return [...prev, member.user._id];
    });

    setShowMentions(false);

    textareaRef.current?.focus();
  };

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      stopTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="px-4 py-3 border-t border-border bg-background shrink-0">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          {showMentions && filteredMembers.length > 0 && (
            <div className="absolute bottom-14 left-0 z-50 w-64 rounded-xl border bg-background shadow-lg overflow-hidden">
              {/* {filteredMembers.map((member, index) => ( */}
              {filteredMembers.map((member) => (
                <button
                  key={member._id}
                  type="button"
                  onClick={() => insertMention(member)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition",
                    // index === selectedIndex && "bg-muted",
                  )}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={member.user.avatar ?? ""} />
                    <AvatarFallback>
                      {getInitials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <span>@{member.user.name}</span>
                </button>
              ))}
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className={cn(
              "resize-none text-sm pr-4 py-2.5 min-h-[42px]",
              "scrollbar-none overflow-y-auto font-medium",
            )}
            style={{ maxHeight: "120px" }}
          />
        </div>

        <Button
          size="icon"
          className="h-[42px] w-[42px] shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || isSending}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
