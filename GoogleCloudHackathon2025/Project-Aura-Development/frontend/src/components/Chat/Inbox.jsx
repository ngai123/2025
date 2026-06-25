import { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react';
import {
  AlertCircle, CheckCircle, ChevronUp, MessageCircleHeart, ShieldBan, XCircle
} from 'lucide-react';
import { FiCalendar } from 'react-icons/fi';
import chatService from '../../api/services/chatService';
import { useSocket } from '../../contexts/SocketContext';
import { isIOSDevice } from '../../utils/deviceDetection';

// --- Cache Configuration ---
const CHAT_LIST_CACHE_KEY = 'inbox_chatListCache';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache validity

/**
 * Get cached chat list from localStorage
 * Validates that cache belongs to current user to prevent data leakage
 */
const getCachedChatList = () => {
  try {
    const cached = localStorage.getItem(CHAT_LIST_CACHE_KEY);
    if (cached) {
      const { data, timestamp, userId } = JSON.parse(cached);

      // Validate that cache belongs to current user
      const currentUserId = getCurrentUserId();
      if (userId && currentUserId && String(userId) !== String(currentUserId)) {
        // Cache belongs to different user - clear it and return null
        localStorage.removeItem(CHAT_LIST_CACHE_KEY);
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

/**
 * Save chat list to localStorage cache with user ID for validation
 */
const setCachedChatList = (data) => {
  try {
    const userId = getCurrentUserId();
    localStorage.setItem(CHAT_LIST_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
      userId // Store user ID with cache to validate on retrieval
    }));
  } catch {
    // Ignore cache errors (storage full, etc.)
  }
};

/**
 * Get current user ID from localStorage
 * @returns {number|null} User ID or null if not logged in
 */
const getCurrentUserId = () => {
  const userId = localStorage.getItem('current_user_id');
  if (!userId) {
    console.error('[Inbox] No user ID found in localStorage. User may not be logged in.');
    return null;
  }
  return parseInt(userId, 10);
};

// --- Memoized Components for Performance ---

const VerifiedBadge = memo(({ size = 16 }) => (
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
));

// Avatar component with memoization to prevent unnecessary re-renders
const ChatAvatar = memo(({ avatar, name }) => (
  <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', background: '#E8DCC8' }}>
    {avatar ? (
      <img
        src={avatar}
        alt={name}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        loading="lazy"
        decoding="async"
      />
    ) : (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 600, color: '#A85751' }}>
        {name.charAt(0).toUpperCase()}
      </div>
    )}
  </div>
));

// Memoized chat item component - only re-renders when chat data changes
const ChatItem = memo(({ chat, onClick }) => {
  const handleMouseEnter = useCallback((e) => {
    e.currentTarget.style.background = 'rgba(232,220,200,0.3)';
  }, []);

  const handleMouseLeave = useCallback((e) => {
    e.currentTarget.style.background = 'transparent';
  }, []);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 0',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
        opacity: (chat.isBlocked || chat.isUnmatched) ? 0.5 : 1
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <ChatAvatar avatar={chat.avatar} name={chat.name} />
      </div>

      {/* Chat Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {chat.name}
            {chat.isVerified && <VerifiedBadge size={14} />}
          </div>
          <div style={{ fontSize: '12px', color: '#A85751', opacity: 0.7, flexShrink: 0, marginLeft: '8px' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontSize: '14px',
            color: (chat.isBlocked || chat.isUnmatched) ? '#DC3545' : '#666',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {chat.isBlocked && (
              <ShieldBan size={16} style={{ flexShrink: 0, color: '#DC3545' }} />
            )}
            {chat.isUnmatched && !chat.isBlocked && (
              <XCircle size={16} style={{ flexShrink: 0, color: '#FF7F7F' }} />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {chat.isBlocked ? 'Blocked' : chat.isUnmatched ? 'Unmatched' : (chat.message && chat.message !== 'No messages yet' ? chat.message : '')}
            </span>
          </div>
          {chat.unread > 0 && !chat.isBlocked && !chat.isUnmatched && (
            <div style={{
              background: '#D68A84',
              color: 'white',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '12px',
              marginLeft: '8px',
              flexShrink: 0
            }}>
              {chat.unread}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Skeleton loading component for chat items
const ChatItemSkeleton = memo(() => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
    {/* Avatar skeleton */}
    <div style={{
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      background: 'linear-gradient(90deg, #E8DCC8 25%, #F0E6D6 50%, #E8DCC8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }} />
    {/* Text skeleton */}
    <div style={{ flex: 1 }}>
      <div style={{
        height: '16px',
        width: '60%',
        borderRadius: '4px',
        marginBottom: '8px',
        background: 'linear-gradient(90deg, #E8DCC8 25%, #F0E6D6 50%, #E8DCC8 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }} />
      <div style={{
        height: '14px',
        width: '80%',
        borderRadius: '4px',
        background: 'linear-gradient(90deg, #E8DCC8 25%, #F0E6D6 50%, #E8DCC8 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }} />
    </div>
  </div>
));

// Google Maps Pin Icon Component
const GPSIcon = ({ size = 24, disabled = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ opacity: disabled ? 0.5 : 1 }}
  >
    {/* Pin shape with Google colors */}
    <path
      d="M24 4C15.163 4 8 11.163 8 20c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z"
      fill={disabled ? '#CCC' : 'url(#gradient)'}
    />
    {/* White circle in center */}
    <circle
      cx="24"
      cy="20"
      r="6"
      fill="white"
    />
    {/* Gradient definition */}
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EA4335" />
        <stop offset="25%" stopColor="#FBBC04" />
        <stop offset="50%" stopColor="#34A853" />
        <stop offset="75%" stopColor="#4285F4" />
        <stop offset="100%" stopColor="#4285F4" />
      </linearGradient>
    </defs>
  </svg>
);

// Inbox Component
const Inbox = ({ onSelectChat }) => {
  const [searchQuery] = useState('');
  const [showSOS, setShowSOS] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [chatListData, setChatListData] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Matched');
  const [isRefreshing, setIsRefreshing] = useState(false); // Background refresh indicator
  const chatListRef = useRef(null);
  const socket = useSocket();
  const joinedSessionsRef = useRef(new Set());
  const refreshTimerRef = useRef(null);

  // iOS Detection - run once on mount
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
  }, []);

  // Get current user ID
  const CURRENT_USER_ID = getCurrentUserId();

  // SOS Form states
  const [sosName, setSosName] = useState('');
  const [sosLocation, setSosLocation] = useState('');
  const [sosTime, setSosTime] = useState(''); // Native datetime-local format (YYYY-MM-DDTHH:mm)
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ✨ Chat contacts autocomplete for name field
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // ✨ Emergency Alert Sent Modal
  const [showEmergencyAlertSent, setShowEmergencyAlertSent] = useState(false);
  const [emergencyAlertDetails, setEmergencyAlertDetails] = useState(null);

  const normalizeAndSortChats = useCallback((list) => {
    if (!Array.isArray(list)) return [];
    const byUser = new Map();
    for (const item of list) {
      const key = item.userId ?? item.user_id ?? item.name;
      const existing = byUser.get(key);
      const a = item.lastMessageAt ? Date.parse(item.lastMessageAt) : 0;
      const b = existing && existing.lastMessageAt ? Date.parse(existing.lastMessageAt) : 0;
      if (!existing || a >= b) {
        byUser.set(key, item);
      }
    }
    const arr = Array.from(byUser.values());
    arr.sort((x, y) => {
      const dx = x.lastMessageAt ? Date.parse(x.lastMessageAt) : 0;
      const dy = y.lastMessageAt ? Date.parse(y.lastMessageAt) : 0;
      return dy - dx;
    });
    return arr;
  }, []);

  // Fetch chat list with stale-while-revalidate pattern
  const fetchChatList = useCallback(async (showFullLoader = true) => {
    try {
      // Try to show cached data immediately for instant UI
      const cached = getCachedChatList();
      if (cached?.data) {
        setChatListData(cached.data);
        // If cache is fresh, skip network fetch
        if (!cached.isStale) {
          setLoading(false);
          return;
        }
        // Cache is stale - show cached data but continue to revalidate
        setLoading(false);
        setIsRefreshing(true);
      } else if (showFullLoader) {
        setLoading(true);
      }

      setError(null);
      const data = await chatService.getChatList(getCurrentUserId());
      const normalized = normalizeAndSortChats(data);
      setChatListData(normalized);
      setCachedChatList(normalized);
    } catch (err) {
      console.error('Error fetching chat list:', err);
      // Only show error if we don't have cached data
      if (!getCachedChatList()?.data) {
        setError('Failed to load chats. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [normalizeAndSortChats]);

  // Fetch chat list on component mount
  useEffect(() => {
    fetchChatList();
  }, [fetchChatList]);

  useEffect(() => {
    const handleScroll = () => {
      if (chatListRef.current) setShowScrollTop(chatListRef.current.scrollTop > 300);
    };
    const el = chatListRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (evt) => {
      console.log('Inbox update due to event', evt);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        fetchChatList(false); // Don't show full loader for background refresh
      }, 150);
    };
    socket.on('message_created', (data) => onUpdate({ type: 'message_created', data }));
    socket.on('new_message', (data) => onUpdate({ type: 'new_message', data }));
    socket.on('message_deleted', (data) => onUpdate({ type: 'message_deleted', data }));
    socket.on('message_edited', (data) => onUpdate({ type: 'message_edited', data }));
    return () => {
      socket.off('message_created');
      socket.off('new_message');
      socket.off('message_deleted');
      socket.off('message_edited');
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [socket, fetchChatList]);

  // iOS Fix: Reset scroll position to top when component mounts
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      if (chatListRef.current) {
        chatListRef.current.scrollTo({
          top: 0,
          behavior: 'auto' // Instant scroll, not smooth
        });
      }
    });
  }, []); // Run only on mount

  useEffect(() => {
    if (!socket || !Array.isArray(chatListData) || !socket.connected) return;
    for (const chat of chatListData) {
      const sid = chat.sessionId || chat.id;
      if (!sid) continue;
      if (!joinedSessionsRef.current.has(sid)) {
        console.log('Inbox joining chat room', { sessionId: sid });
        socket.emit('join_chat', { user_id: CURRENT_USER_ID, session_id: sid });
        joinedSessionsRef.current.add(sid);
      }
    }
  }, [socket, chatListData, CURRENT_USER_ID]);

  // Memoized filtered chats to prevent recalculation on every render
  const filteredChats = useMemo(() => {
    return chatListData.filter(c => {
      // Filter by search query
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by category
      let matchesCategory = true;
      if (selectedCategory === 'Matched') {
        // Show chats that are active (not blocked and not unmatched)
        matchesCategory = !c.isBlocked && !c.isUnmatched;
      } else if (selectedCategory === 'Unmatched') {
        // Show chats that have been unmatched (status = "UNMATCHED")
        matchesCategory = c.isUnmatched === true;
      } else if (selectedCategory === 'Blocked') {
        // Show only blocked chats
        matchesCategory = c.isBlocked === true;
      }

      return matchesSearch && matchesCategory;
    });
  }, [chatListData, searchQuery, selectedCategory]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'Project-Aura-App/1.0'
              }
            }
          );
          const data = await response.json();
          // Remove any non-Latin characters (Chinese, etc.)
          const cleanAddress = data.display_name ? data.display_name.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef\u3000-\u303f，]/g, '').replace(/\s+/g, ' ').trim() : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setSosLocation(cleanAddress);
        } catch (error) {
          console.warn('Reverse geocoding failed:', error);
          setSosLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }

        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location');
        setGettingLocation(false);
      }
    );
  };

  //Debounce timer ref
  const searchTimerRef = useRef(null);

  //Search location using Nominatim (OpenStreetMap) API
  const handleLocationChange = async (query) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
         `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&accept-language=en`,
      {        headers: {
           'Accept-Language': 'en',
           'User-Agent': 'Project-Aura-App/1.0'
        }
      }
      );
      const data = await response.json();
      // Clean up the display names to remove Chinese characters
      const cleanedData = data.map(location => ({
        ...location,
        display_name: location.display_name.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef\u3000-\u303f，]/g, '').replace(/\s+/g, ' ').trim()
      }));
      setLocationSuggestions(cleanedData);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
    }
  };

  // Handle location input change with debounce
  const handleLocationInputChange = (e) => {
    const value = e.target.value;
    setSosLocation(value);

    // Clear previous timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // Set new debounce timer
    searchTimerRef.current = setTimeout(() => {
      // Call the defined handler (fixes missing function reference)
      handleLocationChange(value);
    }, 500); // 500ms debounce
  };

  // Select a location from suggestions
  const selectLocation = (location) => {
    setSosLocation(location.display_name);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  // ✨ Handle name input change - filter chat contacts
  const handleNameChange = (e) => {
    const value = e.target.value;
    setSosName(value);

    // Filter chat contacts based on input
    if (value.length > 0) {
      const filtered = chatListData.filter(chat =>
        chat.name.toLowerCase().includes(value.toLowerCase())
      );
      setNameSuggestions(filtered);
      setShowNameSuggestions(true);
    } else {
      setNameSuggestions([]);
      setShowNameSuggestions(false);
    }
  };

  // ✨ Select a chat contact from suggestions
  const selectChatContact = (chat) => {
    setSosName(chat.name);
    setShowNameSuggestions(false);
    setNameSuggestions([]);
  };

  // Initialize SOS form when modal opens
  useEffect(() => {
    if (showSOS) {
      setSosName(selectedChat?.name || '');
      setSosLocation('');
      // Set to current time in datetime-local format (YYYY-MM-DDTHH:mm)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setSosTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [showSOS, selectedChat]);

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  // Memoized chat click handler
  const handleChatClick = useCallback((chat) => {
    setSelectedChat(chat);
    onSelectChat(chat);
  }, [onSelectChat]);

  // If no user ID, show error message
  if (!CURRENT_USER_ID) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <AlertCircle size={48} color="#FF6B6B" style={{ marginBottom: '16px' }} />
        <h2 style={{ marginBottom: '8px' }}>Not Logged In</h2>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          Please log in to view your chats.
        </p>
        <button
          onClick={() => window.location.href = '/login'}
          style={{
            padding: '12px 24px',
            backgroundColor: '#FF6B6B',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      // Fix: Use percentage height to inherit from flex parent (ContentWrapper)
      height: '100%',
      // Fix: minHeight 0 allows flex item to shrink properly for scroll containment
      minHeight: 0,
      background: '#f9f4e2',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Josefin Sans', sans-serif",
      // Fix: overflow hidden ensures only Chat List scrolls (prevents double scroll)
      overflow: 'hidden',
      // Fix: relative positioning for sticky header context
      position: 'relative'
    }}>
      {/* Sticky Header Container - Groups header + filter tabs */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: '#f9f4e2',
        // iOS Fix: Ensure sticky header stays in place during scroll
        WebkitBackfaceVisibility: isIOS ? 'hidden' : 'visible',
        backfaceVisibility: isIOS ? 'hidden' : 'visible'
      }}>
        {/* Header Section */}
        <div style={{
          background: '#f9f4e2',
          padding: '12px 16px',
          borderBottom: '1px solid #E8DCC8',
          // iOS Fix: Reduced padding to avoid double safe-area from body (ios-fixes.css already adds body padding)
          paddingTop: isIOS ? '12px' : '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: 700, color: '#000000', marginTop: '10px' }}>
              <span style={{display:'flex',alignItems: 'center', marginTop: '-6px' }}>
              <MessageCircleHeart size={28} />
              </span>
              Chats
              {/* Background refresh indicator */}
              {isRefreshing && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#A85751',
                  animation: 'pulse 1s infinite'
                }} />
              )}
            </div>
            <button
              onClick={() => setShowSOS(true)}
              style={{
                background: '#DC3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <AlertCircle size={16} />
              SOS
            </button>
          </div>
        </div>

        {/* Category Filter Section */}
        <div style={{
          background: '#f9f4e2',
          padding: '12px 20px',
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
        {['Matched', 'Unmatched', 'Blocked'].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '14px',
              fontFamily: "'Josefin Sans', sans-serif",
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              background: selectedCategory === category ? '#A85751' : '#E8DCC8',
              color: selectedCategory === category ? 'white' : '#666'
            }}
          >
            {category}
          </button>
        ))}
        </div>
      </div>

      {/* Loading State - Show skeleton instead of full loader for better UX */}
      {loading && !chatListData.length && (
        <div style={{ flex: 1, padding: '0 8px', marginTop: '12px' }}>
          {[...Array(6)].map((_, i) => (
            <ChatItemSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '16px',
          background: '#FFE6E6',
          color: '#DC3545',
          margin: '16px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          {error}
          <button
            onClick={() => fetchChatList(true)}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              background: '#DC3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'block',
              margin: '8px auto 0'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Chat List - iOS Fix: Added smooth scrolling */}
      {(!loading || chatListData.length > 0) && !error && (
        <div ref={chatListRef} style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 8px',
          marginTop: '12px',
          WebkitOverflowScrolling: 'touch', /* Smooth momentum scrolling on iOS */
          // iOS Fix: Add bottom padding for safe area (home indicator)
          paddingBottom: isIOS ? 'max(env(safe-area-inset-bottom, 20px), 20px)' : '0',
          // iOS Fix: Ensure proper height calculation
          minHeight: isIOS ? '0' : 'auto',
          // iOS Fix: Force GPU acceleration for smoother scrolling
          transform: isIOS ? 'translateZ(0)' : 'none',
          willChange: isIOS ? 'scroll-position' : 'auto'
        }}>
          {filteredChats.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999'
            }}>
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </div>
          ) : (
            filteredChats.map(chat => (
              <ChatItem
                key={chat.id || chat.sessionId || chat.userId}
                chat={chat}
                onClick={() => handleChatClick(chat)}
                isSelected={selectedChat?.id === chat.id}
              />
            ))
          )}
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => chatListRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(214, 138, 132, 0.9)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            zIndex: 100
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(214, 138, 132, 1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(214, 138, 132, 0.9)'}
        >
          <ChevronUp size={24} />
        </button>
      )}

      {/* SOS Modal */}
      {showSOS && (
        <div
          onClick={() => setShowSOS(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '0',
              maxWidth: '340px',
              width: '90%',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #fd7474ff, #fa9595ff)',
              color: 'white',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              textAlign: 'center',
              borderBottom: '1px solid #F9F4E2',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowSOS(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              >
                ✕
              </button>
              <span>Emergency SOS</span>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#F9F4E2', borderRadius: '0 0 24px 24px' }}>
              <div style={{ marginBottom: '24px' }}>
                {/* Meeting With - Editable Name with Chat Contacts Autocomplete */}
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <label style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '6px' }}>
                    Meeting with:
                  </label>
                  <input
                    type="text"
                    value={sosName}
                    onChange={handleNameChange}
                    onFocus={() => sosName.length > 0 && setShowNameSuggestions(true)}
                    placeholder="Enter name or select from chats"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border 0.2s',
                    }}
                    onFocusCapture={(e) => e.target.style.border = '1px solid #A85751'}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid #E0E0E0';
                      // Delay hiding to allow click on suggestion
                      setTimeout(() => setShowNameSuggestions(false), 200);
                    }}
                  />

                  {/* Chat Contacts Suggestions Dropdown */}
                  {showNameSuggestions && nameSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}>
                      {nameSuggestions.map((chat, index) => (
                        <div
                          key={chat.id || index}
                          onClick={() => selectChatContact(chat)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: index < nameSuggestions.length - 1 ? '1px solid #F0F0F0' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F9F4E2'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: '#E8DCC8',
                            flexShrink: 0
                          }}>
                            {chat.avatar ? (
                              <img src={chat.avatar} alt={chat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#A85751'
                              }}>
                                {chat.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Name */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>
                              {chat.name}
                            </div>
                            {chat.lastMessage && (
                              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                                {chat.lastMessage.substring(0, 30)}...
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location - Google Maps Style Single Box */}
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <label style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '6px' }}>
                    Location:
                  </label>

                  {/* Single unified input box with icons */}
                  <div style={{ position: 'relative' }}>
                    {/* Input field */}
                    <input
                      type="text"
                      value={sosLocation}
                      onChange={handleLocationInputChange}
                      onFocus={(e) => {
                        if (sosLocation.length >= 3) setShowSuggestions(true);
                        e.target.style.border = '1px solid #A85751';
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid #E0E0E0';
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      placeholder="Search here"
                      style={{
                        width: '100%',
                        padding: '10px 50px 10px 12px',
                        border: '1px solid #E0E0E0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        background: 'white',
                        transition: 'border 0.2s',
                      }}
                    />

                    {/* Right icon: GPS Logo */}
                    <button
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: gettingLocation ? 'not-allowed' : 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                      }}
                    >
                      <GPSIcon size={24} disabled={gettingLocation} />
                    </button>

                    {/* Location Suggestions Dropdown */}
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #E0E0E0',
                        borderRadius: '12px',
                        marginTop: '8px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                      }}>
                        {locationSuggestions.map((location, index) => (
                          <div
                            key={index}
                            onClick={() => selectLocation(location)}
                            style={{
                              padding: '14px 16px',
                              cursor: 'pointer',
                              borderBottom: index < locationSuggestions.length - 1 ? '1px solid #F0F0F0' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F9F9F9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <div style={{ fontSize: '18px' }}>📍</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: '#333' }}>
                                {location.name || location.display_name.split(',')[0]}
                              </div>
                              <div style={{ fontSize: '12px', color: '#999' }}>
                                {location.display_name}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Time - Native datetime-local input */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: '#666', fontSize: '14px', marginBottom: '6px' }}>
                    Time:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FiCalendar
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#666',
                        pointerEvents: 'none',
                        zIndex: 1
                      }}
                    />
                    <input
                      type="datetime-local"
                      value={sosTime}
                      onChange={(e) => setSosTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 40px',
                        border: '1px solid #E0E0E0',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontFamily: "'Josefin Sans', sans-serif",
                        outline: 'none',
                        background: 'white',
                        color: '#333',
                        transition: 'border 0.2s',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => e.target.style.border = '1px solid #A85751'}
                      onBlur={(e) => e.target.style.border = '1px solid #E0E0E0'}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    // Validation
                    if (!sosName || !sosLocation || !sosTime) {
                      alert('Please fill in all fields');
                      return;
                    }

                    // Get selected contacts details (auto-send to all emergency contacts)
                    // Format datetime-local to readable format
                    let formattedTime = 'Not specified';
                    if (sosTime) {
                      const date = new Date(sosTime);
                      formattedTime = date.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }).replace(',', ' at');
                    }

                    // ✨ Haptic feedback - Strong vibration pattern (like AirDrop confirmation)
                    if (navigator.vibrate) {
                      // Pattern: vibrate-pause-vibrate-pause-vibrate (200ms, 100ms, 200ms, 100ms, 300ms)
                      // This creates a distinctive "alert sent" feeling
                      navigator.vibrate([200, 100, 200, 100, 300]);
                    }

                    // Store alert details and show modal
                    setEmergencyAlertDetails({
                      name: sosName,
                      location: sosLocation,
                      time: formattedTime
                    });

                    // TODO: Replace this with actual API call to send SMS/notifications

                    setShowSOS(false);
                    setShowEmergencyAlertSent(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: '#FF7F7F',
                    color: 'white',
                    fontSize: '15px'
                  }}
                >
                  Send Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Alert Sent Modal */}
      {showEmergencyAlertSent && emergencyAlertDetails && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowEmergencyAlertSent(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
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
            borderRadius: '24px',
            padding: '0',
            width: '90%',
            maxWidth: '340px',
            zIndex: 9999,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.3s ease-out',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #fd7474ff, #fa9595ff)',
              color: 'white',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '40px',
                marginBottom: '8px'
              }}>
                🚨
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                margin: 0
              }}>
                EMERGENCY ALERT SENT!
              </h3>
            </div>

            {/* Content */}
            <div style={{
              padding: '24px',
              background: '#F9F4E2'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #E8DCC8'
                }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#999',
                    marginBottom: '6px',
                    fontWeight: 600
                  }}>
                    Meeting with:
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: '#333',
                    fontWeight: 600
                  }}>
                    {emergencyAlertDetails.name}
                  </div>
                </div>

                <div style={{
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #E8DCC8'
                }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#999',
                    marginBottom: '6px',
                    fontWeight: 600
                  }}>
                    Location:
                  </div>
                  <div style={{
                    fontSize: '15px',
                    color: '#333',
                    lineHeight: 1.5
                  }}>
                    {emergencyAlertDetails.location}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '13px',
                    color: '#999',
                    marginBottom: '6px',
                    fontWeight: 600
                  }}>
                    Time:
                  </div>
                  <div style={{
                    fontSize: '15px',
                    color: '#333'
                  }}>
                    {emergencyAlertDetails.time}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowEmergencyAlertSent(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #fd7474ff, #fa9595ff)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(253, 116, 116, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.02)';
                  e.target.style.boxShadow = '0 6px 16px rgba(253, 116, 116, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 4px 12px rgba(253, 116, 116, 0.3)';
                }}
              >
                OK
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
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Inbox;
