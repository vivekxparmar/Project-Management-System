import { useChatStore } from "@/stores";
import { useSocket } from "./useSocket";
import { toast } from "sonner";

// This hook only exposes emit helpers for chat actions.
export const useChatSocket = (projectId: string) => {
  const { socket, isConnected } = useSocket(projectId);

  const { setLoading, prependMessages } = useChatStore();

  const sendMessage = (
    content: string,
    type: string = "text",
    attachments?: any[],
    mentions?: string[],
  ) => {
    if (!socket || !isConnected) {
      toast.error("Not connected to chat server");
      return false;
    }
    socket.emit("chat:message", {
      projectId,
      content,
      type,
      attachments,
      mentions,
    });
    return true;
  };

  const editMessage = (messageId: string, content: string) => {
    if (!socket || !isConnected) return false;
    socket.emit("chat:edit", { messageId, content });
    return true;
  };

  const deleteMessage = (messageId: string) => {
    if (!socket || !isConnected) return false;
    socket.emit("chat:delete", { messageId });
    return true;
  };

  const sendTyping = (isTyping: boolean) => {
    if (!socket || !isConnected) return;
    socket.emit("chat:typing", { projectId, isTyping });
  };

  const markAsRead = (messageId?: string) => {
    if (!socket || !isConnected) return;
    socket.emit("chat:read", { projectId, messageId });
  };

  const addReaction = (messageId: string, reaction: string) => {
    if (!socket || !isConnected) return;
    socket.emit("chat:react", { messageId, reaction, projectId });
  };

  const loadMoreMessages = (before: string, limit: number = 50) => {
    if (!socket || !isConnected) return;
    setLoading(true);
    socket.emit("chat:loadMore", { projectId, before, limit });
    socket.once("chat:history", (data) => {
      prependMessages(data.messages);
      setLoading(false);
    });
  };

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    markAsRead,
    addReaction,
    loadMoreMessages,
  };
};
