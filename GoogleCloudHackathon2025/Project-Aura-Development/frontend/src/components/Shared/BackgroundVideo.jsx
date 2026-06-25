import React, { useEffect, useRef, useState } from 'react';

// Get CDN URL from environment variables
const CDN_VIDEO_URL = import.meta.env.VITE_CDN_VIDEO_URL || '';

// Helper function to convert local video paths to CDN URLs
const toCDNUrl = (videoPath) => {
  if (!videoPath) return '';

  // If already a full URL (http/https), return as is
  if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    return videoPath;
  }

  // If it's a local path, convert to CDN URL
  if (videoPath.startsWith('/video/')) {
    const filename = videoPath.replace('/video/', '');
    return CDN_VIDEO_URL ? `${CDN_VIDEO_URL}/${filename}` : videoPath;
  }

  // Otherwise return as is (fallback)
  return videoPath;
};

// Shared full-screen background video for pages.
// Usage: place inside a relatively positioned container.
// Supports single `src` or a playlist via `sources` that loops through items.
// Now uses CDN URLs from jsDelivr for better performance and iOS Safari compatibility
export default function BackgroundVideo({
  src = '/video/background3.mp4',
  sources, // = ['/video/background.mp4',
  //       '/video/background3.mp4',
  //       '/video/background4.mp4'],
  startIndex = 0,
  style = {},
  className,
  zIndex = 0,
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true,
  playbackRate = 1,
  onIndexChange,
  objectPosition = 'center center', // Default to center, common values: 'left center', 'right center', '0% 50%', '100% 50%'
  poster, // Optional: fallback image URL for when video cannot play (e.g., codec incompatibility on iOS)
}) {
  // Convert sources to CDN URLs if provided
  const cdnSources = sources ? sources.map(toCDNUrl) : null;
  const playlist = Array.isArray(cdnSources) && cdnSources.length > 0 ? cdnSources : null;

  const [currentIndex, setCurrentIndex] = useState(
    playlist ? Math.max(0, Math.min(startIndex, playlist.length - 1)) : 0
  );
  const videoRef = useRef(null);
  const [playAttempted, setPlayAttempted] = useState(false);

  // Use CDN URL for current source
  const currentSrc = playlist ? playlist[currentIndex] : toCDNUrl(src);

  // iOS Safari requires user interaction to play videos
  // This effect attempts to play video on any user interaction
  useEffect(() => {
    if (playAttempted) return;

    const attemptPlayOnInteraction = () => {
      if (!videoRef.current || playAttempted) return;

      const v = videoRef.current;
      if (v.paused && autoPlay) {
        // Force muted attribute again just to be safe
        v.muted = true;
        v.defaultMuted = true;

        const playPromise = v.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.then(() => {
            setPlayAttempted(true);
          }).catch(() => {
            // Failed to play
          });
        }
      }
    };

    // Listen for any user interaction on the document
    const events = ['touchstart', 'touchend', 'click', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, attemptPlayOnInteraction, { once: true, passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, attemptPlayOnInteraction);
      });
    };
  }, [autoPlay, playAttempted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // CRITICAL: iOS Safari often ignores the React 'muted' prop for autoplay
    // We must set it directly on the DOM element
    if (muted) {
      v.muted = true;
      v.defaultMuted = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
    }

    // Helper function to attempt playback
    const tryPlay = () => {
      if (!autoPlay) return;

      // Ensure muted is set before playing
      if (muted) {
        v.muted = true;
        v.defaultMuted = true;
      }

      const playPromise = v.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((error) => {
          // Autoplay was prevented - this is common on mobile
          console.log('Video autoplay prevented:', error.message);

          // Try playing again after a short delay (helps on some mobile browsers)
          setTimeout(() => {
            const retryPromise = v.play();
            if (retryPromise && typeof retryPromise.catch === 'function') {
              retryPromise.catch(() => {
                // Silent fail - user interaction may be needed
              });
            }
          }, 100);
        });
      }
    };

    try {
      v.playbackRate = playbackRate;

      // For mobile: ensure video is ready before playing
      if (v.src !== currentSrc) {
        v.src = currentSrc;
        v.load();

        // Wait for video to be ready on mobile
        if (autoPlay) {
          // Use canplaythrough for better mobile support
          const onCanPlay = () => {
            tryPlay();
            v.removeEventListener('canplaythrough', onCanPlay);
          };
          v.addEventListener('canplaythrough', onCanPlay);

          // Also try immediately in case video is already ready
          if (v.readyState >= 3) {
            tryPlay();
          }
        }
      } else if (autoPlay) {
        tryPlay();
      }
    } catch (error) {
      console.log('Video setup error:', error);
    }

    // Cleanup
    return () => {
      if (v) {
        v.removeEventListener('canplaythrough', tryPlay);
      }
    };
  }, [currentSrc, autoPlay, playbackRate, muted]);

  useEffect(() => {
    if (!playlist || !onIndexChange) return;
    onIndexChange(currentIndex);
  }, [currentIndex, playlist, onIndexChange]);

  const handleEnded = () => {
    if (!playlist) {
      // Fall back to built-in loop for single source
      if (loop && videoRef.current) {
        videoRef.current.currentTime = 0;
        const p = videoRef.current.play();
        if (p && typeof p.catch === 'function') p.catch(() => { });
      }
      return;
    }
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIndex);
  };

  const handleError = () => {
    if (!playlist) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIndex);
  };

  return (
    <video
      key={currentSrc} // Force re-render on source change to ensure clean state
      ref={videoRef}
      autoPlay={autoPlay}
      muted={muted}
      loop={playlist ? false : loop}
      playsInline={playsInline}
      poster={poster}
      preload="metadata"
      aria-hidden="true"
      className={className}
      onEnded={handleEnded}
      onError={handleError}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: style?.objectPosition ?? objectPosition,
        pointerEvents: 'none',
        ...style,
        zIndex,
      }}
    >
      <source src={currentSrc} type="video/mp4" />
    </video>
  );
}