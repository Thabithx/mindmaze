import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const PWA_INSTALLED_KEY = 'mindmaze_pwa_installed';
const PWA_CARD_DISMISSED_KEY = 'mindmaze_pwa_card_dismissed';
const IOS_DISMISS_KEY = 'mindmaze_pwa_ios_dismissed_at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isCardDismissed, setIsCardDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isIOSDismissed, setIsIOSDismissed] = useState(false);

  useEffect(() => {
    // Check if previously marked as installed in localStorage
    let storedInstalled = false;
    try {
      storedInstalled = localStorage.getItem(PWA_INSTALLED_KEY) === 'true';
    } catch {
      // Ignore localStorage errors
    }

    // Detect standalone display mode (running as installed PWA)
    const isStandalone =
      storedInstalled ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);

    // Check if user dismissed the dashboard promo card
    try {
      const cardDismissed = localStorage.getItem(PWA_CARD_DISMISSED_KEY) === 'true';
      setIsCardDismissed(cardDismissed);
    } catch {
      // Ignore localStorage errors
    }

    // Detect iOS and iPadOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    const isSafariBrowser =
      isIOSDevice &&
      /safari/.test(userAgent) &&
      !/crios|fxios|optios|edgios|chrome/.test(userAgent);
    setIsIOSSafari(isSafariBrowser);

    // Check if user previously dismissed the iOS install banner
    try {
      const storedDismissedTime = localStorage.getItem(IOS_DISMISS_KEY);
      if (storedDismissedTime) {
        const timeElapsed = Date.now() - parseInt(storedDismissedTime, 10);
        if (timeElapsed < DISMISS_DURATION_MS) {
          setIsIOSDismissed(true);
        } else {
          localStorage.removeItem(IOS_DISMISS_KEY);
          setIsIOSDismissed(false);
        }
      }
    } catch {
      // localStorage may fail in strict privacy settings
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent standard browser mini-infobar and save prompt event for our custom button
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsCardDismissed(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
        localStorage.setItem(PWA_CARD_DISMISSED_KEY, 'true');
      } catch {
        // Ignore storage errors
      }
    };

    // Watch for dynamic display-mode changes (e.g. Chrome launches window into standalone)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsCardDismissed(true);
        try {
          localStorage.setItem(PWA_INSTALLED_KEY, 'true');
          localStorage.setItem(PWA_CARD_DISMISSED_KEY, 'true');
        } catch {
          // Ignore storage errors
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsCardDismissed(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem(PWA_INSTALLED_KEY, 'true');
          localStorage.setItem(PWA_CARD_DISMISSED_KEY, 'true');
        } catch {
          // Ignore storage errors
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Native PWA install prompt failed:', err);
      return false;
    }
  }, [deferredPrompt]);

  const markAsInstalled = useCallback(() => {
    setIsInstalled(true);
    setIsCardDismissed(true);
    setDeferredPrompt(null);
    try {
      localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      localStorage.setItem(PWA_CARD_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const dismissCard = useCallback(() => {
    setIsCardDismissed(true);
    try {
      localStorage.setItem(PWA_CARD_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const dismissIOSBanner = useCallback(() => {
    setIsIOSDismissed(true);
    try {
      localStorage.setItem(IOS_DISMISS_KEY, Date.now().toString());
    } catch {
      // Ignore storage errors
    }
  }, []);

  const resetIOSDismissal = useCallback(() => {
    setIsIOSDismissed(false);
    try {
      localStorage.removeItem(IOS_DISMISS_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isCardDismissed,
    isIOS,
    isIOSSafari,
    isIOSDismissed,
    install,
    markAsInstalled,
    dismissCard,
    dismissIOSBanner,
    resetIOSDismissal,
  };
}

