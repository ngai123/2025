import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Inbox from './Inbox';
import BottomNav from '../Main/BottomNav';

const PageWrapper = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
  max-width: 393px;
  margin: 0 auto;
  position: relative;
`;

const InboxWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const InboxPage = () => {
  const navigate = useNavigate();

  const handleSelectChat = (chatSession) => {
    navigate(`/chat/${chatSession.id}`, { state: { chatSession } });
  };

  const handleNavChange = (newActive) => {
    if (newActive === 'discover') {
      navigate('/discover');
    } else if (newActive === 'chats') {
      navigate('/inbox');
    } else if (newActive === 'settings') {
      navigate('/settings');
    }
  };

  return (
    <PageWrapper>
      <InboxWrapper>
        <Inbox onSelectChat={handleSelectChat} />
      </InboxWrapper>
      <BottomNav
        active="chats"
        onChangeActive={handleNavChange}
      />
    </PageWrapper>
  );
};

export default InboxPage;
