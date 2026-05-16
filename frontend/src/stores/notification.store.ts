import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Notification } from "../types";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  addNotifications: (notifications: Notification[]) => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  updateNotification: (
    notificationId: string,
    updates: Partial<Notification>,
  ) => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    immer((set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,

      setNotifications: (notifications) =>
        set((state) => {
          state.notifications = notifications;
          state.unreadCount = notifications.filter((n) => !n.isRead).length;
        }),

      addNotification: (notification) =>
        set((state) => {
          // Check if notification already exists to avoid duplicates
          const exists = state.notifications.some(
            (n) => n._id === notification._id,
          );
          if (!exists) {
            state.notifications.unshift(notification);
            if (!notification.isRead) state.unreadCount += 1;
          }
        }),

      addNotifications: (notifications) =>
        set((state) => {
          const newNotifications = notifications.filter(
            (n) =>
              !state.notifications.some((existing) => existing._id === n._id),
          );
          state.notifications.unshift(...newNotifications);
          state.unreadCount += newNotifications.filter((n) => !n.isRead).length;
        }),

      markRead: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find(
            (n) => n._id === notificationId,
          );
          if (notification && !notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date().toISOString();
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }),

      markAllRead: () =>
        set((state) => {
          state.notifications.forEach((n) => {
            if (!n.isRead) {
              n.isRead = true;
              n.readAt = new Date().toISOString();
            }
          });
          state.unreadCount = 0;
        }),

      removeNotification: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find(
            (n) => n._id === notificationId,
          );
          if (notification && !notification.isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications = state.notifications.filter(
            (n) => n._id !== notificationId,
          );
        }),

      clearAllNotifications: () =>
        set((state) => {
          state.notifications = [];
          state.unreadCount = 0;
        }),

      setUnreadCount: (count) =>
        set((state) => {
          state.unreadCount = count;
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      updateNotification: (notificationId, updates) =>
        set((state) => {
          const notification = state.notifications.find(
            (n) => n._id === notificationId,
          );
          if (notification) {
            const wasUnread = !notification.isRead;
            Object.assign(notification, updates);
            const isNowUnread = !notification.isRead;

            // Adjust unread count if read status changed
            if (wasUnread !== isNowUnread) {
              if (isNowUnread) {
                state.unreadCount += 1;
              } else {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
            }
          }
        }),

      getUnreadCount: () => {
        return get().unreadCount;
      },
    })),
    { name: "NotificationStore" },
  ),
);
