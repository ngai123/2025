/**
 * Device Detection Utilities
 * Provides functions to detect iOS devices for platform-specific styling
 */

/**
 * Detects if the current device is running iOS (iPhone, iPad, iPod)
 * Works for both Safari and other browsers on iOS
 *
 * @returns {boolean} True if device is iOS, false otherwise
 */
export const isIOSDevice = () => {
  // Check if window is available (for SSR compatibility)
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Method 1: Check userAgent for iOS devices
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);

  // Method 2: Check for iOS-specific properties (for iOS 13+ on iPad)
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  // Method 3: Check for standalone mode (PWA on iOS)
  const isStandalone = window.navigator.standalone === true;

  return isIOS || isIPadOS || isStandalone;
};

/**
 * Detects if the app is running as a PWA (Progressive Web App) on iOS
 *
 * @returns {boolean} True if running as iOS PWA, false otherwise
 */
export const isIOSPWA = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.navigator.standalone === true && isIOSDevice();
};

/**
 * Gets the iOS version number
 *
 * @returns {number|null} iOS version or null if not iOS
 */
export const getIOSVersion = () => {
  if (!isIOSDevice()) {
    return null;
  }

  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
};

/**
 * Checks if device is iPhone (not iPad)
 *
 * @returns {boolean} True if iPhone, false otherwise
 */
export const isIPhone = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /iPhone|iPod/.test(userAgent) && !window.MSStream;
};

/**
 * Applies iOS-specific styles to an element
 * Returns the style object with iOS-specific adjustments if on iOS
 *
 * @param {Object} baseStyles - Base styles to apply
 * @param {Object} iosStyles - iOS-specific style overrides
 * @returns {Object} Combined styles
 */
export const withIOSStyles = (baseStyles, iosStyles) => {
  if (isIOSDevice()) {
    return { ...baseStyles, ...iosStyles };
  }
  return baseStyles;
};

export default {
  isIOSDevice,
  isIOSPWA,
  getIOSVersion,
  isIPhone,
  withIOSStyles
};
