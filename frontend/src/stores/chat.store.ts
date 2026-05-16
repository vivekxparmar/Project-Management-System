import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { ChatMessage } from "../types";

interface TypingUser {
  userId: string;
  userName: string;
}

interface ChatState {
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  onlineUserIds: string[];
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  unreadCount: number;

  setUnreadCount: (count: number) => void;
  setMessages: (messages: ChatMessage[]) => void;
  prependMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (messageId: string) => void;
  setTyping: (user: TypingUser, isTyping: boolean) => void;
  setOnlineUsers: (userIds: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  incrementPage: () => void;
  resetPage: () => void;
  clearChat: () => void;
  removeMessageById: (messageId: string) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    immer((set) => ({
      messages: [],
      typingUsers: [],
      onlineUserIds: [],
      isLoading: false,
      hasMore: true,
      page: 1,
      unreadCount: 0,

      setMessages: (messages) =>
        set((state) => {
          state.messages = messages;
        }),

      prependMessages: (messages) =>
        set((state) => {
          // Deduplicate by _id to avoid double messages on reload
          const existingIds = new Set(state.messages.map((m) => m._id));
          const newMessages = messages.filter((m) => !existingIds.has(m._id));
          state.messages = [...newMessages, ...state.messages];
        }),

      setUnreadCount: (count) =>
        set((state) => {
          state.unreadCount = count;
        }),

      addMessage: (message) =>
        set((state) => {
          // Avoid duplicate messages (e.g. from socket + optimistic update)
          const exists = state.messages.some((m) => m._id === message._id);
          if (!exists) state.messages.push(message);
        }),

      updateMessage: (messageId, updates) =>
        set((state) => {
          const idx = state.messages.findIndex((m) => m._id === messageId);
          if (idx !== -1) Object.assign(state.messages[idx], updates);
        }),

      removeMessage: (messageId) =>
        set((state) => {
          const idx = state.messages.findIndex((m) => m._id === messageId);
          if (idx !== -1) {
            state.messages[idx].content = "This message was deleted";
            state.messages[idx].deletedAt = new Date().toISOString();
            state.messages[idx].attachments = [];
            state.messages[idx].reactions = {};
          }
        }),

      removeMessageById: (messageId) =>
        set((state) => {
          state.messages = state.messages.filter((m) => m._id !== messageId);
        }),

      setTyping: (user, isTyping) =>
        set((state) => {
          if (isTyping) {
            const exists = state.typingUsers.find(
              (u) => u.userId === user.userId,
            );
            if (!exists) state.typingUsers.push(user);
          } else {
            state.typingUsers = state.typingUsers.filter(
              (u) => u.userId !== user.userId,
            );
          }
        }),

      setOnlineUsers: (userIds) =>
        set((state) => {
          state.onlineUserIds = userIds;
        }),

      addOnlineUser: (userId) =>
        set((state) => {
          if (!state.onlineUserIds.includes(userId)) {
            state.onlineUserIds.push(userId);
          }
        }),

      removeOnlineUser: (userId) =>
        set((state) => {
          state.onlineUserIds = state.onlineUserIds.filter(
            (id) => id !== userId,
          );
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setHasMore: (hasMore) =>
        set((state) => {
          state.hasMore = hasMore;
        }),

      incrementPage: () =>
        set((state) => {
          state.page += 1;
        }),

      resetPage: () =>
        set((state) => {
          state.page = 1;
        }),

      clearChat: () =>
        set((state) => {
          state.messages = [];
          state.typingUsers = [];
          state.onlineUserIds = [];
          state.page = 1;
          state.hasMore = true;
          state.isLoading = false;
        }),
    })),
    { name: "ChatStore" },
  ),
);
