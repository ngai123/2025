import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import MatchAnimation from "../Match/MatchAnimation.jsx";
import PreferenceFilter from "./PreferenceFilter";
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from "../../api/axios";
import { FiHome } from 'react-icons/fi';
import RoundedImage from '../common/RoundedImage.jsx';
import { useSocket } from '../../hooks/useSocket';
import dislikeGif from '../../assets/AURA-Champions_dislike.gif';
import likeGif from '../../assets/AURA-Champions_like.gif';
import CompatibilityCard from './CompatibilityCard.jsx';
import { compatibilityService } from '../../api/services';
import matchService from '../../api/services/matchService';

// --- Lucide Icons ---
import {
    Heart,
    SlidersHorizontal,
    Share2,
    Pin,
    Globe,
    HelpCircle,
    Venus,
    Ruler,
    Scale,
    Crosshair,
    Leaf,
    Cake,
    School,
    User,
    Baby,
    Cigarette,
    WineOff,
    PawPrint,
    Mars,
    CheckCircle,
    X,
    XCircle,
    Compass,
    Star,
    Shield,
    Flag,
    MessageCircle,
    RefreshCw
} from "lucide-react";


// --- Custom Styles (CSS) ---
import './DatingAppScreen.css';
import HeartLoader from '../common/HeartLoader.jsx';
//import profiles from './ProfileData';

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

const UserProfile = () => {
    const [isDarkMode] = useState(false); 
    const [showFilter, setShowFilter] = useState(false);

	const [isSwiping, setIsSwiping] = useState(false);

    const [matchData, setMatchData] = useState(null);
    const [nextProfile, setNextProfile] = useState(null);
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const MotionMain = motion.main;

    const navigate = useNavigate();

    // Fallback notification state
    const [fallbackActive, setFallbackActive] = useState(false);
    const [fallbackText, setFallbackText] = useState("");
    const [fallbackContext, setFallbackContext] = useState(null);
    const [noMatchAttempts, setNoMatchAttempts] = useState(0);
    const noMatchAttemptsRef = useRef(0); // Track attempts with ref to avoid stale closure

    const closeMatchPopup = () => {
        setMatchData(null);
    };

    // Inside UserProfile component
    const resetURLIfViewingSpecificProfile = () => {
        const currentPath = window.location.pathname;
        // Check if the path is in the format /discover/{id}
        if (currentPath.match(/\/discover\/[\w-]+/)) {
            console.log("Navigating back to /discover feed...");
            // Use `replace: true` so the user can't hit 'back' to see the old profile
            navigate('/discover', { replace: true });
        }
    };

    const socket = useSocket();

    const checkNewMatches = async () => {
        if(matchPopup) return; // Don't check if popup is already showns
        let userId = localStorage.getItem("current_user_id");
        try {
            // ----------------------------------------------------------------
            // 1. REPLACE THIS URL with your actual API endpoint
            const response = await fetch(`${BASE_URL}/matches/check_match2/${userId}`); 
            // ----------------------------------------------------------------

            if (!response.ok) {
                // Handle non-200 status codes
                console.error('API call failed with status:', response.status);
                setMatchData(null); // Ensure popup is closed on error
                return;
            }

            const data = await response.json();
            
            // 2. LOGIC TO CHECK FOR 'match' TYPE
            if (data && data.type === 'match') {
                // Match found: Load data and show the popup
                setMatchData(data);
            } else if (data && data.type === 'no_match') {
                // No match: Ensure the popup is closed
                setMatchData(null);
            } else {
                // Handle unexpected response format
                console.warn("Received unexpected API response type:", data.type);
                setMatchData(null);
            }
        } catch (error) {
            console.error("Error fetching match data:", error);
            setMatchData(null); // Ensure popup is closed on fetch failure
        }
    };

    // Listen for preferences updates and refetch a suggestion
    useEffect(() => {
        const handler = () => {
            fetchProfile(API_BASE);
        };
        window.addEventListener('preferences-updated', handler);
        return () => window.removeEventListener('preferences-updated', handler);
    }, []);

    // Reset filters to defaults and persist via API
    const resetFiltersToDefault = async () => {
        try {
            const userId = getCurrentUserId();
            const payload = {
                user_id: userId,
                min_age: 18,
                max_age: 60,
                prefers_verified_only: false,
                filter_by: {
                    from_age: 18,
                    to_age: 60,
                    gender: 'all',
                    bio_length_max: 500
                }
            };
            const setRes = await fetch(`${API_BASE}/matches/preferences/set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!setRes.ok) throw new Error('Failed to save default preferences');
            const confirmRes = await fetch(`${API_BASE}/matches/preferences/${userId}`);
            if (confirmRes.ok) {
                const confirmed = await confirmRes.json();
                const fb = confirmed?.filter_by || {};
                if (fb.from_age !== 18 || fb.to_age !== 60 || fb.gender !== 'all') {
                    console.warn('Server preferences differ from defaults', confirmed);
                }
            }
        } catch (e) {
            console.warn('Failed to reset filters to defaults', e);
        }
    };

    // Handle no-match or service unavailable by notifying and auto-recovering
    const handleNoMatches = async () => {
        // Use ref to get latest attempt count (avoids stale closure)
        const currentAttempts = noMatchAttemptsRef.current;

        if (currentAttempts >= 1) {
            // Already tried once - show exhausted state and DON'T auto-retry
            setFallbackText('Aura Exhausted\n\nWhoops! Looks like you swiped through everyone matching your filters. Time to widen your net or wait for a fresh batch');
            setFallbackContext('exhausted');
            setFallbackActive(true);
            return;
        }

        // First attempt - increment counter and try resetting filters
        noMatchAttemptsRef.current = currentAttempts + 1;
        setNoMatchAttempts(prev => prev + 1); // Also update state for UI if needed

        setFallbackText('No matches found for your filters. Resetting to the Discover feed…');
        setFallbackContext('reset');
        setFallbackActive(true);

        setTimeout(async () => {
            try {
                await resetFiltersToDefault();
                resetURLIfViewingSpecificProfile();
                setFallbackActive(false);

                // Fetch with a small delay to ensure state is settled
                await fetchProfile(API_BASE);
            } catch (err) {
                console.error('Error during filter reset recovery:', err);
                // If fetch fails, handleNoMatches will be called again
                // but noMatchAttemptsRef.current is now 1, so it will show exhausted
            }
        }, 3000);
    };

    // --- New: Transforms for "Like" and "Nope" opacity and scale ---
    const likeOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]); // Fades in as x moves right
    const nopeOpacity = useTransform(x, [0, -50, -100], [0, 0.5, 1]); // Fades in as x moves left

    // Optional: Add a slight scale effect
    const likeScale = useTransform(x, [0, 50, 100], [0.8, 0.9, 1]);
    const nopeScale = useTransform(x, [0, -50, -100], [0.8, 0.9, 1]);

    // --- Mock Profile Data (Complete Data Sets) ---
    
    const [currentProfile, setCurrentProfile] = useState(null);
    const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

    // Compatibility insights state
    const [compatibility, setCompatibility] = useState(null);
    const [compatibilityLoading, setCompatibilityLoading] = useState(false);
    const [compatibilityError, setCompatibilityError] = useState(null);

    const [matchPopup, setMatchPopup] = useState(false);
    const [showVerifyGate, setShowVerifyGate] = useState(false);

    const toggleFilter = () => {
        setShowFilter((prev) => !prev);
    };

    // Loader return will be handled later after hooks to respect hooks order
	
    
	
	const STATUS_MAP = {
		'nope': "1",             // DONT_LIKE
		'like': "2",             // LIKE
		'block': "3",            // BLOCK
		'report_block': "4",     // REPORT_AND_BLOCK
		'super': "5"             // SUPERLIKE
	};
	
    const getCurrentUserId = () => {
		// 🚨 IMPORTANT: Replace 'user_id' if your actual localStorage key is different.
		//const userId = localStorage.getItem('user_id');
        let userId = localStorage.getItem("current_user_id");
		return userId ? parseInt(userId, 10) : null;
	};
	
	const API_BASE = `${BASE_URL}`;
    const API_URL = API_BASE+`/matches/suggest/${getCurrentUserId()}`;
	
	const sendSwipe = async (targetUserId, actionKey) => {
		const currentUserId = getCurrentUserId();
		if (!currentUserId) {
			console.error("User ID not found in local storage. Cannot send swipe.");
			return;
		}

		const status = STATUS_MAP[actionKey];
		if (!status) {
			console.error("Invalid swipe action key:", actionKey);
			return;
		}

		const payload = {
			liker_id: currentUserId,     // The current user performing the action
			liked_user_id: targetUserId, // The profile user being swiped on
			status: status,              // The numeric string code, e.g., "2" or "1"
		};
		
		console.log("Sending Swipe Payload:", payload);

        try {
            const res = await fetch(`${API_BASE}/matches/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            
            if (!res.ok) {
                if (res.status === 500 && actionKey === 'like') {
                    setFallbackText('Like Registered! (Glitch Alert)');
                    setFallbackContext('like_action_cta');
                    setFallbackActive(true);
                    setTimeout(() => setFallbackActive(false), 5000);
                } else {
                    setFallbackText(`Failed to send swipe: ${res.statusText}`);
                    setFallbackContext('error');
                    setFallbackActive(true);
                    setTimeout(() => setFallbackActive(false), 2500);
                }
                throw new Error(`Failed to send swipe: ${res.statusText}`);
            }
			const data = await res.json();
			console.log("Swipe recorded:", data);

            // 🚨 NEW LOGIC: Check for a Match!
            if (data.type === 'match' || data.type === 'match1') {
                setMatchData(data);
                setMatchPopup(true);
            }
            
        } catch (err) {
            console.error("Error sending swipe:", err);
            setFallbackText('Failed to send swipe: Internal Server Error');
            setFallbackActive(true);
            setTimeout(() => setFallbackActive(false), 2500);
        }
        };

	// --- useEffect for API Polling ---
    useEffect(() => {
        if (!socket) return;
        const onMatch = (data) => {
            const currentId = getCurrentUserId();
            const isParty = data?.user1?.id === currentId || data?.user2?.id === currentId;
            if (!isParty) return;
            setMatchData(data);
            setMatchPopup(true);
        };
        socket.on('match_created', onMatch);
        return () => socket.off('match_created', onMatch);
    }, [socket]);

    useEffect(() => {
        // Run the check immediately on mount
        checkNewMatches(); 
        
        // Set up the interval (30000ms = 30 seconds)
        const intervalId = setInterval(() => {
            checkNewMatches();
        }, 30000); // 30 seconds

        // Cleanup function: Clear the interval when the component unmounts
        return () => clearInterval(intervalId);
    }, []); // Empty dependency array: runs once on mount and cleans up on unmount

    // ... (inside UserProfile component)

    const fetchProfile = async (API_BASE_URL = API_BASE) => {
        let urlToFetch = API_BASE_URL;

        // 1. Get the current path from the URL
        const currentPath = window.location.pathname;

        // 2. Define the regex to find '/discover/{id}'
        const discoverRegex = /\/discover\/([\w-]+)/;
        const match = currentPath.match(discoverRegex);

        // 3. Check if an ID was found in the path
        if (match && match[1]) {
            const id = match[1];
            // 4. Construct the new URL for fetching the profile
            urlToFetch = `${API_BASE_URL}/matches/profile/${id}`;
        } else {
            // Use the default URL defined earlier, which includes the user ID for suggestions
            urlToFetch = `${API_BASE_URL}/matches/suggest/${getCurrentUserId()}`;
            console.log("No ID found in /discover/{id} format. Using default suggestion URL.");
        }

        try {
            setLoading(true);

            // Use the constructed URL
            const res = await fetch(urlToFetch);

            if (!res.ok) {
                // Treat 404 (no candidates) and 503 (service hiccup) as no-match for UX
                if (res.status === 404 || res.status === 503) {
                    setCurrentProfile(null);
                    await handleNoMatches();
                    return;
                }
                throw new Error(`Failed to fetch profile: Status ${res.status}`);
            }

            const data = await res.json();
            setCurrentProfile(data);

            // Success! Reset the no-match attempts counter since we found a profile
            noMatchAttemptsRef.current = 0;
            setNoMatchAttempts(0);

            // Prefetch next profile for background display (suggested feed)
            try {
                const nextRes = await fetch(`${API_BASE}/matches/suggest/${getCurrentUserId()}`);
                if (nextRes.ok) {
                    const nextData = await nextRes.json();
                    setNextProfile(nextData);
                }
            } catch (e) {
                // Non-fatal: background prefetch may fail
                console.debug('Next profile prefetch failed', e);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

// **Note:** You will need to define or pass in the API_BASE_URL, 
// setLoading, setError, and setCurrentProfile functions/state setters.
	
const didFetch = useRef(false);

useEffect(() => {
  if (didFetch.current) return;
  didFetch.current = true;

  fetchProfile(API_BASE);
}, []);

// Fetch compatibility insights when profile changes
useEffect(() => {
    const fetchCompatibility = async () => {
        const currentUserId = getCurrentUserId();
        const targetUserId = currentProfile?.user_id;

        // Only fetch if we have both user IDs and they're different
        if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
            return;
        }

        setCompatibilityLoading(true);
        setCompatibilityError(null);

        try {
            const data = await compatibilityService.getCompatibilitySummary(
                currentUserId,
                targetUserId
            );
            setCompatibility(data);
        } catch (err) {
            console.error('Failed to fetch compatibility:', err);
            setCompatibilityError(err.message || 'Failed to load compatibility insights');
        } finally {
            setCompatibilityLoading(false);
        }
    };

    if (currentProfile) {
        fetchCompatibility();
    }
}, [currentProfile]);
	
	const [offsetY, setOffsetY] = useState(window.innerHeight / 2);

    useEffect(() => {
		const handleScroll = () => {
			const scrollY = window.scrollY;
			const viewportHeight = window.innerHeight;
			setOffsetY(scrollY + viewportHeight / 2); // 👈 keep it at center as you scroll
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
    }, []);
	
    const full_name=currentProfile?.full_name ?? '';

   const fullName = `${full_name}`.trim();
let limit_char = 15;

// 1. Split the full name into words based on spaces
const words = fullName.split(/\s+/);

// 2. Get the first word (or an empty string if the name was empty/just spaces)
const firstWord = words.length > 0 ? words[0] : '';

// 3. Truncate the first word if it's longer than the limit
const displayableName = firstWord.length > limit_char
    ? `${firstWord.substring(0, limit_char)}...`
    : firstWord;

    // Loader handled here after hooks are defined
        if (fallbackActive) {
          return (
            <AnimatePresence>
              <motion.div
                className="fallback-overlay josefin-sans-uniquifier"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <motion.div
                  className="fallback-card"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <motion.div
                    className="fallback-icon"
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                  >
                    <Compass size={44} />
                  </motion.div>
                  <div className="fallback-text">
                    {fallbackText || 'No matches found. Try widening Age range, Bio length, or Relationship status.'}
                  </div>
                  {fallbackContext === 'reset' && (
                    <div className="fallback-subtext">Heading back to Discover with refreshed filters…</div>
                  )}
                  {fallbackContext === 'exhausted' && (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                      <button
                        style={{
                          padding: '12px 20px',
                          border: 'none',
                          borderRadius: '20px',
                          background: '#FF7F7F',
                          color: 'white',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        onClick={async () => {
                          try {
                            setLoading(true);
                            const userId = localStorage.getItem('user_id');
                            await matchService.resetSeenProfiles(userId);
                            noMatchAttemptsRef.current = 0;
                            setNoMatchAttempts(0);
                            setFallbackActive(false);
                            await fetchProfile(API_BASE);
                          } catch (err) {
                            console.error('Failed to reset seen profiles:', err);
                            setFallbackText('Failed to reset profiles. Please try again.');
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        <RefreshCw size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                        Reset & See All Profiles
                      </button>
                      <button
                        style={{
                          padding: '12px 20px',
                          border: 'none',
                          borderRadius: '20px',
                          background: '#6B7280',
                          color: 'white',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        onClick={() => {
                          setFallbackActive(false);
                          setShowFilter(true);
                        }}
                      >
                        <SlidersHorizontal size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                        Adjust Filters
                      </button>
                      <button
                        style={{
                          padding: '12px 20px',
                          border: '1px solid #ccc',
                          borderRadius: '20px',
                          background: 'white',
                          color: '#333',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        onClick={() => {
                          // Reset attempts and try again
                          noMatchAttemptsRef.current = 0;
                          setNoMatchAttempts(0);
                          setFallbackActive(false);
                          fetchProfile(API_BASE);
                        }}
                      >
                        Try Again Later
                      </button>
                    </div>
                  )}
                  {fallbackContext === 'like_action_cta' && (
                    <>
                      <div className="fallback-subtext">We registered your like, but ran into a small error processing the match. Head to your 'Likes Me' page to confirm they're there!</div>
                      <button
                        style={{
                          marginTop: '12px',
                          padding: '10px 16px',
                          border: 'none',
                          borderRadius: '18px',
                          background: '#FF7F7F',
                          color: 'white',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        onClick={() => { setFallbackActive(false); navigate('/likes-me'); }}
                      >
                        Go to Likes Me Page
                      </button>
                    </>
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          );
        }
    if (loading) return <HeartLoader overlay />;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!currentProfile) return (
      <div className="p-8 text-center">
        <p className="mb-4">No matches found with your current filters.</p>
        <div className="flex items-center justify-center gap-3">
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white"
            onClick={toggleFilter}
          >
            Adjust Filters
          </button>
          <button
            className="px-3 py-2 rounded bg-gray-200"
            onClick={() => fetchProfile(API_BASE)}
          >
            Try Again
          </button>
        </div>
      </div>
    );

    //const currentProfile = profiles[profileIndex % profiles.length]; // Loop through profiles for demo

	const flyCardOff = (exitX) => { // ❌ Remove 'async'
	  setIsSwiping(true); // Use this to lock buttons/drag immediately
console.log("flyCardOff");
	  // Move card off-screen and add onComplete callback
	  animate(x, exitX, { 
		type: "tween", 
		duration: 0.3,
		onComplete: () => { // ✅ Logic executes AFTER animation completes
            resetURLIfViewingSpecificProfile();
		  fetchProfile(API_BASE).finally(() => { // ✅ Fetch new profile
			x.set(0); // Reset card position
			setIsSwiping(false); // ✅ Unlock buttons/drag

            
		  });
		} 
	  });
	};

	
    const handleReport = (uid) => {
        // Navigate to the Report page with context.
        // Pass the reported user's ID so Report flow knows the target.
        navigate('/report', { state: { reportedUserId: uid } });
    };
	
	// Also remove the awaits in handleDragEnd for flyCardOff
	const handleDragEnd = (event, info) => { // ❌ Remove 'async'
	  if (isSwiping) return;
	  const offset = info.offset.x;
	  // ... (rest of drag logic)
	  if (offset > 100) {
		sendSwipe(currentProfile.user_id, "like");
		flyCardOff(400); // ❌ No 'await'
	  } else if (offset < -100) {
		sendSwipe(currentProfile.user_id, "nope");
		flyCardOff(-400); // ❌ No 'await'
	  } else {
		// Snap back and hide background preview
		animate(x, 0, { type: 'spring', stiffness: 500, damping: 50 });
		setIsSwiping(false);
	  }
	};

	
	// Also modify handleButtonClick to not await flyCardOff
	const handleButtonClick = (actionKey) => { // ❌ Remove 'async'
	  if (isSwiping || !currentProfile) return;

	  sendSwipe(currentProfile.user_id, actionKey); // Fire and forget the swipe

	  // Determine exit direction and fly card off, which now handles the fetch/reset
	  if (actionKey === 'like') {
		flyCardOff(400); // right
	  } else if (actionKey === 'nope') {
		flyCardOff(-400); // left
      } else if (actionKey === 'super') {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
          console.error('Cannot super-like: missing current user id');
          return;
        }
        handleSuperlike(currentUserId, currentProfile.user_id);
        flyCardOff(400);
      }
	};


    async function handleSuperlike(likerId, likedId) {
        console.log(likerId, likedId);
        try {
            const res = await fetch(`${BASE_URL}/matches/superlike/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                liker_id: likerId,
                liked_id: likedId,
            }),
            });

            const data = await res.json();

            if (data.result === "chat") {
            // Redirect to chatroom with the session ID
            window.location.href = `/chat/${data.session}`;
            } else if (data.result === false) {
            try {
                const storedUser = localStorage.getItem("user");
                const userObj = storedUser ? JSON.parse(storedUser) : null;
                const uid = userObj?.id;
                if (!uid) {
                    setShowVerifyGate(true);
                } else {
                    const userRes = await fetch(`${BASE_URL}/users/${uid}`);
                    const userData = await userRes.json();
                    const isVerified = !!(userData?.is_verified);
                    if (isVerified) {
                        window.location.href = "/premium";
                    } else {
                        setShowVerifyGate(true);
                    }
                }
            } catch (e) {
                setShowVerifyGate(true);
            }
            } else {
            console.warn("Unexpected API response:", data);
            }
        } catch (error) {
            console.error("Error while creating chat session:", error);
        }
    }

    // Removed unreachable duplicate empty-state block that referenced undefined setProfileIndex.

const maxRelevantLength = Math.max(
    currentProfile.prompts.length, 
    currentProfile.images.length - 1 // Account for the skipped image at index 0
);

const combinedData = [];

for (let i = 0; i < maxRelevantLength; i++) {
    // Determine the array indices
    const promptIndex = i;
    const imageIndex = i + 1; // Used for fetching from currentProfile.images

    // Safely retrieve the prompt and image data
    const prompt = currentProfile.prompts[promptIndex];
    const imageUrl = currentProfile.images[imageIndex];

    // Create the new combined object
    combinedData.push({
        // If the prompt exists, use its data; otherwise, use null/empty strings
        "question": prompt ? prompt.question : null,
        "answer": prompt ? prompt.answer : null,
        
        // If the image exists, use its URL; otherwise, use null
        "image": imageUrl ? imageUrl : null
    });
}

    return (
        <>
            
            <div className={`profile-body ${isDarkMode ? 'dark' : ''}`}>
                
                <div className="relative">

                    <header className="profile-header">
                        <div className="w-full flex justify-between items-center py-2">
                            <div className="flex items-center" style={{ gap: '6px' }}>
                              <FiHome className="discover-header-icon" style={{ color: isDarkMode ? "var(--text-primary-dark)" : "var(--text-primary-light)" }} />
                              <span className="discover-header-title">Discover</span>
                            </div>
                            <button
                              aria-label="Settings"
                              onClick={toggleFilter}
                              style={{ color: isDarkMode ? "var(--text-primary-dark)" : "var(--text-primary-light)" }}
                            >
                              <SlidersHorizontal
                                className="discover-header-icon"
                                style={{
                                  color: isDarkMode
                                    ? "var(--text-primary-dark)"
                                    : "var(--text-primary-light)",
                                }}
                              />
                            </button>
                        </div>
                    </header>

                    <PreferenceFilter 
                      show={showFilter} 
                      onClose={() => setShowFilter(false)}
                      userId={(typeof window !== 'undefined') ? (parseInt(localStorage.getItem('current_user_id') || '0', 10) || null) : null}
                    />
					
                    {/* Background next profile image (only when swiping) */}
                    {isSwiping && nextProfile && (
                        <div className="background-preview opacity-60">
                            <RoundedImage
                                src={
                                    nextProfile.images && nextProfile.images.length > 0 && nextProfile.images[0]
                                        ? toFullImageUrl(nextProfile.images[0])
                                        : '/src/image/logo.png'
                                }
                                alt={`Next profile preview`}
                                className="w-full h-full object-cover rounded-image"
                                style={{ filter: 'blur(14px)' }}
                            />
                        </div>
                    )}

                    <MotionMain
                        key={currentProfile.user_id}
                        className="pb-12 relative" 
                        drag="x" 
                        dragConstraints={{ left: 0, right: 0 }} 
                        dragElastic={0.8}
                        onDragEnd={handleDragEnd}
                        style={{ 
                            x, 
                            rotate, 
                            cursor: 'grab', 
                            touchAction: 'pan-y',
                            position: 'relative', 
                            zIndex: 5,
                            width: '100%',
							marginBottom:'100px'
                        }}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                        {/* --- New: Like Overlay --- */}
                        <motion.div 
                            className="swipe-overlay2 like"
                            style={{
                                top: '10%',          // 👈 dynamic top value
                                left: '-85%',
                                position: 'absolute',  // or 'fixed' if you want it locked in viewport
                                transform: 'translate(-50%, -50%)',
                                x,                     // your existing swipe motion
                                rotate,
                                opacity: likeOpacity, 
                                scale: likeScale,
                                border: 'none',
                                background: 'transparent',
                                padding: 0
                            }}
                        >
                            <img src={likeGif} alt="Like" className="overlay-gif" />
                        </motion.div>

                        {/* --- New: Nope Overlay --- */}
                        <motion.div 
                            className="swipe-overlay nope"
                            style={{ 
                                top: '10%',
                                left: '30%',
                                position: 'absolute',
                                transform: 'translate(-50%, -50%)',
                                x,
                                rotate,
                                opacity: nopeOpacity,
                                scale: nopeScale,
                                border: 'none',
                                background: 'transparent',
                                padding: 0
                            }}
                        >
                            <img src={dislikeGif} alt="Dislike" className="overlay-gif" />
                        </motion.div>

                        {/* Profile Image and Overlays */}
                       <div className="relative profile-img-container">
                            <RoundedImage
                                className="profile-img"
                                alt={`Profile picture of ${currentProfile.name}`}
                                src={
                                    currentProfile.images && currentProfile.images.length > 0 && currentProfile.images[0]
                                        ? toFullImageUrl(currentProfile.images[0])
                                        : '/src/image/logo.png'
                                }
                            />
                            <div className="absolute inset-0 profile-img-overlay">
                                
                                {/* ---------------------------------------------------- */}
                                {/* UPDATED TOP INFO BLOCK (Name, Age, Verified, Goal, Share) */}
                                {/* ---------------------------------------------------- */}
                                <div className="p-4 flex flex-col justify-start h-full">
                                    
                                    {/* Row 1: Top Bar (Name, Share) */}
                                    <div className="flex justify-between items-start w-full">
                                        
                                        {/* Name, Age, Verified Icon */}
                                        <div className="flex flex-col">
                                            <div className="name-age flex items-center gap-2" style={{ position: 'static' }}>
                                                <h1 className="text-3xl font-bold">
                                                   {displayableName}, {currentProfile.age}
                                                </h1>
                                                {(currentProfile?.is_verified || currentProfile?.verified_status === 'verified') && (
                                                  <CheckCircle 
                                                    className="icon" 
                                                    style={{ 
                                                      color: 'white', 
                                                      fill: '#00D1FF',
                                                      width: '18px', 
                                                      height: '18px',
                                                      marginLeft: '4px',
                                                    }}
                                                  />
                                                )}
                                            </div>

                                            {/* Goal Tag (Moved to be near the name) */}
                                            <div className="goal-tag-image text-sm font-semibold mt-2">
                                                <Heart style={{ color: 'var(--accent-red)', fill: 'var(--accent-red)' }} className="icon-small" />
                                                <span>{currentProfile.my_goal_name}</span>
                                            </div>
                                        </div>

                                    </div>
                                    
                                    {/* The bottom of the overlay remains empty, only showing the gradient */}
                                </div>
                                {/* ---------------------------------------------------- */}
                                
                            </div>
                        </div>

                        {/* Profile Details Sections */}
                        <div className="space-y-6">

                            {/* Compatibility Insights */}
                            <CompatibilityCard
                                summary={compatibility?.summary}
                                sharedInterests={compatibility?.shared_interests || []}
                                highlights={compatibility?.compatibility_highlights || []}
                                sameGoal={compatibility?.same_goal || false}
                                loading={compatibilityLoading}
                                error={compatibilityError}
                            />

                            {/* My Goal */}
							<div className="card">
                                <div className="card-details">
                                    <h2 className="font-bold text-lg mb-3">My Goal</h2>
                                    <div className="goal-tag-card">
                                        <Heart className="icon" style={{ fill: 'var(--accent-red)' }} />
                                        <span>{currentProfile.my_goal_name}</span>
                                    </div>
                                </div>
							</div>
							
                            {currentProfile.about_me && (
                            <div className="card">
                                <div className="card-details">
                                    <h2 className="font-bold text-lg mb-3">About Me</h2>
                                    <p className="leading-relaxed">
                                        {currentProfile.about_me}
                                    </p>
                                    <p></p>
                                </div>
                            </div>
                            )}
                            
                            {/* My basics */}
                            <div className="card">
                                <div className="card-details">
                                    <h2 className="font-bold text-lg mb-4">My Basics</h2>
                                    <div className="chip-container">
                                        {currentProfile.education_name && (
                                            <div key="education-chip" className="basic-chip">
                                                <span className="material-icons-outlined">school</span>
                                                {currentProfile.education_name}
                                            </div>
                                        )}

                                        {currentProfile.employment_name && (
                                            <div key="employment-chip" className="basic-chip">
                                                <span className="material-icons-outlined">work</span>
                                                {currentProfile.employment_name}
                                            </div>
                                        )}

                                        {currentProfile.industry_name && (
                                            <div key="industry-chip" className="basic-chip">
                                                <span className="material-icons-outlined">business_center</span>
                                            {currentProfile.industry_name}
                                            </div>
                                        )}

                                        {currentProfile.my_goal_name && (
                                            <div key="goal-chip" className="basic-chip">
                                            <span className="material-icons-outlined">flag</span>
                                            {currentProfile.relationship_status_name}
                                            </div>
                                        )}

                                        {currentProfile.height_cm && (
                                            <div key="height-chip" className="basic-chip">
                                                <span className="material-icons-outlined">height</span>
                                            {currentProfile.height_cm} cm
                                            </div>
                                        )}

                                        {currentProfile.zodiac && (
                                            <div key="zodiac-chip" className="basic-chip">
                                                <span className="material-icons-outlined">nights_stay</span>
                                            {currentProfile.zodiac}
                                            </div>
                                        )}

                                        {currentProfile.gender && (
                                            <div key="gender-chip" className="basic-chip">
                                                <span className="material-icons-outlined">person</span>
                                            {currentProfile.gender === 'male' ? 'Male' : 'Female'}
                                            </div>
                                        )}

                                        {/* Assuming relationship_id is a string or number */}
                                        {currentProfile.relationship_id && (
                                            <div key="relationship-chip" className="basic-chip">
                                                <span className="material-icons-outlined">favorite</span>
                                            {currentProfile.relationship_id === "1" ? 'Single' : 'In a relationship'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                           {/* My interests - only show if there are interests */}
{currentProfile.interests && currentProfile.interests.length > 0 && (
    <div className="card">
        <div className="card-details">
            <h2 className="font-bold text-lg mb-4">My Interests</h2>
            <div className="chip-container">
                {/* CHANGE: Map over the array of objects. 
                  The `interest` variable is now an object: { name: '...', icon: '...' }
                */}
                {currentProfile.interests.map((interest, index) => {
                    // CHANGE: Check against the interest.name property.
                    const isDogs = '';//interest.name.includes("Dogs"); 

                    return (
                        <div
                            key={index}
                            // Using interest.name for better context in case a chip-specific key is needed
                            // You may need to adjust the highlighting logic based on your icons/text.
                            // The original code used "🐶 Dogs", but the API result has no emoji.
                            className={`basic-chip ${isDogs ? "interest-chip-highlight" : ""}`}
                        >
                            {/* CHANGE: Display the name from the object: interest.name */}
                            <span className="material-icons-outlined">
                                {interest.icon}
                            </span>
                            <span>{interest.name}</span> 
                            {/* You could optionally display the icon as well: */}
                            {/* */}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
)}
								
								<div className="card">
                                    <div className="card-details">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div>
                                                <h3 className="font-semibold">My Location</h3>
                                                <p className="flex items-center gap-1 text-sm">
                                                    {currentProfile.come_from}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
								</div>
								
                                {currentProfile.languages && currentProfile.languages.length > 0 && (
								<div className="card">
                                    <div className="card-details">
                                        <div className="flex items-start gap-3">
                                            <div>
                                                <h3 className="font-semibold">Languages I know</h3>
                                                <div className="chip-container">
                                                    {currentProfile.languages.map((lang, index) => (
                                                        <div key={index} className="basic-chip">
                                                            {lang}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
								</div>
                                )}
                                
                               {combinedData && combinedData.length > 0 && ( // 1. Change check to combinedData
    <div className="card">
        <div className="card-details">
            <h2 className="font-bold text-lg mb-4">Get to Know Me</h2>
            <div className="space-y-4">
                {combinedData.map((item, index) => ( // 2. Change map source to combinedData
                    <div key={index} className="prompt-item">
                        
                        {/* Use item.image directly for the source */}
                        {item.image && (
                            <RoundedImage 
                                src={toFullImageUrl(item.image)} 
                                alt={`${currentProfile.name} photo ${index + 1}`} 
                                className="w-full h-full object-cover"
                            />
                        )}
                        
                        {/* Only show the question/answer if they exist */}
                        {item.question && (
                            <h3 className="font-semibold text-sm mb-2">
                                {item.question}
                            </h3>
                        )}
                        
                        {item.answer && (
                            <p className="leading-relaxed">
                                {item.answer}
                            </p>
                        )}
                        <br />
                    </div>
                ))}
            </div>
        </div>
    </div>
)}

                                <div className="card">
                                <div className="card-details">
                                        <div className="flex gap-4">
                                            <button 
                                                className="block-report-btn report-btn w-full"
                                                onClick={() => handleReport(currentProfile.user_id)}
                                            >
                                                <Flag className="icon-small" />
                                                <span style={{ marginLeft: '10px', fontFamily: "'Josefin Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Report & Block</span>
                                            </button>

                                            {matchData && (
                                                <MatchAnimation
                                                    user1={{ name: matchData?.user1?.username, avatar: matchData?.user1?.image_url }}
                                                    user2={{ name: matchData?.user2?.username, avatar: matchData?.user2?.image_url }}
                                                    onFirstMove={() => navigate('/chat')}
                                                    onClose={closeMatchPopup}
                                                />
                                            )}

                                        </div>
                                    </div>
									
                                    </div>
                        </div>
                    </MotionMain>
				
                {!matchData && <footer className="profile-footer">
                        <div className="w-full mx-auto flex justify-center items-center gap-6">
                            <button 
                                className="action-button nope"
                                aria-label="Nope"
                                onClick={() => handleButtonClick('nope')}
                                disabled={isSwiping} // <-- ADDED
                            >
                                <XCircle className="icon" />
                            </button>
                            
                            {/* Super Like Button */}
                            <button 
                                className="action-button super-like"
                                aria-label="Super Like"
                                onClick={() => handleButtonClick('super')}
                                disabled={isSwiping} // <-- ADDED
                            >
                                <MessageCircle className="icon" strokeWidth={1} />
                            </button>

                            {/* Like Button */}
							<button 
								className="action-button like"
								aria-label="Like"
								onClick={() => handleButtonClick('like')}
								disabled={isSwiping} // <-- ADDED
							>
								<Heart className="icon" style={{ color: 'var(--color-accent)',fill: 'var(--color-accent)' }} strokeWidth={1} />
							</button>
						</div>
					</footer>
					}

                </div>
                
            </div>
            {showVerifyGate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowVerifyGate(false)}>
                    <div style={{ background: '#FFFFFF', color: '#000', borderRadius: '12px', padding: '20px 24px', width: 'min(420px, 90vw)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button aria-label="Close" onClick={() => setShowVerifyGate(false)} style={{ position: 'absolute', top: '10px', left: '18px', background: 'transparent', border: 'none', fontSize: '20px', lineHeight: 1, cursor: 'pointer' }}>×</button>
<h3 style={{ fontSize: '18px', margin: 0, marginBottom: '16px', textAlign: 'center' }}>You have to be verified first to be a p<br />remium user.</h3>                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                            <button style={{ padding: '10px 14px', borderRadius: '8px', background: '#FF7F7F', color: '#fff' }} onClick={() => {}}>
                                Verify Here
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserProfile;