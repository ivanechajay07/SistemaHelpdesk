import { create } from 'zustand';
import api from '../lib/axios';

export interface AppNotification {
  type: 'TICKET_CREATED' | 'PASSWORD_CHANGED' | 'USER_PENDING' | 'TASK_ASSIGNED' | 'TASK_COMPLETED';
  title: string;
  description: string;
  date: string | null;
  refId: number | null;
}

interface NotificationsState {
  items: AppNotification[];
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  activatePendingUser: (id: number) => Promise<void>;
  rejectPendingUser: (id: number) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  loading: false,
  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<AppNotification[]>('/notifications');
      set({ items: data });
    } catch {
      set({ items: [] });
    } finally {
      set({ loading: false });
    }
  },
  activatePendingUser: async (id) => {
    await api.post(`/users/${id}/activate`);
    await get().fetchNotifications();
  },
  rejectPendingUser: async (id) => {
    await api.post(`/users/${id}/reject`);
    await get().fetchNotifications();
  },
}));
