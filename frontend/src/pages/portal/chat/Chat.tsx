import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useChatStore, useAuthStore, useProjectStore } from "@/stores";
import { chatService } from "@/services";
import { useChatSocket } from "@/hooks";
import ChatHeader from "./ChatHeader";
import ChatMessageList from "./ChatMessageList";
import ChatInput from "./ChatInput";
import PageLoader from "@/components/shared/PageLoader";

export default function Chat() {
  const { projectId } = useParams<{ projectId: string }>();
  const user = useAuthStore((s) => s.user);
  const {
    messages,
    isLoading,
    hasMore,
    page,
    setMessages,
    prependMessages,
    setLoading,
    setHasMore,
    incrementPage,
    clearChat,
  } = useChatStore();
  const { currentProject } = useProjectStore();

  // useChatSocket internally calls useSocket which sets up ALL listeners
  useChatSocket(projectId!);

  const isFetchingMore = useRef(false);

  useEffect(() => {
    if (!projectId) return;
    clearChat();
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await chatService.getMessages(projectId, 1, 50);
        const data = res.data.data;
        setMessages(data);
        setHasMore(data.length === 50);
        chatService.markRead(projectId).catch(() => {});
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetch();
    return () => clearChat();
  }, [projectId]);

  const loadMore = async () => {
    if (!projectId || isFetchingMore.current || !hasMore) return;
    isFetchingMore.current = true;
    try {
      const nextPage = page + 1;
      const res = await chatService.getMessages(projectId, nextPage, 50);
      const data = res.data.data;
      prependMessages(data);
      setHasMore(data.length === 50);
      incrementPage();
    } catch {
      // ignore
    } finally {
      isFetchingMore.current = false;
    }
  };

  if (isLoading && messages.length === 0) return <PageLoader rows={6} />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* <ChatHeader projectId={projectId!} /> */}
      <ChatHeader />
      <ChatMessageList
        messages={messages}
        currentUserId={user?._id ?? ""}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
      <ChatInput
        projectId={projectId!}
        members={currentProject?.members || []}
      />
    </div>
  );
}
