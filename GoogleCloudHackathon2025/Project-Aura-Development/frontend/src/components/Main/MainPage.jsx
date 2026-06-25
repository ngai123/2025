import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// MainProfile removed; route to EditProfile
import Inbox from '../Chat/Inbox';
import MatchingPage from '../Discover/DatingAppScreen';
import Chat from '../Chat/Chat';
import styled from 'styled-components';
import BottomNav from './BottomNav.jsx';
import { FiHome, FiHeart, FiMessageCircle, FiUser, FiSettings } from 'react-icons/fi';
import { isIOSDevice } from '../../utils/deviceDetection';

const PageWrapper = styled.div`
  /* Match Welcome.jsx scaling */
  min-height: 100vh;
  min-height: 100dvh; /* dynamic mobile viewport */
  height: 100vh;
  height: 100dvh; /* iOS Fix: Set explicit height to contain children properly */
  background: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
  padding: 0 8px;
  max-width: 393px; /* iPhone 16 Pro width */
  margin: 0 auto;   /* center content */
  position: relative;
  overflow: hidden; /* iOS Fix: Prevent PageWrapper scroll, let children handle scrolling */
  /* Expose bottom nav height for child views to consume */
  --bottom-nav-height: 64px;
  /* iOS Fix: Add safe area padding for bottom home indicator */
  padding-bottom: ${props => props.$isIOS ? 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 20px))' : 'var(--bottom-nav-height)'};
`;

const ContentSpacer = styled.div`
  flex: 1;
`;

const ContentWrapper = styled.div`
  flex: 1;
  overflow: hidden; /* Fix: Delegate scrolling to children (prevents double scroll) */
  display: flex;
  flex-direction: column;
  min-height: 0; /* Fix: Allow flex item to shrink for proper scroll containment */
`;

/**
 * Determines the initial active tab based on the current pathname.
 * This function ensures the UI stays in sync if the user navigates directly to /inbox, /discover, or /discover/:id, etc.
 */
function getInitialActiveState(pathname) {
  // If path is "/discover" or "/discover/:id", return 'discover'
  if (pathname.startsWith('/discover')) {
    return 'discover';
  }
  // If path is "/chat" or "/chat/:id", return 'chats'
  if (pathname.startsWith('/chat')) {
    return 'chats';
  }
  // If path is "/inbox", return 'chats' (default)
  if (pathname === '/inbox') {
    return 'chats';
  }
  // Fallback
  return 'chats';
};

const MainPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const contentWrapperRef = useRef(null);

  // iOS Detection - run once on mount
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
  }, []);

  // 1. Initialize state based on the current URL path
  const [active, setActive] = useState(getInitialActiveState(location.pathname));

  // 2. Add an effect to keep the active state in sync if the URL changes
  //    without a full component remount (though internal navigation should update state directly)
  useEffect(() => {
    const newActive = getInitialActiveState(location.pathname);
    if (active !== newActive) {
      setActive(newActive);
    }
  }, [location.pathname, active]); // Re-run when the URL path changes or active state changes

  // iOS Fix: Reset scroll position to top when component mounts or active tab changes
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      if (contentWrapperRef.current) {
        contentWrapperRef.current.scrollTo({
          top: 0,
          behavior: 'auto' // Instant scroll, not smooth
        });
      }
    });
  }, [active]); // Reset scroll when switching tabs

  const handleSelectChat = (chatSession) => {
    navigate(`/chat/${chatSession.id}`, { state: { chatSession } });
  };

  /**
   * Handles navigation changes triggered by BottomNav or other UI.
   * - Updates local state
   * - Navigates to the appropriate URL path
   */
  const handleNavChange = (newActive) => {
    setActive(newActive);

    // Navigate based on the selected tab
    if (newActive === 'discover') {
      navigate('/discover');
    } else if (newActive === 'chats') {
      navigate('/inbox');
    } else if (newActive === 'settings') {
      navigate('/settings');
    }
    // Removed duplicate navigation logic
  };

  return (
    <PageWrapper $isIOS={isIOS}>
      <ContentWrapper ref={contentWrapperRef}>
        {active === 'discover' ? (
          <MatchingPage />
        ) : active === 'chats' ? (
          <Inbox onSelectChat={handleSelectChat} hideInternalNav />
        ) : (
          <ContentSpacer />
        )}
      </ContentWrapper>

      <BottomNav
        active={active}
        onChangeActive={handleNavChange}
      />
    </PageWrapper>
  );
};

export default MainPage;
