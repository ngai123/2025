import React from 'react';
import styled from 'styled-components';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiHeart, FiMessageCircle, FiUser, FiSettings } from 'react-icons/fi';

const BottomNavContainer = styled.nav`
  position: fixed;
  bottom: 24px;
  left: 12px;
  right: 12px;
  background: #f9f4e2;
  backdrop-filter: blur(10px);
  border-radius: 36px;
  padding: 10px 10px 10px 10px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 100;
  max-width: 426px;
  margin: 0 auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.08);

  @media (max-height: 700px) {

    left: 50%;
    right: auto;
    transform: translateX(-50%);
    border-radius: 36px;
    padding: 10px 12px;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
    max-width: 95%;
    width: 100%;
    bottom: 8px;
  }

  @supports (-webkit-touch-callout: none) {
    /* iOS Safari specific */
    @media (max-height: 700px) {
      position: fixed;
      bottom: 8px;
      padding-bottom: calc(8px + env(safe-area-inset-bottom));
    }
  }
`;

const NavItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, #FFBEBE, #FF7F7F)' : 'transparent'};
  border: none;
  cursor: pointer;
  padding: 12px 8px;
  border-radius: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  width: 70px;
  flex-shrink: 0;

  &:hover {
    background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, #FFBEBE, #FF7F7F)' : 'rgba(255, 127, 127, 0.1)'};
    transform: translateY(-2px);
  }

  &:active {
    transform: ${({ $active }) => ($active ? 'translateY(-2px) scale(0.95)' : 'scale(0.95)')};
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 20%;
  background: transparent;
  transition: all 0.3s ease;

  svg {
    color: ${({ $active }) => ($active ? '#FFFFFF' : '#6B7280')};
    transition: all 0.3s ease;
  }

  ${NavItem}:hover & svg {
    color: ${({ $active }) => ($active ? '#FFFFFF' : '#FF7F7F')};
  }
`;

const Label = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Josefin Sans', sans-serif;
  color: ${({ $active }) => ($active ? '#FFFFFF' : '#6B7280')};
  transition: all 0.3s ease;

  ${NavItem}:hover & {
    color: ${({ $active }) => ($active ? '#FFFFFF' : '#FF7F7F')};
  }
`;

const resolveActiveFromPath = (pathname) => {
  if (pathname.startsWith('/discover')) return 'discover';
  if (pathname.startsWith('/likes') || pathname.startsWith('/my-likes')) return 'likes';
  if (pathname.startsWith('/edit-profile')) return 'profile';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/report')) return 'settings';
  if (pathname.startsWith('/inbox')) return 'chats';
  return '';
};

const BottomNav = ({ active, onChangeActive }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const current = active || resolveActiveFromPath(location.pathname);

  const goMain = (tab) => {
    if (onChangeActive) {
      onChangeActive(tab);
    } else {
      // Navigate to the appropriate route based on the tab
      if (tab === 'discover') {
        navigate('/discover');
      } else if (tab === 'chats') {
        navigate('/inbox');
      } else if (tab === 'settings') {
        navigate('/settings');
      } else if (tab === 'likes') {
        navigate('/likes-me');
      } else if (tab === 'profile') {
        navigate('/edit-profile');
      }
    }
  };

  return (
    <BottomNavContainer>
      <NavItem
        $active={current === 'discover'}
        onClick={() => goMain('discover')}
        aria-label="Discover"
      >
        <IconWrapper $active={current === 'discover'}>
          <FiHome size={22} />
        </IconWrapper>
        <Label $active={current === 'discover'}>Discover</Label>
      </NavItem>

      <NavItem
        $active={current === 'likes'}
        onClick={() => navigate('/likes-me')}
        aria-label="Likes"
      >
        <IconWrapper $active={current === 'likes'}>
          <FiHeart size={22} />
        </IconWrapper>
        <Label $active={current === 'likes'}>Likes</Label>
      </NavItem>

      <NavItem
        $active={current === 'chats'}
        onClick={() => goMain('chats')}
        aria-label="Chats"
      >
        <IconWrapper $active={current === 'chats'}>
          <FiMessageCircle size={22} />
        </IconWrapper>
        <Label $active={current === 'chats'}>Chats</Label>
      </NavItem>

      <NavItem
        $active={current === 'profile'}
        onClick={() => navigate('/edit-profile')}
        aria-label="Profile"
      >
        <IconWrapper $active={current === 'profile'}>
          <FiUser size={22} />
        </IconWrapper>
        <Label $active={current === 'profile'}>Profile</Label>
      </NavItem>

      <NavItem
        $active={current === 'settings'}
        onClick={() => navigate('/settings')}
        aria-label="Settings"
      >
        <IconWrapper $active={current === 'settings'}>
          <FiSettings size={22} />
        </IconWrapper>
        <Label $active={current === 'settings'}>Settings</Label>
      </NavItem>
    </BottomNavContainer>
  );
};

export default BottomNav;
