import { User, Classroom, HistoryItem, UserStats, UserRole, Notification, LearningGame } from '../types';

const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0 && response.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
};

export const dbService = {
  // Users
  async getUser(userId: string): Promise<User | null> {
    try {
      const response = await fetchWithRetry(`/api/users/${encodeURIComponent(userId)}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  async saveUser(user: User): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!response.ok) throw new Error('Failed to save user');
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  // Classrooms
  async getClassrooms(userId: string): Promise<Classroom[]> {
    try {
      const response = await fetchWithRetry(`/api/classrooms?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      return [];
    }
  },

  async getClassroomByCode(code: string): Promise<Classroom | null> {
    try {
      const response = await fetchWithRetry(`/api/classrooms?code=${encodeURIComponent(code)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching classroom by code:', error);
      return null;
    }
  },

  async saveClassroom(classroom: Classroom): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/classrooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classroom)
      });
      if (!response.ok) throw new Error('Failed to save classroom');
    } catch (error) {
      console.error('Error saving classroom:', error);
    }
  },

  async deleteClassroom(id: string): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/classrooms/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete classroom');
    } catch (error) {
      console.error('Error deleting classroom:', error);
    }
  },

  async syncClassrooms(classrooms: Classroom[]): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/classrooms/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classrooms)
      });
      if (!response.ok) throw new Error('Failed to sync classrooms');
    } catch (error) {
      console.error('Error syncing classrooms:', error);
    }
  },

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const response = await fetchWithRetry(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  async saveNotification(notification: Notification): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
      if (!response.ok) throw new Error('Failed to save notification');
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });
      if (!response.ok) throw new Error('Failed to mark notification read');
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to mark all notifications read');
    } catch (error) {
      console.error('Error marking all notifications read:', error);
    }
  },

  // History
  async getHistory(userId: string): Promise<HistoryItem[]> {
    try {
      const response = await fetchWithRetry(`/api/history?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  },

  async saveHistoryItem(userId: string, item: HistoryItem): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, item })
      });
      if (!response.ok) throw new Error('Failed to save history item');
    } catch (error) {
      console.error('Error saving history item:', error);
    }
  },

  async deleteHistoryItem(id: string): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/history/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete history item');
    } catch (error) {
      console.error('Error deleting history item:', error);
    }
  },

  async deleteAllHistory(userId: string): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/history/user/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete all history');
    } catch (error) {
      console.error('Error deleting all history:', error);
    }
  },

  // Stats
  async getStats(userId: string): Promise<UserStats[]> {
    try {
      const response = await fetchWithRetry(`/api/stats?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      return [];
    }
  },

  async saveStats(userId: string, stats: UserStats[]): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, stats })
      });
      if (!response.ok) throw new Error('Failed to save stats');
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  },

  // Games
  async getGames(userId: string): Promise<LearningGame[]> {
    try {
      const response = await fetchWithRetry(`/api/games?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching games:', error);
      return [];
    }
  },

  async saveGame(game: LearningGame): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(game)
      });
      if (!response.ok) throw new Error('Failed to save game');
    } catch (error) {
      console.error('Error saving game:', error);
    }
  },

  async leaveClassroom(classId: string, userId: string): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/classrooms/${classId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to leave classroom');
    } catch (error) {
      console.error('Error leaving classroom:', error);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      const response = await fetchWithRetry(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete user');
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }
};
