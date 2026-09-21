import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface AdaptiveValueConfig<T> {
  mobile: T;
  tablet?: T;
  desktop: T;
}

export interface AdaptiveLayoutContextType {
  // Device classifications
  deviceType: DeviceType;
  breakpoint: Breakpoint;
  isMobile: boolean; // < 768px (smartphones)
  isTablet: boolean; // 768px - 1023px (iPads / tablets)
  isDesktop: boolean; // >= 1024px (laptops & desktops)
  isTouchDevice: boolean;
  isLandscape: boolean;
  isPortrait: boolean;

  // Viewport dimensions
  windowWidth: number;
  windowHeight: number;

  // Future-proof helper for any future feature or component
  adaptiveValue: <T>(config: AdaptiveValueConfig<T>) => T;

  // Global mobile navigation states
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isMoreSheetOpen: boolean;
  setIsMoreSheetOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

const AdaptiveLayoutContext = createContext<AdaptiveLayoutContextType | null>(null);

interface AdaptiveLayoutProviderProps {
  children: ReactNode;
}

export const AdaptiveLayoutProvider: React.FC<AdaptiveLayoutProviderProps> = ({ children }) => {
  // Safe initial window size (server/client compatible)
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect touch capability
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    setIsTouchDevice(hasTouch);

    // Optimized resize handler
    let timeoutId: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 50);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Compute breakpoints & device classifications
  const width = windowSize.width;
  const height = windowSize.height;

  const breakpoint: Breakpoint = useMemo(() => {
    if (width < 640) return 'xs';
    if (width < 768) return 'sm';
    if (width < 1024) return 'md';
    if (width < 1280) return 'lg';
    if (width < 1536) return 'xl';
    return '2xl';
  }, [width]);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const deviceType: DeviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
  const isLandscape = width > height;
  const isPortrait = !isLandscape;

  // Universal future-proof helper: adaptively returns values based on viewport
  const adaptiveValue = useMemo(() => {
    return <T,>(config: AdaptiveValueConfig<T>): T => {
      if (isMobile) return config.mobile;
      if (isTablet) return config.tablet !== undefined ? config.tablet : config.desktop;
      return config.desktop;
    };
  }, [isMobile, isTablet]);

  const contextValue: AdaptiveLayoutContextType = useMemo(
    () => ({
      deviceType,
      breakpoint,
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      isLandscape,
      isPortrait,
      windowWidth: width,
      windowHeight: height,
      adaptiveValue,
      isMobileDrawerOpen,
      setIsMobileDrawerOpen,
      isMoreSheetOpen,
      setIsMoreSheetOpen,
    }),
    [
      deviceType,
      breakpoint,
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      isLandscape,
      isPortrait,
      width,
      height,
      adaptiveValue,
      isMobileDrawerOpen,
      isMoreSheetOpen,
    ]
  );

  return (
    <AdaptiveLayoutContext.Provider value={contextValue}>
      {children}
    </AdaptiveLayoutContext.Provider>
  );
};

/**
 * Custom hook to consume adaptive responsive data in any component.
 * Allows current & future components to seamlessly adapt between smartphone and computer.
 */
export const useAdaptive = (): AdaptiveLayoutContextType => {
  const context = useContext(AdaptiveLayoutContext);
  if (!context) {
    throw new Error('useAdaptive must be used within an AdaptiveLayoutProvider');
  }
  return context;
};
