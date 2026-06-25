import React, { Component } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Chat from './Chat.jsx';

// Simple error boundary to prevent full app crash on Chat errors
class ChatErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('An error occurred in the <Chat> component.', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: '430px', margin: '0 auto', padding: 20 }}>
          <div style={{ background: '#FFE6E6', color: '#A85751', padding: 12, borderRadius: 8 }}>
            Something went wrong in Chat.
          </div>
          {this.props.fallback}
        </div>
      );
    }
    return this.props.children;
  }
}

const ChatRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const state = location.state || {};
  const chatDataFromLocation = state.chat || state.chatSession || null;
  const chatData = chatDataFromLocation || {
    id: id ? Number(id) : undefined,
    name: (chatDataFromLocation && chatDataFromLocation.name) || 'Chat',
    isNewMatch: false,
  };

  const fromReport = Boolean(location.state?.fromReport);

  const handleBack = () => {
    // Always navigate to the main chat/inbox page for a consistent experience
    navigate('/inbox', { replace: true });
  };

  return (
    <ChatErrorBoundary
      fallback={
        <div style={{ marginTop: 12 }}>
          <button
            onClick={handleBack}
            style={{ padding: '10px 16px', borderRadius: 8, background: '#A85751', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            Go Back
          </button>
        </div>
      }
    >
      <Chat chatData={chatData} onBack={handleBack} />
    </ChatErrorBoundary>
  );
};

export default ChatRoute;