import { useState, useCallback, useEffect, useRef } from 'react';

const scheduledTimers = new Map();

export default function useNotifications() {
  const [permission, setPermission] = useState('default');
  const timersRef = useRef(scheduledTimers);

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }
    if (Notification.permission !== 'denied') {
      const p = await Notification.requestPermission();
      setPermission(p);
      return p === 'granted';
    }
    return false;
  }, []);

  const sendNotification = useCallback((title, options = {}) => {
    if (permission === 'granted' && 'Notification' in window) {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    }
  }, [permission]);

  const scheduleKickoffReminder = useCallback((matchId, teamName, kickoffDate) => {
    const key = `wc_notif_${matchId}`;
    try {
      if (localStorage.getItem(key) === '1') return false;
    } catch { /* ignore */ }

    const notifyTime = new Date(kickoffDate).getTime() - 30 * 60 * 1000;
    const delay = notifyTime - Date.now();

    if (delay > 0) {
      const timer = setTimeout(() => {
        sendNotification(`⚽ ${teamName} kicks off soon!`, {
          body: 'Match starts in 30 minutes. Get ready to cheer!',
        });
      }, delay);
      timersRef.current.set(matchId, timer);
      try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
      return true;
    }
    return false;
  }, [sendNotification]);

  const notifyCheer = useCallback((teamName) => {
    sendNotification(`🎉 You're cheering for ${teamName}!`, {
      body: "We'll remind you before kickoff.",
    });
  }, [sendNotification]);

  return { permission, requestPermission, sendNotification, scheduleKickoffReminder, notifyCheer };
}
