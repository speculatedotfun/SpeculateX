/**
 * Simple utility for haptic feedback on mobile devices
 */
export const hapticFeedback = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    switch (intensity) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'heavy':
        navigator.vibrate(50);
        break;
    }
  }
};

/**
 * Hook to use haptic feedback on click
 */
export const useHaptics = () => {
  return {
    trigger: hapticFeedback
  };
};

