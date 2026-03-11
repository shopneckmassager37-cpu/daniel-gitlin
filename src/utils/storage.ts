export const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('LocalStorage quota exceeded, attempting to free space...');
      
      // 1. Try to remove non-essential items
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('study_history_') || k.startsWith('user_notifications_') || k.startsWith('user_stats_'))) {
          localStorage.removeItem(k);
          i--; // Adjust index
        }
      }
      
      // 2. Try to set again
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e2) {
        console.warn('Still exceeded quota, clearing all...');
      }

      // 3. Clear everything
      localStorage.clear();
      
      // 4. Try one last time
      try {
        localStorage.setItem(key, value);
      } catch (e3) {
        console.error('Failed to set item even after clearing all:', e3);
      }
    } else {
      console.error('Error setting localStorage item:', e);
    }
  }
};

export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error('Error getting localStorage item:', e);
    return null;
  }
};

export const safeRemoveItem = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Error removing localStorage item:', e);
  }
};
