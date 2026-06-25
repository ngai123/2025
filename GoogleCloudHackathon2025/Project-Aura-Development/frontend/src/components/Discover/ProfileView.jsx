import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { BASE_URL } from "../../api/axios";
import { FiX } from 'react-icons/fi';
import RoundedImage from '../common/RoundedImage.jsx';
import CompatibilityCard from './CompatibilityCard.jsx';
import { compatibilityService } from '../../api/services';

// --- Lucide Icons ---
import {
    Heart,
    CheckCircle,
    ChevronLeft,
    Flag
} from "lucide-react";

// --- Custom Styles (CSS) ---
import './DatingAppScreen.css';
import HeartLoader from '../common/HeartLoader.jsx';

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

const ProfileView = () => {
    const [isDarkMode] = useState(false);
    const navigate = useNavigate();
    const { userId } = useParams();

    const [currentProfile, setCurrentProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Compatibility insights state
    const [compatibility, setCompatibility] = useState(null);
    const [compatibilityLoading, setCompatibilityLoading] = useState(false);
    const [compatibilityError, setCompatibilityError] = useState(null);

    // Get current user ID from localStorage
    const currentUserId = localStorage.getItem('userId');

    const API_BASE = `${BASE_URL}`;

    const handleReport = (uid) => {
        // Navigate to the Report page with context.
        navigate('/report', { state: { reportedUserId: uid } });
    };

    const handleBack = () => {
        navigate(-1); // Go back to previous page (Chat)
    };

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const urlToFetch = `${API_BASE}/matches/profile/${userId}`;

            const res = await fetch(urlToFetch);

            if (!res.ok) {
                throw new Error(`Failed to fetch profile: Status ${res.status}`);
            }

            const data = await res.json();
            setCurrentProfile(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchProfile();
        }
    }, [userId]);

    // Fetch compatibility insights when profile is loaded
    useEffect(() => {
        const fetchCompatibility = async () => {
            // Only fetch if we have both user IDs and they're different
            if (!currentUserId || !userId || currentUserId === userId) {
                return;
            }

            setCompatibilityLoading(true);
            setCompatibilityError(null);

            try {
                const data = await compatibilityService.getCompatibilitySummary(
                    parseInt(currentUserId),
                    parseInt(userId)
                );
                setCompatibility(data);
            } catch (err) {
                console.error('Failed to fetch compatibility:', err);
                setCompatibilityError(err.message || 'Failed to load compatibility insights');
            } finally {
                setCompatibilityLoading(false);
            }
        };

        if (currentProfile && currentUserId) {
            fetchCompatibility();
        }
    }, [currentProfile, currentUserId, userId]);

    const full_name = currentProfile?.full_name ?? '';
    const fullName = `${full_name}`.trim();
    let limit_char = 15;

    // Split the full name into words based on spaces
    const words = fullName.split(/\s+/);
    const firstWord = words.length > 0 ? words[0] : '';

    // Truncate the first word if it's longer than the limit
    const displayableName = firstWord.length > limit_char
        ? `${firstWord.substring(0, limit_char)}...`
        : firstWord;

    // Loader handled here after hooks are defined
    if (loading) return <HeartLoader overlay />;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!currentProfile) return (
      <div className="p-8 text-center">
        <p className="mb-4">Profile not found.</p>
        <button
            className="px-3 py-2 rounded bg-gray-200"
            onClick={handleBack}
        >
            Go Back
        </button>
      </div>
    );

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
            "question": prompt ? prompt.question : null,
            "answer": prompt ? prompt.answer : null,
            "image": imageUrl ? imageUrl : null
        });
    }

    return (
        <>
            <div className={`profile-body ${isDarkMode ? 'dark' : ''}`}>
                <div className="relative">
                    {/* Header with back button */}
                    <header className="profile-header w-full z-10 flex justify-between items-center py-2">
                        <button onClick={handleBack} aria-label="Go back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                            <ChevronLeft
                                className="discover-header-icon"
                                style={{
                                    color: isDarkMode ? "var(--text-primary-dark)" : "var(--text-primary-light)",
                                    width: '28px',
                                    height: '28px'
                                }}
                            />
                        </button>
                        <span className="discover-header-title">Profile</span>
                        <div style={{ width: '28px' }}></div> {/* Spacer for centering */}
                    </header>

                    <main className="pb-12 relative" style={{ width: '100%', marginBottom: '100px' }}>
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
                                <div className="p-4 flex flex-col justify-start h-full">
                                    {/* Row 1: Top Bar (Name, Share) */}
                                    <div className="flex justify-between items-start w-full">
                                        {/* Name, Age, Verified Icon */}
                                        <div className="flex flex-col">
                                            <div className="name-age flex items-center gap-2" style={{ position: 'static' }}>
                                                <h1 className="text-3xl font-bold">
                                                   {displayableName}, {currentProfile.age}
                                                </h1>
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
                                            </div>

                                            {/* Goal Tag */}
                                            <div className="goal-tag-image text-sm font-semibold mt-2">
                                                <Heart style={{ color: 'var(--accent-red)', fill: 'var(--accent-red)' }} className="icon-small" />
                                                <span>{currentProfile.my_goal_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profile Details Sections */}
                        <div className="space-y-6">
                            {/* Compatibility Insights - Only show if viewing someone else's profile */}
                            {currentUserId && currentUserId !== userId && (
                                <CompatibilityCard
                                    summary={compatibility?.summary}
                                    sharedInterests={compatibility?.shared_interests || []}
                                    highlights={compatibility?.compatibility_highlights || []}
                                    sameGoal={compatibility?.same_goal || false}
                                    loading={compatibilityLoading}
                                    error={compatibilityError}
                                />
                            )}

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
                                            {currentProfile.interests.map((interest, index) => {
                                                const isDogs = '';

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`basic-chip ${isDogs ? "interest-chip-highlight" : ""}`}
                                                    >
                                                        <span className="material-icons-outlined">
                                                            {interest.icon}
                                                        </span>
                                                        <span>{interest.name}</span>
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

                           {combinedData && combinedData.length > 0 && (
                            <div className="card">
                                <div className="card-details">
                                    <h2 className="font-bold text-lg mb-4">Get to Know Me</h2>
                                    <div className="space-y-4">
                                        {combinedData.map((item, index) => (
                                            <div key={index} className="prompt-item">

                                                {item.image && (
                                                    <RoundedImage
                                                        src={toFullImageUrl(item.image)}
                                                        alt={`${currentProfile.name} photo ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}

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
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default ProfileView;
