// Project-Aura-Development/frontend/src/components/Like/Likedmepage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../Main/BottomNav.jsx';
import HeartLoader from '../common/HeartLoader.jsx';
import { FiHeart } from 'react-icons/fi';
import { CheckCircle } from 'lucide-react';
import api, { BASE_URL } from '../../api/axios'; // Use centralized axios instance with auth

// ============= CACHE CONFIGURATION =============
const LIKES_ME_CACHE_KEY = 'likes_me_cache';
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache validity

const getCurrentUserId = () => {
  return localStorage.getItem('current_user_id') || localStorage.getItem('userId') || null;
};

/**
 * Get cached likes-me data from localStorage
 * Validates that cache belongs to current user to prevent data leakage
 */
const getCachedLikesMe = () => {
  try {
    const cached = localStorage.getItem(LIKES_ME_CACHE_KEY);
    if (cached) {
      const { data, timestamp, userId } = JSON.parse(cached);

      // Validate cache belongs to current user
      const currentUserId = getCurrentUserId();
      if (userId && currentUserId && String(userId) !== String(currentUserId)) {
        localStorage.removeItem(LIKES_ME_CACHE_KEY);
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
 * Save likes-me data to localStorage cache with user ID for validation
 */
const setCachedLikesMe = (data) => {
  try {
    const userId = getCurrentUserId();
    localStorage.setItem(LIKES_ME_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
      userId // Store user ID with cache to validate on retrieval
    }));
  } catch {
    // Ignore cache errors (storage full, etc.)
  }
};

// Helper function to convert relative proxy URLs to full API URLs
const toFullImageUrl = (url) => {
  if (!url) return null;

  // If it's already a full URL (starts with http:// or https://), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it's a relative URL (starts with /), prepend the API base URL
  if (url.startsWith('/')) {
    return `${BASE_URL}${url}`;
  }
  // Otherwise, return as is
  return url;
};

const COLORS = {
  primary: '#000000',
  selected: '#FF7F7F',
  backgroundLight: '#F9F4E2',
  backgroundDark: '#1A1A1A',
  cardLight: '#FFFFFF',
  cardDark: '#2D2D2D',
  textLight: '#000000',
  textDark: '#FFFFFF',
  accent1: '#FFA0A0',
  accent2: '#FFBEBE',
  green: '#22C55E',
  blue: '#3B82F6',
  grayLight: '#9CA3AF',
  grayDark: '#6B7280'
};

// Helper: ensure newest appears first by checking common timestamp fields
const getComparableValue = (p) => {
  const candidates = [
    'liked_at', 'likedAt',
    'created_at', 'createdAt',
    'updated_at', 'updatedAt',
    'timestamp', 'time', 'date'
  ];
  for (const key of candidates) {
    if (p && p[key]) {
      const val = p[key];
      const ts = new Date(val).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
  }
  if (typeof p?.id === 'number') return p.id;
  if (typeof p?.profile_id === 'number') return p.profile_id;
  return 0;
};
const sortNewestFirst = (arr) => arr.slice().sort((a, b) => getComparableValue(b) - getComparableValue(a));

const EmptyState = ({ activePage, styles }) => {
  const emptyStateMessages = {
    likesMe: {
      title: "The Aura's Waiting...",
      body: "Your admirers are waiting! Go spread your light on Discover to bring them to you."
    },
    myLikes: {
      title: "Time to Spark an Aura!",
      body: "Your 'liked' list is empty! Head to Discover and start finding profiles that resonate with your AURA."
    }
  };
  const message = emptyStateMessages[activePage] || emptyStateMessages.likesMe;
  return (
    <h2 style={styles.sectionTitle}>
      {message.title}<br />{message.body}
    </h2>
  );
};

const capitalizeFirst = (s) => {
  if (!s || typeof s !== 'string') return '';
  const t = s.trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const LikedMePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null); // Authenticated user ID
  const [isPremium, setIsPremium] = useState(false); // Initialize isPremium state
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Initialize userId from localStorage (minimal change, preserves structure)
  useEffect(() => {
    const idRaw = localStorage.getItem('current_user_id');
    const parsedId = idRaw ? Number(idRaw) : null;
    setUserId(parsedId);
  }, []);

  // NEW: Effect to check for premium status from backend or navigation state
  useEffect(() => {
    const fetchCurrentUserPremiumStatus = async () => {
      try {
        const { data: userData } = await api.get(`/users/${userId}`);
        setIsPremium(userData.is_premium);
        localStorage.setItem('isPremiumUser', userData.is_premium.toString());
      } catch (error) {
        console.error('Error fetching current user premium status:', error);
        const storedPremiumStatus = localStorage.getItem('isPremiumUser');
        setIsPremium(storedPremiumStatus === 'true');
      }
    };

    if (userId) {
      fetchCurrentUserPremiumStatus();
    }
  }, [userId]);

  useEffect(() => {
    if (location.state && typeof location.state.isPremiumUser === 'boolean') {
      setIsPremium(location.state.isPremiumUser);
      localStorage.setItem('isPremiumUser', location.state.isPremiumUser.toString());
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleShowPremiumPay = () => {
    navigate('/premium');
  };

  const getActivePage = () => {
    if (location.pathname === '/likes-me') {
      return 'likesMe';
    }
    if (location.pathname === '/my-likes') {
      return 'myLikes';
    }
    return '';
  };

  const handlePageChange = (pageName) => {
    if (pageName === 'likesMe') {
      navigate('/likes-me');
    } else if (pageName === 'myLikes') {
      navigate('/my-likes');
    }
  };

  const activePage = getActivePage();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // SWR-style data fetching with caching
  const fetchLikesMeData = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check cache first (SWR pattern)
    if (!forceRefresh) {
      const cached = getCachedLikesMe();
      if (cached?.data) {
        // Show cached data immediately
        setProfiles(sortNewestFirst(cached.data));
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

    setError(null);
    try {
      const { data } = await api.get(`/likes/me/likes-me`, {
        params: { user_id: userId }
      });
      const list = Array.isArray(data) ? data : [];
      const sortedList = sortNewestFirst(list);
      setProfiles(sortedList);

      // Cache the fresh data
      setCachedLikesMe(list);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      console.error('Error fetching likes me data:', err);
      // Only show error if we don't have cached data
      if (!getCachedLikesMe()?.data) {
        setError(err.response?.data?.detail || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLikesMeData();
  }, [fetchLikesMeData]);

  const styles = {
    body: {
      fontFamily: "'Josefin Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      backgroundColor: COLORS.backgroundLight,
      color: COLORS.textLight,
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    },
    container: {
      maxWidth: '448px',
      margin: '0 auto',
      padding: '0 16px 160px',
      position: 'relative',
      height: '100%',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    },
    header: {
      display: 'flex',
      justifyContent: 'centre',
      alignItems: 'center',
      padding: '16px 0',
      paddingLeft: '8px'
    },
    logo: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: COLORS.primary
    },
    main: {
      marginTop: '16px'
    },
    tabs: {
      display: 'flex',
      gap: '32px',
      justifyContent: 'center',
      marginBottom: '16px'
    },
    tab: {
      background: 'none',
      border: 'none',
      fontWeight: 'bold',
      fontSize: '16px',
      cursor: 'pointer',
      paddingBottom: '8px',
      borderBottom: '2px solid transparent',
      color: COLORS.grayLight,
      transition: 'all 0.3s' ,
      fontFamily: 'inherit',
    },
    tabActive: {
      color: COLORS.selected,
      borderBottomColor: COLORS.selected
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '400',
      marginBottom: '30px',
      color: '#666666',
      textAlign: 'center',
      fontStyle: 'italic'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px'
    },
    card: {
      position: 'relative',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      backgroundColor: COLORS.cardLight,
      height: '192px'
    },
    cardImage: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '80px',
      backgroundColor: '#F3F4F6',
      filter: isPremium ? 'none' : 'blur(8px)',
      transition: 'filter 0.3s ease',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    },
    profileImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    overlay: {
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.2)'
    },
    verifiedBadge: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      backgroundColor: COLORS.blue,
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '14px'
    },
    cardInfo: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      padding: '8px',
      color: 'white',
      width: '100%'
    },
    cardInfoText: {
      fontSize: '14px',
      fontWeight: '600',
      margin: 0
    },
    footer: {
      position: 'fixed',
      bottom: '120px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '416px',
      padding: '16px',
      zIndex: 99,
      boxSizing: 'border-box',
    },
    button: {
      width: '100%',
      color: 'white',
      fontWeight: 'bold',
      padding: '12px 0',
      borderRadius: '12px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      boxShadow: isButtonHovered
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 15px 3px rgba(255, 255, 255, 0.7)'
        : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 10px 2px rgba(255, 255, 255, 0.5)',
      transition: 'background-color 0.3s, box-shadow 0.3s',
      fontFamily: 'inherit',
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '200px',
      fontSize: '16px',
      color: COLORS.textLight
    }
  };

  // Navigate to Discover page for a specific user when premium
  const handleProfileClick = (profile) => {
    const targetId = profile?.user_id ?? profile?.id ?? profile?.profile_id;
    if (!targetId) return;
    if (isPremium) {
      navigate(`/discover/${targetId}`);
    } else {
      // Non-premium users get redirected to premium upsell
      navigate('/premium', { state: { from: location.pathname } });
    }
  };

  if (loading) {
    return <HeartLoader overlay />;
  }

  if (error) {
    return (
      <div style={styles.body}>
        <div style={styles.container}>
          <div style={{ ...styles.loadingContainer, color: 'red' }}>Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={{ ...styles.logo, display: 'flex', alignItems: 'center', gap: '8px', color: '#000000' }}>
            <span style={{ display: 'flex', alignItems: 'center', marginTop: '-6px' /* Adjust this value */ }}>
            <FiHeart size={24} color="#000000" />
            </span>
          Likes
      </h1>
        </header>

        <main style={styles.main}>
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(activePage === 'likesMe' ? styles.tabActive : {})
              }}
              onClick={() => handlePageChange('likesMe')}
            >
              Likes Me
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activePage === 'myLikes' ? styles.tabActive : {})
              }}
              onClick={() => handlePageChange('myLikes')}
            >
              My Likes
            </button>
          </div>

          <div>
            {profiles.length === 0 ? (
              <EmptyState activePage={activePage} styles={styles} />
            ) : (
              <>
                <h2 style={styles.sectionTitle}>What are you waiting for? Make first the move...</h2>
                <div style={styles.grid}>
                  {profiles.map((profile) => (
                    <div key={profile.id} style={{ ...styles.card, cursor: 'pointer' }} onClick={() => handleProfileClick(profile)}>
                      <div
                        style={{
                          ...styles.cardImage,
                          backgroundImage: `url(${toFullImageUrl(profile.profile_picture_url) || 'https://placehold.co/300x300?text=No+Image'})`
                        }}
                      >
                      </div>
                      <div style={styles.overlay}></div>

                      

                      <div style={styles.cardInfo}>
                        <p style={styles.cardInfoText}>
                          {capitalizeFirst(profile.nickname)}, {profile.age}
                          {profile.verified && (
                            <CheckCircle
                              style={{ color: 'white', fill: '#00D1FF', width: '18px', height: '18px', marginLeft: '4px', position: 'relative', top: '2px' }}
                            />
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>

        {!isPremium && ( // Only show the button if not premium
          <div style={styles.footer}>
            <button
              style={{
                ...styles.button,
                backgroundColor: isButtonHovered ? COLORS.accent1 : COLORS.selected,
              }}
              onClick={handleShowPremiumPay}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
            >
              SEE WHO LIKES YOU
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default LikedMePage;