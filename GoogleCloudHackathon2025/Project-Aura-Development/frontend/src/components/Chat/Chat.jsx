import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, MoreVertical, User, Heart, Flag, XCircle,
  Sparkles, Send, Image, Camera, X, CheckCircle, Check, CheckCheck,
  Trash2, Copy, Edit, CornerDownRight, Smile
} from 'lucide-react';
import chatService from '../../api/services/chatService';
import HeartLoader from '../common/HeartLoader.jsx';
import { useSocket } from '../../contexts/SocketContext';
import AIChat from './AIChat.jsx';

// ============= CONSTANTS =============
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];
const MESSAGES_CACHE_KEY = 'chat_messages_cache';
const INBOX_CACHE_KEY = 'inbox_chatListCache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCurrentUserId = () => {
  const userId = localStorage.getItem('current_user_id') || localStorage.getItem('userId');
  if (!userId) return null;
  return parseInt(userId, 10);
};

// ============= CACHE HELPERS (SWR Pattern) =============
const getCachedMessages = (sessionId) => {
  try {
    const cache = localStorage.getItem(`${MESSAGES_CACHE_KEY}_${sessionId}`);
    if (cache) {
      const { data, timestamp, userId } = JSON.parse(cache);

      // Validate cache belongs to current user
      const currentUserId = getCurrentUserId();
      if (userId && currentUserId && String(userId) !== String(currentUserId)) {
        localStorage.removeItem(`${MESSAGES_CACHE_KEY}_${sessionId}`);
        return null;
      }

      const isStale = Date.now() - timestamp > CACHE_TTL;
      return { data, isStale };
    }
    return null;
  } catch {
    return null;
  }
};

const setCachedMessages = (sessionId, data) => {
  try {
    const userId = getCurrentUserId();
    localStorage.setItem(`${MESSAGES_CACHE_KEY}_${sessionId}`, JSON.stringify({
      data,
      timestamp: Date.now(),
      userId // Store user ID with cache to validate on retrieval
    }));
  } catch {
    // Ignore cache errors
  }
};

// Invalidate Inbox cache so it fetches fresh data with updated message preview
const invalidateInboxCache = () => {
  try {
    localStorage.removeItem(INBOX_CACHE_KEY);
  } catch {
    // Ignore cache errors
  }
};

// ============= SKELETON COMPONENTS =============
const SkeletonPulse = ({ style }) => (
  <div
    style={{
      background: 'linear-gradient(90deg, #E8DCC8 25%, #F0E6D6 50%, #E8DCC8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: '20px',
      ...style
    }}
  />
);

const MessageSkeleton = () => (
  <div style={{ padding: '20px 16px' }}>
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end',
          marginBottom: '16px'
        }}
      >
        <SkeletonPulse
          style={{
            width: `${50 + Math.random() * 35}%`,
            height: '48px',
            borderRadius: '20px'
          }}
        />
      </div>
    ))}
  </div>
);

// ============= TYPING INDICATOR COMPONENT =============
const TypingIndicator = ({ userName }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    marginBottom: '8px'
  }}>
    <div style={{
      background: 'rgba(0, 0, 0, 0.05)',
      borderRadius: '20px',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <span style={{ fontSize: '13px', color: '#666', marginRight: '4px' }}>
        {userName} is typing
      </span>
      <div style={{ display: 'flex', gap: '3px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#A85751',
              animation: `typingBounce 1.4s infinite ease-in-out`,
              animationDelay: `${i * 0.16}s`
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ============= MESSAGE STATUS COMPONENT =============
const MessageStatus = ({ status }) => {
  const iconStyle = { width: '14px', height: '14px', marginLeft: '4px' };
  switch (status) {
    case 'sending':
      return <div style={{ ...iconStyle, opacity: 0.5 }}>○</div>;
    case 'sent':
      return <Check size={14} style={{ ...iconStyle, color: 'rgba(255,255,255,0.7)' }} />;
    case 'delivered':
      return <CheckCheck size={14} style={{ ...iconStyle, color: 'rgba(255,255,255,0.7)' }} />;
    case 'read':
      return <CheckCheck size={14} style={{ ...iconStyle, color: '#00D1FF' }} />;
    default:
      return null;
  }
};

// getCurrentUserId is defined at the top of the file with cache helpers

const VerifiedBadge = ({ size = 16 }) => (
  <CheckCircle
    style={{
      color: 'white',
      fill: '#00D1FF',
      width: `${size}px`,
      height: `${size}px`,
      marginLeft: size === 18 ? '6px' : '4px',
      flexShrink: 0,
    }}
  />
);

const Chat = ({ chatData, onBack }) => {
  const navigate = useNavigate();

  // Get current user ID from localStorage (dynamic, not hardcoded)
  const CURRENT_USER_ID = getCurrentUserId();

  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversationData, setConversationData] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const markedRef = useRef(new Set());

  // ✨ Image upload states
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ✨ Message actions states
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);

  // ✨ Edit & Reply states
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  // ✨ AI-powered suggestions states
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  // ✨ Unmatch states
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [isUnmatched, setIsUnmatched] = useState(false);

  // ✨ NEW: Typing indicator states
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // ✨ NEW: Reactions states
  const [showReactionPicker, setShowReactionPicker] = useState(null); // message ID or null

  // Loader return moved below hooks to respect hooks order

  // ✨ Report & Block states
  const [showReportBlockModal, setShowReportBlockModal] = useState(false);

  // Fixed AI Suggestions Function
  // ✨ AI-Powered Suggestions using Gemini
  const generateAISuggestions = async () => {
    setLoadingAI(true);

    try {
      // Call the backend AI endpoint
      const response = await chatService.getAISuggestions(
        chatData.id,      // session_id
        CURRENT_USER_ID,  // user_id
        3                 // limit (get 3 suggestions)
      );

      // Transform API response to match UI format
      const suggestions = response.suggestions.map(text => ({ text }));
      setAiSuggestions(suggestions);

    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      // Fallback to basic suggestions if API fails
      setAiSuggestions([
        { text: "That's interesting!" },
        { text: "Tell me more!" },
        { text: "How do you feel about that?" }
      ]);
    } finally {
      setLoadingAI(false);
    }
  };

  const aiSuggestionsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const cameraInputRef = useRef(null);
  const inputRef = useRef(null);

  // WebSocket connection
  const socket = useSocket();

  useEffect(() => {
    const init = async () => {
      const candidate = (chatData && (chatData.sessionId || chatData.id)) || null;
      if (candidate) {
        setSessionId(candidate);
        return;
      }
      const otherUserId = (conversationData && conversationData.userId) || (chatData && chatData.userId) || null;
      if (CURRENT_USER_ID && otherUserId) {
        const res = await chatService.checkMatchSession(CURRENT_USER_ID, otherUserId)
          .then(r => r)
          .catch(() => null);
        if (res && res.match_found && res.session_id) {
          setSessionId(res.session_id);
        }
      }
    };
    init();
  }, [chatData, CURRENT_USER_ID, conversationData]);

  // Fetch conversation on mount
  useEffect(() => {
    if (sessionId || (chatData?.sessionId || chatData?.id)) {
      fetchConversation();
    }
  }, [sessionId, chatData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate AI suggestions when toggled or messages change
  useEffect(() => {
    if (showAISuggestions) {
      generateAISuggestions();
    }
  }, [showAISuggestions, messages]);

  // Scroll AI suggestions into view
  useEffect(() => {
    if (showAISuggestions && aiSuggestionsRef.current) {
      aiSuggestionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showAISuggestions]);

  // Focus input when editing
  useEffect(() => {
    if (editingMessageId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingMessageId]);

  // WebSocket: Join chat session and listen for real-time updates
  useEffect(() => {
    if (!socket || !(sessionId || (chatData && (chatData.sessionId || chatData.id)))) return;

    const sid = sessionId || (chatData && (chatData.sessionId || chatData.id));

    console.log('🔌 Joining chat session:', sid);

    // Create unique handler functions to avoid duplicate listeners
    const handleMessageCreated = (messageData) => {
      console.log('📨 Message received in chat', {
        sessionId: messageData.session_id || sid,
        messageId: messageData.id,
        fromUserId: messageData.sender_id,
        content: messageData.content,
      });

      // Skip messages sent by current user - already shown via optimistic update
      if (messageData.sender_id === CURRENT_USER_ID) {
        console.log('📨 Skipping own message (already shown via optimistic update)');
        return;
      }

      const formatted = formatIncomingMessage(messageData);
      setMessages(prev => {
        // Prevent duplicates by checking message ID
        if (prev.some(m => m.id === formatted.id)) return prev;
        return [...prev, formatted];
      });
      scrollToBottom();
    };

    const handleMessageDeleted = (data) => {
      console.log('🗑️ Message deleted:', data);
      setMessages(prev => prev.map(msg =>
        msg.id === data.message_id
          ? {
            ...msg,
            deleted: true,
            deleted_by_me: data.deleted_by_user_id === CURRENT_USER_ID,
            deleted_at: new Date().toISOString(),
            deleted_by_user_id: data.deleted_by_user_id
          }
          : msg
      ));
    };

    const handleMessageEdited = (data) => {
      console.log('✏️ Message edited:', data);
      setMessages(prev => prev.map(msg =>
        msg.id === data.message_id
          ? {
            ...msg,
            text: data.content,
            edited: true,
            edited_at: new Date().toISOString()
          }
          : msg
      ));
    };

    // Join chat room
    socket.emit('join_chat', {
      user_id: CURRENT_USER_ID,
      session_id: sid
    });

    // Register event listeners
    socket.on('message_created', handleMessageCreated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_edited', handleMessageEdited);

    // ✨ NEW: Typing indicator handler
    const handleTypingEvent = (data) => {
      if (data.session_id === sid && data.user_id !== CURRENT_USER_ID) {
        setIsPartnerTyping(data.is_typing);
      }
    };
    socket.on('user_typing', handleTypingEvent);

    // ✨ NEW: Reaction update handler
    const handleReactionUpdate = (data) => {
      if (data.session_id === sid) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.message_id) {
            const reactions = msg.reactions || [];
            if (data.action === 'add') {
              const existingReaction = reactions.find(r => r.emoji === data.emoji);
              if (existingReaction) {
                return {
                  ...msg,
                  reactions: reactions.map(r =>
                    r.emoji === data.emoji
                      ? { ...r, count: r.count + 1, users: [...r.users, data.user_id] }
                      : r
                  )
                };
              } else {
                return {
                  ...msg,
                  reactions: [...reactions, { emoji: data.emoji, count: 1, users: [data.user_id] }]
                };
              }
            } else if (data.action === 'remove') {
              return {
                ...msg,
                reactions: reactions.map(r =>
                  r.emoji === data.emoji
                    ? { ...r, count: r.count - 1, users: r.users.filter(u => u !== data.user_id) }
                    : r
                ).filter(r => r.count > 0)
              };
            }
          }
          return msg;
        }));
      }
    };
    socket.on('reaction_update', handleReactionUpdate);

    // ✨ NEW: Messages read handler
    const handleMessagesRead = (data) => {
      if (data.session_id === sid && data.read_by_user_id !== CURRENT_USER_ID) {
        setMessages(prev => prev.map(msg =>
          data.message_ids.includes(msg.id) && msg.type === 'sent'
            ? { ...msg, status: 'read' }
            : msg
        ));
      }
    };
    socket.on('messages_read', handleMessagesRead);

    // Cleanup: Remove listeners and leave chat when effect re-runs or component unmounts
    return () => {
      console.log('👋 Leaving chat session:', sid);
      socket.emit('leave_chat', { session_id: sid });
      socket.off('message_created', handleMessageCreated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_edited', handleMessageEdited);
      socket.off('user_typing', handleTypingEvent);
      socket.off('reaction_update', handleReactionUpdate);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, sessionId, chatData, CURRENT_USER_ID]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✨ NEW: Handle typing indicator
  const handleTypingChange = useCallback((text) => {
    setMessage(text);

    if (!socket || !sessionId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start if not already typing
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socket.emit('typing_start', {
        user_id: CURRENT_USER_ID,
        session_id: sessionId
      });
    }

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket.emit('typing_stop', {
          user_id: CURRENT_USER_ID,
          session_id: sessionId
        });
      }
    }, 2000);

    // If text is empty, stop typing immediately
    if (text.length === 0 && isTyping) {
      setIsTyping(false);
      socket.emit('typing_stop', {
        user_id: CURRENT_USER_ID,
        session_id: sessionId
      });
    }
  }, [socket, sessionId, isTyping, CURRENT_USER_ID]);

  // ✨ NEW: Handle reaction
  const handleReaction = async (messageId, emoji) => {
    if (!CURRENT_USER_ID || !sessionId) return;

    try {
      // Check if user already reacted with this emoji
      const msg = messages.find(m => m.id === messageId);
      const existingReaction = msg?.reactions?.find(r =>
        r.emoji === emoji && r.users.includes(CURRENT_USER_ID)
      );

      if (existingReaction) {
        // Remove reaction
        await chatService.removeReaction(messageId, CURRENT_USER_ID, emoji);
        socket?.emit('message_reaction', {
          message_id: messageId,
          session_id: sessionId,
          user_id: CURRENT_USER_ID,
          emoji,
          action: 'remove'
        });
      } else {
        // Add reaction
        await chatService.addReaction(messageId, CURRENT_USER_ID, emoji);
        socket?.emit('message_reaction', {
          message_id: messageId,
          session_id: sessionId,
          user_id: CURRENT_USER_ID,
          emoji,
          action: 'add'
        });
      }

      setShowReactionPicker(null);
    } catch (error) {
      console.error('Failed to handle reaction:', error);
    }
  };

  // Helper function to format message time from ISO timestamp
  const formatMessageTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  };

  // Helper function to format incoming WebSocket messages
  const formatIncomingMessage = (messageData) => {
    return {
      id: messageData.id,
      text: messageData.content || messageData.text || "",
      time: formatMessageTime(messageData.timestamp),
      type: messageData.sender_id === CURRENT_USER_ID ? "sent" : "received",
      sender_id: messageData.sender_id,
      timestamp: messageData.timestamp,
      attachments: messageData.attachments || [],
      deleted: messageData.deleted || false,
      deleted_at: messageData.deleted_at || null,
      deleted_by_user_id: messageData.deleted_by_user_id || null,
      deleted_by_me: messageData.deleted_by_me || false,
      edited: messageData.edited || false,
      edited_at: messageData.edited_at || null,
      replyTo: messageData.replyTo || null
    };
  };


  const fetchConversation = async (forceRefresh = false) => {
    const sid = sessionId || chatData.sessionId || chatData.id;
    if (!sid) return;

    // ✨ SWR Pattern: Check cache first
    if (!forceRefresh) {
      const cached = getCachedMessages(sid);
      if (cached?.data) {
        // Show cached data immediately
        setConversationData(cached.data.chatData);
        setMessages(cached.data.messages);
        if (cached.data.chatData && typeof cached.data.chatData.is_unmatched !== 'undefined') {
          setIsUnmatched(cached.data.chatData.is_unmatched);
        }
        setLoading(false);

        // If cache is fresh, skip network request
        if (!cached.isStale) {
          return;
        }
        // If stale, continue to revalidate in background (don't show loading)
      } else {
        setLoading(true);
      }
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const data = await chatService.getConversation(sid, CURRENT_USER_ID);
      setConversationData(data.chatData);
      setMessages(data.messages);

      // ✨ Cache the fresh data
      setCachedMessages(sid, data);

      if (data.chatData && typeof data.chatData.is_unmatched !== 'undefined') {
        setIsUnmatched(data.chatData.is_unmatched);
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
      // Only show error if we don't have cached data
      if (!getCachedMessages(sid)?.data) {
        setError('Failed to load conversation. Please try again.');
      }
      setIsUnmatched(false);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    const sid = sessionId || chatData.sessionId || chatData.id;
    if (!sid || !CURRENT_USER_ID) return;
    if (markedRef.current.has(sid)) return;
    try {
      await chatService.markAsRead(sid, CURRENT_USER_ID);
      markedRef.current.add(sid);

      // ✨ NEW: Emit read event via WebSocket for real-time status update
      if (socket && messages.length > 0) {
        const unreadMessageIds = messages
          .filter(m => m.type === 'received' && m.status !== 'read')
          .map(m => m.id);

        if (unreadMessageIds.length > 0) {
          socket.emit('message_read', {
            message_ids: unreadMessageIds,
            session_id: sid,
            user_id: CURRENT_USER_ID
          });
        }
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    markAsRead();
  }, [messages]);

  // ✨ Handle camera/photo selection
  const handleCameraClick = () => {
    cameraInputRef.current.click();
  };

  // ✨ Handle file selection (iOS WebKit compatible)
  const handleFileSelect = (event) => {
    const file = event.target.files[0];

    // If no file selected (user cancelled), do nothing
    if (!file) {
      event.target.value = '';
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB. Please choose a smaller image.');
      event.target.value = '';
      return;
    }

    // iOS Safari may not set MIME type correctly for HEIC files
    // Check both MIME type and file extension
    const isImage = file.type.startsWith('image/') ||
                    /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);

    if (isImage) {
      console.log('📸 Image selected:', {
        name: file.name,
        type: file.type || 'unknown',
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      });

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.onerror = () => {
        console.error('Failed to read image file');
        alert('Failed to load image. Please try again.');
        setSelectedImage(null);
        setImagePreview(null);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select an image file (JPG, PNG, GIF, WebP, or HEIC)');
    }

    // Reset input to allow selecting the same file again
    event.target.value = '';
  };

  // ✨ Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // ✨ Send message with image
  const sendImageMessage = async () => {
    if (!selectedImage || uploadingImage) return;

    try {
      setUploadingImage(true);
      const sid = sessionId || chatData.sessionId || chatData.id;

      // 1. Create message first (with optional caption)
      const messageData = {
        chat_session_id: sid,
        sender_id: CURRENT_USER_ID,
        content: message.trim() || null,
        message_type: "IMAGE",
        reply_to_message_id: replyingTo?.id || null
      };

      const messageResponse = await chatService.sendMessage(messageData);

      // 2. Upload image as attachment
      const formData = new FormData();
      formData.append('file', selectedImage);

      const attachmentResponse = await chatService.uploadMessageAttachment(
        messageResponse.id,
        formData
      );

      // 3. Add message to UI with attachment
      const newMessage = {
        id: messageResponse.id,
        text: messageResponse.content || "",
        type: "sent",
        sender_id: messageResponse.sender_id,
        timestamp: messageResponse.timestamp,
        attachments: [{
          id: attachmentResponse.id,
          type: attachmentResponse.attachment_type,
          url: attachmentResponse.url,
          thumbnail_url: attachmentResponse.thumbnail_url
        }],
        replyTo: replyingTo
      };

      setMessages(prev => {
        const updatedMessages = [...prev, newMessage];

        // Update cache with the new message to persist on re-entry
        const currentCache = getCachedMessages(sid);
        if (currentCache?.data) {
          setCachedMessages(sid, {
            ...currentCache.data,
            messages: updatedMessages
          });
        }

        return updatedMessages;
      });

      // Invalidate Inbox cache so it shows updated message preview
      invalidateInboxCache();

      // Note: WebSocket broadcast is now handled by the backend automatically
      console.log('Image message sent successfully', { sessionId: sid, messageId: newMessage.id });

      // 4. Clear state
      setSelectedImage(null);
      setImagePreview(null);
      setMessage('');
      setShowAISuggestions(false);
      setReplyingTo(null);

    } catch (error) {
      console.error('Failed to send image:', error);
      alert('Failed to send image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSend = async () => {
    // ✨ Handle edit message
    if (editingMessageId) {
      await handleSaveEdit();
      return;
    }

    // If image is selected, send image message instead
    if (selectedImage) {
      await sendImageMessage();
      return;
    }

    if (!message.trim() || sendingMessage) return;

    const tempMessage = {
      id: Date.now(),
      text: message.trim(),
      type: "sent",
      sender_id: CURRENT_USER_ID,
      timestamp: new Date().toISOString(),
      attachments: [],
      replyTo: replyingTo
    };

    // Optimistically add message to UI
    setMessages(prev => [...prev, tempMessage]);
    const messageToSend = message.trim();
    setMessage('');
    setShowAISuggestions(false);
    setReplyingTo(null);

    try {
      setSendingMessage(true);
      const sid = sessionId || chatData.sessionId || chatData.id;

      console.log('Sending message', {
        sessionId: sid,
        senderId: CURRENT_USER_ID,
        content: messageToSend
      });
      const sentMessage = await chatService.sendMessage({
        chat_session_id: sid,
        sender_id: CURRENT_USER_ID,
        content: messageToSend,
        message_type: "TEXT",
        reply_to_message_id: replyingTo?.id || null
      });
      console.log('Message sent', sentMessage);

      // Update the temp message with real data
      const realMessage = {
        id: sentMessage.id,
        text: sentMessage.content,
        type: "sent",
        sender_id: sentMessage.sender_id,
        timestamp: sentMessage.timestamp,
        attachments: [],
        replyTo: replyingTo
      };

      setMessages(prev => {
        const updatedMessages = prev.map(msg =>
          msg.id === tempMessage.id ? realMessage : msg
        );

        // Update cache with the new message to persist on re-entry
        const currentCache = getCachedMessages(sid);
        if (currentCache?.data) {
          setCachedMessages(sid, {
            ...currentCache.data,
            messages: updatedMessages
          });
        }

        return updatedMessages;
      });

      // Invalidate Inbox cache so it shows updated message preview
      invalidateInboxCache();

      // Note: WebSocket broadcast is now handled by the backend automatically
      console.log('Message sent successfully', { sessionId: sid, messageId: sentMessage.id });

    } catch (err) {
      console.error('Error sending message:', err);
      // Remove the temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      alert('Failed to send message. Please try again.');
      setMessage(messageToSend); // Restore the message
    } finally {
      setSendingMessage(false);
    }
  };

  // ✨ Long press handlers
  const handleMessagePressStart = (messageId, isSentByMe) => {
    // Only allow actions on own messages
    if (!isSentByMe) return;

    const timer = setTimeout(() => {
      setSelectedMessageId(messageId);
      setShowMessageActions(true);
      // Add haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press

    setLongPressTimer(timer);

  };

  const handleMessagePressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessageId) return;

    if (window.confirm('Delete this message?')) {
      try {
        await chatService.deleteMessage(selectedMessageId, CURRENT_USER_ID);

        // Broadcast deletion via WebSocket
        if (socket) {
          const sessionId = chatData.sessionId || chatData.id;
          socket.emit('message_deleted', {
            message_id: selectedMessageId,
            session_id: sessionId,
            deleted_by_user_id: CURRENT_USER_ID
          });
        }

        // Mark as deleted instead of removing
        setMessages(prev => prev.map(msg =>
          msg.id === selectedMessageId
            ? {
              ...msg,
              deleted: true,
              deleted_by_me: true,
              deleted_at: new Date().toISOString(),
              deleted_by_user_id: CURRENT_USER_ID
            }
            : msg
        ));

        setShowMessageActions(false);
        setSelectedMessageId(null);
      } catch (error) {
        console.error('Failed to delete message:', error);
        alert('Failed to delete message. Please try again.');
      }
    }
  };

  // ✨ Copy message
  const handleCopyMessage = () => {
    const msg = messages.find(m => m.id === selectedMessageId);
    if (msg && msg.text) {
      navigator.clipboard.writeText(msg.text);
      alert('Message copied to clipboard');
    }
    setShowMessageActions(false);
    setSelectedMessageId(null);
  };

  // ✨ Start editing message
  const handleEditMessage = () => {
    const msg = messages.find(m => m.id === selectedMessageId);
    if (msg && msg.text && !msg.deleted) {
      setEditingMessageId(selectedMessageId);
      setMessage(msg.text);
      setShowMessageActions(false);
      setSelectedMessageId(null);
    }
  };

  // ✨ Save edited message
  const handleSaveEdit = async () => {
    if (!editingMessageId || !message.trim()) return;

    try {
      await chatService.editMessage(editingMessageId, message.trim());

      // Update message in UI
      setMessages(prev => prev.map(msg =>
        msg.id === editingMessageId
          ? { ...msg, text: message.trim(), edited: true, edited_at: new Date().toISOString() }
          : msg
      ));

      // Broadcast edit via WebSocket
      if (socket) {
        const sessionId = chatData.sessionId || chatData.id;
        socket.emit('message_edited', {
          message_id: editingMessageId,
          content: message.trim(),
          session_id: sessionId
        });
      }

      // Clear edit state
      setEditingMessageId(null);
      setMessage('');
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert('Failed to edit message. Please try again.');
    }
  };

  // ✨ Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setMessage('');
  };

  // ✨ Reply to message
  const handleReplyMessage = () => {
    const msg = messages.find(m => m.id === selectedMessageId);
    const userName = conversationData?.name || chatData?.name || 'User';

    if (msg && !msg.deleted) {
      setReplyingTo({
        id: msg.id,
        text: msg.text || 'Photo',
        sender: msg.type === 'sent' ? 'You' : userName
      });
      setShowMessageActions(false);
      setSelectedMessageId(null);
      inputRef.current?.focus();
    }
  };

  // ✨ Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // ✨ Handle View Profile navigation
  const handleViewProfile = () => {
    const userId = conversationData?.userId || chatData?.userId;
    if (userId) {
      navigate(`/profile/${userId}`);
      setMenuOpen(false);
    }
  };

  // ✨ Handle Unmatch - show modal
  const handleUnmatch = () => {
    setShowUnmatchModal(true);
    setMenuOpen(false);
  };

  // ✨ Confirm Unmatch
  const confirmUnmatch = async () => {
    const sessionId = chatData.sessionId || chatData.id;
    const userName = conversationData?.name || chatData?.name || 'User';

    try {
      // Unmatch the chat
      await chatService.unmatchChat(sessionId, CURRENT_USER_ID);

      setShowUnmatchModal(false);

      // Show success notification
      alert(`You have unmatched with ${userName}. You can still view your chat history but can't send new messages.`);

      // Navigate back to chat list
      navigate('/chat', { replace: true });
    } catch (error) {
      console.error('Error unmatching chat:', error);
      alert('Failed to unmatch. Please try again.');
    }
  };

  // ✨ Cancel Unmatch
  const cancelUnmatch = () => {
    setShowUnmatchModal(false);
  };

  // Confirm Report & Block
  const confirmReportBlock = async () => {
    const sessionId = chatData.sessionId || chatData.id;
    const userName = conversationData?.name || chatData?.name || 'User';

    try {
      // Block the user
      await chatService.blockUser(sessionId, CURRENT_USER_ID);

      setShowReportBlockModal(false);

      // Show success notification
      alert(`${userName} has been reported and blocked successfully.`);

      navigate('/chat', { replace: true });
    } catch (error) {
      console.error('Error reporting and blocking user:', error);
      alert('Failed to report and block user. Please try again.');
    }
  };

  // Cancel Report & Block
  const cancelReportBlock = () => {
    setShowReportBlockModal(false);
  };

  // Use conversation data if available, fallback to chatData
  const displayData = conversationData || chatData || {};
  const userName = displayData.name || 'Chat';
  const userAvatar = displayData.avatar;
  const isUserVerified = displayData.isVerified || false;
  const isUserOnline = displayData.online || false;

  // Show error if user is not logged in
  if (!CURRENT_USER_ID) {
    return (
      <div style={{ maxWidth: '430px', margin: '0 auto', height: '100vh', background: '#f9f4e2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', fontFamily: "'Josefin Sans', sans-serif" }}>
        <XCircle size={64} color="#DC3545" style={{ marginBottom: '20px' }} />
        <h2 style={{ color: '#333', marginBottom: '12px' }}>Not Logged In</h2>
        <p style={{ color: '#666', marginBottom: '24px', lineHeight: 1.6 }}>
          Please log in to access your chats.
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '12px 32px',
            background: '#DC3545',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Show loader after hooks and helper functions are defined
  if (loading) {
    return <HeartLoader overlay />;
  }

  return (
    <div style={{ maxWidth: '430px', margin: '0 auto', height: '100%', background: '#f9f4e2', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Josefin Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif" }}>

      {/* ✨ Hidden file input - iOS WebKit compatible */}
      <input
        type="file"
        ref={cameraInputRef}
        style={{ display: 'none' }}
        accept="image/*,.heic,.heif"
        onChange={handleFileSelect}
        aria-label="Upload image from camera, gallery, or files"
      />

      {/* ✨ BLOCK OVERLAY (Centered Modal) */}
      {displayData.isBlocked && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            background: 'white',
            padding: '32px 24px',
            borderRadius: '20px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            width: '90%',
            maxWidth: '350px'
          }}>
            <XCircle size={48} color="#A85751" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: '#A85751', fontWeight: 700, margin: '0 0 8px 0', fontSize: '20px' }}>
              Chat Blocked
            </h3>
            <p style={{ color: '#666', margin: 0, fontSize: '15px', lineHeight: 1.5 }}>
              You can no longer send or receive messages from this user.
            </p>
            <button
              onClick={onBack}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: '#A85751',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#8A4741'}
              onMouseLeave={(e) => e.target.style.background = '#A85751'}
            >
              Return to Chat List
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#f9f4e2', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #E8DCC8', position: 'relative' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#A85751', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={28} />
        </button>

        <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', position: 'relative', background: '#E8DCC8' }}>
          {userAvatar ? (
            <img src={userAvatar} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600, color: '#A85751' }}>
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: 600, color: '#A85751' }}>{userName}</span>
            {isUserVerified && <VerifiedBadge size={18} />}
          </div>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: '#A85751', cursor: 'pointer', padding: '8px' }}>
          <MoreVertical size={22} />
        </button>

        {menuOpen && (
          <div style={{ position: 'absolute', right: '16px', top: '70px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', overflow: 'hidden', zIndex: 100, minWidth: '200px' }}>
            <button
              onClick={handleViewProfile}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '15px', color: '#333' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <User size={18} />
              View Profile
            </button>
            <button
              onClick={handleUnmatch}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '15px', color: '#333' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <Heart size={18} />
              Unmatch
            </button>
            <button
              onClick={() => {
                const sessionId = chatData.sessionId || chatData.id;
                navigate('/report', { state: { chatId: sessionId } });
                setMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                border: 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '15px',
                color: '#DC3545'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#FEE'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <Flag size={18} />
              Report & Block
            </button>
          </div>
        )}
      </div>

      {/* ✨ Unmatched Banner */}
      {isUnmatched && (
        <div style={{
          padding: '12px 16px',
          background: '#FFEBEB',
          color: '#A85751',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '14px',
          fontWeight: 500,
          borderBottom: '1px solid #E8DCC8'
        }}>
          <XCircle size={20} />
          <span>You have unmatched with this user. You can no longer send messages.</span>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column-reverse', minHeight: 0 }}>
        <div ref={messagesEndRef} />

        {/* ✨ NEW: Typing Indicator */}
        {isPartnerTyping && (
          <TypingIndicator userName={conversationData?.chatData?.name?.split(' ')[0] || 'Partner'} />
        )}

        {/* ✨ UPDATED: Skeleton loader instead of text */}
        {loading && <MessageSkeleton />}

        {error && (
          <div style={{ textAlign: 'center', padding: '20px', background: '#FFE6E6', color: '#DC3545', borderRadius: '8px', margin: '20px 0' }}>
            {error}
            <button
              onClick={fetchConversation}
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                background: '#DC3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            No messages yet. Start the conversation!
          </div>
        )}

        {!loading && !error && messages.slice().reverse().map((msg, index) => (
          <div key={msg.id || index} style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: msg.type === 'sent' ? 'row-reverse' : 'row' }}>

            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '75%', alignItems: msg.type === 'sent' ? 'flex-end' : 'flex-start' }}>
              {/* Show deleted message placeholder */}
              {msg.deleted && (
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '20px',
                  fontSize: '15px',
                  fontStyle: 'italic',
                  opacity: 0.6,
                  background: msg.type === 'sent' ? 'rgba(214, 138, 132, 0.3)' : 'rgba(0, 0, 0, 0.03)',
                  color: '#999',
                  borderBottomRightRadius: msg.type === 'sent' ? '4px' : '20px',
                  borderBottomLeftRadius: msg.type === 'received' ? '4px' : '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <XCircle size={16} />
                  {msg.deleted_by_me ? 'You deleted this message' : 'This message was deleted'}
                </div>
              )}

              {/* Reply reference - only show if not deleted */}
              {!msg.deleted && msg.replyTo && (
                <div style={{
                  background: msg.type === 'sent' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  marginBottom: '6px',
                  fontSize: '13px',
                  borderLeft: '3px solid ' + (msg.type === 'sent' ? 'white' : '#A85751'),
                  maxWidth: '100%'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '2px', fontSize: '12px', opacity: 0.8 }}>
                    <CornerDownRight size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Replying to {msg.replyTo.sender}
                  </div>
                  <div style={{ opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.replyTo.text}
                  </div>
                </div>
              )}

              {/* Display image attachments - only if not deleted */}
              {!msg.deleted && msg.attachments && msg.attachments.length > 0 && msg.attachments.map((attachment, attIndex) => (
                attachment.type === 'IMAGE' && attachment.url && attachment.url.startsWith('http') ? (
                  <div
                    key={attachment.id || attIndex}
                    style={{ marginBottom: '8px' }}
                    onMouseDown={() => handleMessagePressStart(msg.id, msg.type === 'sent')}
                    onMouseUp={handleMessagePressEnd}
                    onMouseLeave={handleMessagePressEnd}
                    onTouchStart={() => handleMessagePressStart(msg.id, msg.type === 'sent')}
                    onTouchEnd={handleMessagePressEnd}
                  >
                    <img
                      src={attachment.url}
                      alt="Attachment"
                      style={{
                        maxWidth: '250px',
                        maxHeight: '300px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        objectFit: 'cover',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                      onClick={() => window.open(attachment.url, '_blank')}
                      onError={(e) => {
                        console.error('Failed to load image:', attachment.url);
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : null
              ))}

              {/* Text message bubble - only if not deleted */}
              {!msg.deleted && msg.text && (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: '20px',
                    fontSize: '15px',
                    lineHeight: 1.4,
                    background: msg.type === 'sent' ? '#D68A84' : 'rgba(0, 0, 0, 0.05)',
                    color: msg.type === 'sent' ? 'white' : '#333',
                    borderBottomRightRadius: msg.type === 'sent' ? '4px' : '20px',
                    borderBottomLeftRadius: msg.type === 'received' ? '4px' : '20px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    position: 'relative'
                  }}
                  onMouseDown={() => handleMessagePressStart(msg.id, msg.type === 'sent')}
                  onMouseUp={handleMessagePressEnd}
                  onMouseLeave={handleMessagePressEnd}
                  onTouchStart={() => handleMessagePressStart(msg.id, msg.type === 'sent')}
                  onTouchEnd={handleMessagePressEnd}
                  onDoubleClick={() => setShowReactionPicker(msg.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                    <span>{msg.text}</span>
                    {msg.edited && (
                      <span style={{ fontSize: '11px', opacity: 0.7, fontStyle: 'italic' }}>
                        (edited)
                      </span>
                    )}
                    {/* ✨ NEW: Message status for sent messages */}
                    {msg.type === 'sent' && (
                      <MessageStatus status={msg.status || 'sent'} />
                    )}
                  </div>
                </div>
              )}

              {/* ✨ NEW: Reactions Display */}
              {!msg.deleted && msg.reactions && msg.reactions.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  marginTop: '4px',
                  justifyContent: msg.type === 'sent' ? 'flex-end' : 'flex-start'
                }}>
                  {msg.reactions.map((reaction, rIdx) => (
                    <button
                      key={`${reaction.emoji}-${rIdx}`}
                      onClick={() => handleReaction(msg.id, reaction.emoji)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        border: reaction.users.includes(CURRENT_USER_ID)
                          ? '2px solid #A85751'
                          : '1px solid rgba(0,0,0,0.1)',
                        background: reaction.users.includes(CURRENT_USER_ID)
                          ? 'rgba(168, 87, 81, 0.1)'
                          : 'white',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      <span>{reaction.emoji}</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>{reaction.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ✨ NEW: Quick Reaction Picker */}
              {showReactionPicker === msg.id && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'white',
                  borderRadius: '24px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                  marginTop: '8px',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(msg.id, emoji)}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '4px',
                        borderRadius: '8px',
                        transition: 'transform 0.1s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowReactionPicker(null)}
                    style={{
                      border: 'none',
                      background: 'rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      color: '#666'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

      {/* Message Actions Sheet */}
      {showMessageActions && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 200,
              animation: 'fadeIn 0.2s ease-in'
            }}
            onClick={() => {
              setShowMessageActions(false);
              setSelectedMessageId(null);
            }}
          />

          {/* Action Sheet */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            zIndex: 201,
            maxWidth: '430px',
            margin: '0 auto',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ width: '40px', height: '4px', background: '#DDD', borderRadius: '2px', margin: '0 auto 20px' }} />

            <button
              onClick={handleReplyMessage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                border: 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#333',
                borderRadius: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <CornerDownRight size={20} />
              Reply
            </button>

            <button
              onClick={handleEditMessage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                border: 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#333',
                borderRadius: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <Edit size={20} />
              Edit
            </button>

            <button
              onClick={handleCopyMessage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                border: 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#333',
                borderRadius: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <Copy size={20} />
              Copy
            </button>

            <button
              onClick={handleDeleteMessage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                border: 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#DC3545',
                borderRadius: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#FFE6E6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <Trash2 size={20} />
              Delete
            </button>

            <button
              onClick={() => {
                setShowMessageActions(false);
                setSelectedMessageId(null);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '14px',
                marginTop: '12px',
                border: '1px solid #E8DCC8',
                background: 'white',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 600,
                color: '#A85751'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Input */}
      {isUnmatched ? (
        <div style={{ padding: '16px', background: '#f9f4e2', borderTop: '1px solid #E8DCC8', textAlign: 'center', color: '#999', fontSize: '14px' }}>
          You can no longer send messages in this chat.
        </div>
      ) : (
        <div style={{ padding: '16px', background: '#f9f4e2', borderTop: '1px solid #E8DCC8', position: 'relative' }}>

          {/* Edit Mode Banner */}
          {editingMessageId && (
          <div style={{
            padding: '12px',
            background: '#FFF8E1',
            borderRadius: '12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #FFD54F'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit size={16} color="#F57C00" />
              <span style={{ fontSize: '14px', color: '#F57C00', fontWeight: 600 }}>
                Editing message
              </span>
            </div>
            <button
              onClick={handleCancelEdit}
              style={{
                background: 'none',
                border: 'none',
                color: '#F57C00',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Reply Mode Banner */}
        {replyingTo && (
          <div style={{
            padding: '12px',
            background: '#E3F2FD',
            borderRadius: '12px',
            marginBottom: '12px',
            borderLeft: '3px solid #2196F3'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <CornerDownRight size={14} color="#2196F3" />
                  <span style={{ fontSize: '13px', color: '#2196F3', fontWeight: 600 }}>
                    Replying to {replyingTo.sender}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {replyingTo.text}
                </div>
              </div>
              <button
                onClick={handleCancelReply}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2196F3',
                  cursor: 'pointer',
                  padding: '4px',
                  marginLeft: '8px'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Only show regular input when AI suggestions are closed */}
        {!showAISuggestions && (
          <>
            {/* Image Preview */}
            {imagePreview && (
              <div style={{
                padding: '12px',
                borderTop: '1px solid #E8DCC8',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'white',
                borderRadius: '12px'
              }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '2px solid #E8DCC8'
                  }}
                />
                <div style={{ flex: 1, fontSize: '14px', color: '#666' }}>
                  {uploadingImage ? 'Uploading...' : 'Ready to send'}
                </div>
                <button
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                  style={{
                    background: '#FFE6E6',
                    color: '#DC3545',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: uploadingImage ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  Remove
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Camera button - hide when editing */}
              {!editingMessageId && (
                <button
                  onClick={handleCameraClick}
                  disabled={uploadingImage}
                  style={{
                    background: 'white',
                    border: '1px solid #E8DCC8',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploadingImage ? 'not-allowed' : 'pointer',
                    color: '#A85751'
                  }}
                >
                  <Camera size={22} />
                </button>
              )}

              <div style={{ flex: 1, background: 'white', borderRadius: '24px', border: '1px solid #E8DCC8', display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '8px' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    editingMessageId ? "Edit your message..." :
                      replyingTo ? "Reply..." :
                        imagePreview ? "Add a caption..." :
                          "Type a message..."
                  }
                  value={message}
                  onChange={(e) => handleTypingChange(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  disabled={sendingMessage || uploadingImage}
                  style={{ flex: 1, border: 'none', background: 'none', fontSize: '15px', outline: 'none' }}
                />
                <button
                  onClick={() => setShowAIChat(true)}
                  style={{ background: 'none', border: 'none', color: '#A85751', cursor: 'pointer', padding: '4px', position: 'relative' }}
                >
                  <Sparkles size={22} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '6px', height: '6px', background: '#FFD700', borderRadius: '50%', border: '1px solid white' }} />
                </button>
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sendingMessage || uploadingImage || (!message.trim() && !selectedImage)}
                style={{
                  background: (sendingMessage || uploadingImage || (!message.trim() && !selectedImage)) ? '#CCC' : editingMessageId ? '#FF9800' : '#D68A84',
                  color: 'white',
                  border: 'none',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (sendingMessage || uploadingImage || (!message.trim() && !selectedImage)) ? 'not-allowed' : 'pointer'
                }}
              >
                <Send size={22} />
              </button>
            </div>
          </>
        )}

        {/* Cancel edit button (mobile-friendly) */}
        {editingMessageId && (
          <button
            onClick={handleCancelEdit}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              background: 'none',
              border: '1px solid #E8DCC8',
              borderRadius: '12px',
              color: '#666',
              fontSize: '14px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Cancel Edit
                      </button>
                    )}
                  </div>
                )}
          
                {/* AI Suggestions Box - Replaces Input Area */}
                {showAISuggestions && !isUnmatched && (
                  <div
                    ref={aiSuggestionsRef}
                    style={{            padding: '16px',
            background: '#FFF8F0',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#A85751', fontWeight: 600, fontSize: '14px' }}>
              <Sparkles size={18} />
              AI Suggestions
            </div>
            <button
              onClick={() => setShowAISuggestions(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#A85751',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {loadingAI ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#A85751' }}>
              <Sparkles size={28} style={{ margin: '0 auto 10px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Generating suggestions...</div>
            </div>
          ) : (
            <>
              {/* Suggestion list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setMessage(suggestion.text);
                    }}
                    style={{
                      background: 'white',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#333',
                      border: '2px solid #E8DCC8',
                      fontWeight: 500,
                      lineHeight: 1.4
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#D68A84';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E8DCC8';
                    }}
                  >
                    {suggestion.text}
                  </div>
                ))}
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div style={{
                  padding: '12px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'white',
                  borderRadius: '12px',
                  border: '2px solid #E8DCC8'
                }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #E8DCC8'
                    }}
                  />
                  <div style={{ flex: 1, fontSize: '14px', color: '#666' }}>
                    {uploadingImage ? 'Uploading...' : 'Ready to send'}
                  </div>
                  <button
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                    style={{
                      background: '#FFE6E6',
                      color: '#DC3545',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: uploadingImage ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Input interface */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, background: 'white', borderRadius: '24px', border: '1px solid #E8DCC8', display: 'flex', alignItems: 'center', padding: '8px 12px' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={
                      editingMessageId ? "Edit your message..." :
                        replyingTo ? "Reply..." :
                          imagePreview ? "Add a caption..." :
                            "Type a message..."
                    }
                    value={message}
                    onChange={(e) => handleTypingChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSend();
                      }
                    }}
                    disabled={sendingMessage || uploadingImage}
                    style={{ flex: 1, border: 'none', background: 'none', fontSize: '15px', outline: 'none' }}
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={sendingMessage || uploadingImage || (!message.trim() && !selectedImage)}
                  style={{
                    background: (sendingMessage || uploadingImage || (!message.trim() && !selectedImage)) ? '#CCC' : editingMessageId ? '#FF9800' : '#D68A84',
                    color: 'white',
                    border: 'none',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (sendingMessage || uploadingImage || (!message.trim() && !selectedImage)) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={22} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showAIChat && (
        <AIChat
          open={showAIChat}
          onClose={() => setShowAIChat(false)}
          sessionId={sessionId || (chatData && (chatData.sessionId || chatData.id))}
          currentUserId={CURRENT_USER_ID}
          onInsert={(text) => {
            setMessage(text);
            setShowAIChat(false);
          }}
        />
      )}

      {/* Unmatch Confirmation Modal */}
      {showUnmatchModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={cancelUnmatch}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              animation: 'fadeIn 0.2s ease-out'
            }}
          />

          {/* Modal */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            borderRadius: '20px',
            padding: '32px 24px',
            width: '90%',
            maxWidth: '400px',
            zIndex: 9999,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.3s ease-out',
            textAlign: 'center'
          }}>
            {/* Heart Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #FFE5E5 0%, #FFD0D0 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Heart size={32} color="#DC3545" />
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#333',
              marginBottom: '12px',
              lineHeight: 1.3
            }}>
              Unmatch with {conversationData?.name || chatData?.name || 'this user'}?
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '15px',
              color: '#666',
              lineHeight: 1.6,
              marginBottom: '28px'
            }}>
              You can still view your chat history, but you won't be able to send new messages to each other.
            </p>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              flexDirection: 'column'
            }}>
              <button
                onClick={confirmUnmatch}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#DC3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#C82333'}
                onMouseLeave={(e) => e.target.style.background = '#DC3545'}
              >
                Yes, Unmatch
              </button>

              <button
                onClick={cancelUnmatch}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#F5F5F5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#E8E8E8'}
                onMouseLeave={(e) => e.target.style.background = '#F5F5F5'}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Report & Block Confirmation Modal */}
      {showReportBlockModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={cancelReportBlock}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              animation: 'fadeIn 0.2s ease-out'
            }}
          />

          {/* Modal */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            borderRadius: '20px',
            padding: '32px 24px',
            width: '90%',
            maxWidth: '400px',
            zIndex: 9999,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.3s ease-out',
            textAlign: 'center'
          }}>
            {/* Flag Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #FFE5E5 0%, #FFCCCC 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Flag size={32} color="#DC3545" />
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#333',
              marginBottom: '12px',
              lineHeight: 1.3
            }}>
              Report & Block {conversationData?.name || chatData?.name || 'this user'}?
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '15px',
              color: '#666',
              lineHeight: 1.6,
              marginBottom: '28px'
            }}>
              This will report the user for inappropriate behavior and block them. You won't be able to send or receive messages from them.
            </p>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              flexDirection: 'column'
            }}>
              <button
                onClick={confirmReportBlock}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#DC3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#C82333'}
                onMouseLeave={(e) => e.target.style.background = '#DC3545'}
              >
                Yes, Report & Block
              </button>

              <button
                onClick={cancelReportBlock}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#F5F5F5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#E8E8E8'}
                onMouseLeave={(e) => e.target.style.background = '#F5F5F5'}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default Chat;