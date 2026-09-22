import { useState, useEffect, useCallback, useRef } from 'react';

type NotificationPermissionState = NotificationPermission | 'unsupported';

interface UseNotificationsReturn {
  permission: NotificationPermissionState;
  isSupported: boolean;
  swRegistered: boolean;
  requestPermission: () => Promise<NotificationPermissionState>;
  sendNotification: (title: string, body: string, tag?: string) => void;
  scheduleNotification: (title: string, body: string, delayMs: number, tag?: string) => void;
}

/**
 * Registers the Mind Maze service worker and exposes OS-level notification
 * helpers.  Works even when the tab is minimised or the screen is locked
 * (the SW receives the SHOW_NOTIFICATION message and triggers the OS popup).
 */
export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [swRegistered, setSwRegistered] = useState(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  // Sync permission state with the real browser state
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, [isSupported]);

  // Register the service worker once on mount
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        swRef.current = reg;
        setSwRegistered(true);
      })
      .catch((err) => {
        console.warn('[useNotifications] SW registration failed:', err);
      });
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (typeof window === 'undefined') return 'unsupported';
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return 'unsupported';
    }

    try {
      // Support both modern Promise-based and older callback-based Notification.requestPermission()
      let status: NotificationPermission;
      const maybePromise = Notification.requestPermission((res) => {
        if (res) {
          setPermission(res);
        }
      });

      if (maybePromise && typeof maybePromise.then === 'function') {
        status = await maybePromise;
      } else {
        status = Notification.permission;
      }

      setPermission(status);
      return status;
    } catch (err) {
      console.warn('[useNotifications] requestPermission error:', err);
      const fallback = Notification.permission || 'denied';
      setPermission(fallback);
      return fallback;
    }
  }, []);

  /**
   * Show an OS notification immediately.  Routes through the SW when available
   * so the OS can show it even if the page is in the background.
   */
  const sendNotification = useCallback(
    (title: string, body: string, tag = 'mind-maze') => {
      if (!isSupported || Notification.permission !== 'granted') return;

      const sw = swRef.current;
      if (sw && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
          icon: '/icon-192.png',
          tag,
        });
      } else {
        // Fallback: direct Notification (works only when tab is focused)
        try {
          new Notification(title, { body, icon: '/icon-192.png', tag });
        } catch {}
      }
    },
    [isSupported]
  );

  /**
   * Schedule a notification after `delayMs` milliseconds.
   * The SW handles the setTimeout internally so it survives tab minimisation.
   */
  const scheduleNotification = useCallback(
    (title: string, body: string, delayMs: number, tag = 'scheduled') => {
      if (!isSupported || Notification.permission !== 'granted') return;

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SCHEDULE_NOTIFICATION',
          title,
          body,
          icon: '/icon-192.png',
          tag,
          delay: delayMs,
        });
      } else {
        // Fallback: in-page setTimeout (only works while tab is open)
        setTimeout(() => {
          try {
            new Notification(title, { body, icon: '/icon-192.png', tag });
          } catch {}
        }, delayMs);
      }
    },
    [isSupported]
  );

  return { permission, isSupported, swRegistered, requestPermission, sendNotification, scheduleNotification };
}
