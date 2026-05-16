import { useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessageItem from "./ChatMessageItem";
import ChatTypingIndicator from "./ChatTypingIndicator";
import type { ChatMessage } from "@/types";
import { formatDate } from "@/lib/utils";
// import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  onLoadMore: () => void;
  hasMore: boolean;
}

// Group messages by date for date separators
const groupByDate = (messages: ChatMessage[]) => {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";

  messages.forEach((msg) => {
    const date = new Date(msg.createdAt).toDateString();
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  });

  return groups;
};

export default function ChatMessageList({
  messages,
  currentUserId,
  onLoadMore,
  hasMore,
}: ChatMessageListProps) {
  // console.log("ChatMessageList rendering with", messages.length, "messages");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isFirstLoad = useRef(true);

  // Auto scroll to bottom on first load and new messages
  useEffect(() => {
    if (isFirstLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      isFirstLoad.current = false;
      return;
    }

    // Only auto-scroll if already near the bottom
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 120) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowScrollBtn(true);
    }
  }, [messages.length]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    // Show/hide scroll-to-bottom button
    setShowScrollBtn(distFromBottom > 200);

    // Load more when scrolled to top
    if (el.scrollTop < 60 && hasMore && !isLoadingMore) {
      const prevScrollHeight = el.scrollHeight;
      setIsLoadingMore(true);
      await onLoadMore();
      setIsLoadingMore(false);
      // Preserve scroll position after prepending
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
  };

  const groups = groupByDate(messages);

  return (
    <div className="flex-1 relative overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto custom-scroll px-4 py-3"
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Messages grouped by date */}
        {groups.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" />
              <Badge className="text-[11px] bg-muted rounded-full text-muted-foreground font-semibold px-2">
                {new Date(group.date).toDateString() ===
                new Date().toDateString()
                  ? "Today"
                  : new Date(group.date).toDateString() ===
                      new Date(Date.now() - 86400000).toDateString()
                    ? "Yesterday"
                    : formatDate(group.date)}
              </Badge>
              <div className="flex-1 h-px" />
            </div>

            {/* Messages */}
            {group.messages.map((msg, i) => {
              const prevMsg = group.messages[i - 1];
              const isConsecutive =
                prevMsg &&
                prevMsg.sender._id === msg.sender._id &&
                new Date(msg.createdAt).getTime() -
                  new Date(prevMsg.createdAt).getTime();
              300000; // 5 min

              return (
                <ChatMessageItem
                  key={msg._id}
                  message={msg}
                  isOwn={msg.sender._id === currentUserId}
                  isConsecutive={isConsecutive}
                />
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        <ChatTypingIndicator />

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-4 h-8 w-8 rounded-full shadow-lg"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
