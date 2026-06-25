import React, { useState } from 'react';

// --- Color Palette and Configuration ---
const COLORS = {
    BG_PRIMARY: '#F9F4E2',   // Lightest background
    CARD_BG: '#FFFFFF',      // Card background
    TEXT_PRIMARY: '#333333', // Dark text for readability
    TEXT_SECONDARY: '#6B7280', // Muted text for secondary info
    ACCENT_RED: '#FF7F7F',   // Main accent color (e.g., icons, buttons)
    ACCENT_PINK_LIGHT: '#FFBEBE', // Light pink for badges/toggles
    ACCENT_PINK_MEDIUM: '#FFA0A0', // Medium pink for shadows/borders
    ACCENT_YELLOW: '#E2DDB4', // Muted yellow/beige for secondary UI elements
};

// Mock data for the profile
const mockProfile = {
    name: "Julia Angeli Geli",
    age: 23,
    location: "Kuala Lumpur", // Removed age from location for cleaner display
    profilePic: "https://placehold.co/100x100/FFBEBE/333?text=J", // Placeholder for user's profile picture
    mainImage: "https://placehold.co/400x500/E2DDB4/333?text=Main+Photo", // Placeholder for main image
    stats: {
        likesMe: 500,
        iLikes: 500,
        matches: 500,
    },
    about: "Avid hiker, amateur baker. Lover of early morning runs and late-night mamak sessions. Looking for someone to join me for a coffee and explore a new cafe this weekend.",
    personality: [
        { label: "Lovely", icon: "favorite" },
        { label: "Romance", icon: "heart_plus" },
        { label: "Adventurous", icon: "explore" },
        { label: "Intellectual", icon: "lightbulb" },
        { label: "Outgoing", icon: "groups" },
    ],
    preferences: [
        { type: "Relationship Type", value: "Long-Term", icon: "favorite" },
        { type: "Commitment Level", value: "Serious", icon: "calendar_month" },
        { type: "Future Plans", value: "Open to moving", icon: "map" },
        { type: "Communication Style", value: "Frequent texting", icon: "chat" },
    ],
    loveStyle: {
        brief: "Loyal, stable, and protective. Seeks harmony and deep emotional connection.",
        styleName: "Guardian (ISTJ)",
        icon: "shield",
    }
};

// Main component: ProfilePage
export default function ProfilePage({ onBack }) {
    const [showFullLoveStyle, setShowFullLoveStyle] = useState(false);

    const Tag = ({ label, icon }) => (
        <span className="profile-tag">
            {icon && <span className="material-symbols-outlined tag-icon">{icon}</span>}
            {label}
        </span>
    );

    // Updated PreferenceRow to accept a dynamic icon
    const PreferenceRow = ({ type, value, icon }) => (
        <div className="preference-row">
            <span className="material-symbols-outlined preference-icon">{icon || 'favorite'}</span>
            <span className="preference-type">{type}</span>
            <span className="preference-value">{value}</span>
        </div>
    );
    
    // New component for the Love Style section
    const LoveStyleSection = ({ loveStyle }) => (
        <div className="content-card love-style-card">
            <h2 className="card-title">
                Love Style <span className="material-symbols-outlined title-icon">favorite</span>
            </h2>
            
            <div className="love-style-brief">
                <span className="material-symbols-outlined love-style-icon">{loveStyle.icon}</span>
                <div className="style-text">
                    <p className="style-name">{loveStyle.styleName}</p>
                    <p className="style-description">{loveStyle.brief}</p>
                </div>
            </div>

            <div className={`full-style-details ${showFullLoveStyle ? 'visible' : ''}`}>
                <p>
                    This is the detailed information about the Guardian (ISTJ) love style. 
                    They prioritize security and commitment, preferring actions over flowery words. 
                    They show affection through acts of service and dependability. 
                    They thrive in relationships with clear expectations and mutual respect.
                </p>
                {/* You can add more structured data here */}
            </div>

            <button 
                className="view-more-button" 
                onClick={() => setShowFullLoveStyle(prev => !prev)}
            >
                <span className="material-symbols-outlined view-more-icon">
                    {showFullLoveStyle ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                </span>
                {showFullLoveStyle ? 'View Less' : 'View More'}
            </button>
        </div>
    );


    const styleSheet = `
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        * {
            box-sizing: border-box;
        }

        .profile-page-container {
            font-family: 'Josefin Sans', sans-serif;
            background-color: var(--color-bg-primary);
            min-height: 100dvh;
            padding: 0 16px; /* narrower gutters to widen content */
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            max-width: 440px; /* wider container to reduce side gaps */
            position: relative;
            padding-bottom: 80px;
            justify-content: flex-start;
            align-items: flex-start;
            color: var(--color-text-primary);
            font-size: 16px;
        }

        .profile-content {
            width: 100%;
            max-width: 100%; /* Let outer container control width */
            padding: 0; /* Use page container padding */
            padding-bottom: 50px;
            box-sizing: border-box;
        }

        /* --- Header & Main Image Section (UI/UX Improvement) --- */

        .hero-section {
            position: relative;
            /* Changed background to match image border or keep it neutral */
            background-color: var(--color-bg-secondary); 
            padding-bottom: 0; 
        }

        .main-image-container {
            width: 100%; /* Use full width */
            max-width: none;
            margin: 0;
            border-radius: 0;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            position: relative;
            /* Set a fixed aspect ratio for mobile view */
            height: 400px; 
        }
        
        .main-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        /* Removed unused action button styles */

        /* --- Profile Card Overlay --- */

        .profile-card-overlay {
            background-color: var(--color-bg-secondary);
            border-radius: 20px 20px 0 0; /* Only rounded top corners */
            padding: 20px;
            box-shadow: 0 -8px 20px rgba(0, 0, 0, 0.1);
            position: relative;
            margin-top: -30px; /* Pulls card up over the image */
            z-index: 5;
            width: 100%;
            box-sizing: border-box;
            /* keep content visually away from the max width edge */
            margin-left: 0;
            margin-right: 0;
        }

        .profile-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-top: 10px;
        }

        /* Profile Picture with Edit Icon */
        .profile-picture-wrapper {
            position: relative;
            margin-right: 15px;
        }

        .profile-picture {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 4px solid var(--color-bg-secondary);
            background-color: var(--color-bg-primary);
            object-fit: cover;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .edit-icon-btn {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: var(--color-accent);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--color-bg-secondary);
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        .edit-icon {
             font-size: 16px;
             font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20;
        }

        .verified-badge {
            position: absolute;
            top: 5px;
            left: 5px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: var(--color-accent);
            color: var(--color-bg-secondary);
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--color-bg-secondary);
        }

        .name-info {
            flex-grow: 1;
        }

        /* Name and Age Grouped */
        .name-title {
            font-size: 1.5rem;
            font-weight: 700;
            line-height: 1.1;
            margin: 0;
            color: var(--color-text-primary);
        }

        .location-text {
            display: flex;
            align-items: center;
            font-size: 0.9rem;
            color: var(--color-text-secondary);
            margin-top: 5px;
        }

        .location-icon {
            font-size: 16px;
            margin-right: 5px;
            color: var(--color-accent);
        }

        /* --- Stats Row --- */

        .stats-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 16px 0;
        }

        .stat-card {
            background-color: var(--color-bg-secondary);
            padding: 15px 5px;
            border-radius: 12px;
            text-align: center;
            /* Updated shadow for a bit more depth */
            box-shadow: 0 6px 15px rgba(255, 127, 127, 0.15); 
            border: 1px solid var(--color-icon-muted);
        }

        .stat-value {
            font-size: 1.3rem;
            font-weight: 700;
            line-height: 1.2;
            color: var(--color-accent);
        }

        .stat-label {
            font-size: 0.8rem;
            color: var(--color-text-secondary);
            margin-top: 4px;
        }
        
        .stat-icon {
            font-size: 20px;
            margin-bottom: 2px;
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            color: var(--color-accent);
        }


        /* --- Content Cards (About, Personality, Preferences) --- */

        .content-card {
            background-color: var(--color-bg-secondary);
            border-radius: 16px;
            padding: 20px;
            margin: 16px 0;
            width: 100%;
            box-sizing: border-box;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }

        .card-title {
            font-size: 1.25rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            color: var(--color-text-primary);
        }

        .title-icon {
            font-size: 20px;
            margin-left: 8px;
            color: var(--color-accent);
            font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24;
        }
        
        .about-text {
            font-size: 1rem;
            color: var(--color-text-primary);
            line-height: 1.5;
        }

        /* --- Personality Tags --- */
        
        .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }

        .profile-tag {
            background-color: var(--color-accent); /* Updated pill background via theme */
            color: #FFFFFF; /* Updated pill text/icon color */
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(255, 127, 127, 0.1);
            border: 1px solid var(--color-accent);
        }
        
        .tag-icon {
            font-size: 16px;
            margin-right: 4px;
            color: #FFFFFF; /* Match pill text color */
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20;
        }

        /* --- Preferences List --- */

        .preferences-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .preference-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--color-icon-muted);
        }

        .preference-row:last-child {
            border-bottom: none;
        }

        .preference-icon {
            font-size: 20px;
            color: var(--color-accent);
            margin-right: 12px;
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }

        .preference-type {
            flex-grow: 1;
            font-weight: 600;
            color: var(--color-text-primary);
        }

        .preference-value {
            font-weight: 400;
            color: var(--color-text-secondary);
            text-align: right;
        }

        /* --- New Love Style Section Styles --- */
        
        .love-style-brief {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            margin-bottom: 10px;
        }

        .love-style-icon {
            font-size: 40px;
            color: var(--color-accent);
            font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48;
            flex-shrink: 0;
        }

        .style-text {
            flex-grow: 1;
        }

        .style-name {
            font-size: 1.1rem;
            font-weight: 700;
            margin: 0;
            color: var(--color-accent);
        }

        .style-description {
            font-size: 0.95rem;
            color: var(--color-text-secondary);
            margin: 5px 0 0 0;
        }

        .full-style-details {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.4s ease-in-out, margin-top 0.4s;
            margin-top: 0;
            padding-top: 0;
        }

        .full-style-details.visible {
            max-height: 400px; /* Large enough to show content */
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--color-icon-muted);
        }

        .full-style-details p {
            font-size: 0.9rem;
            color: var(--color-text-primary);
            line-height: 1.6;
        }

        .view-more-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            background: none;
            border: none;
            color: var(--color-accent);
            font-family: 'Josefin Sans', sans-serif;
            font-size: 1rem;
            font-weight: 600;
            padding: 10px 0 0;
            cursor: pointer;
            transition: color 0.2s;
        }
        
        .view-more-icon {
            font-size: 20px;
            margin-right: 5px;
            transition: transform 0.3s;
        }
        
        /* Responsive Adjustments for smaller devices */
        @media (max-width: 375px) {
            .profile-card-overlay {
                margin-top: -20px;
                padding: 15px;
            }
            .profile-picture-wrapper {
                 margin-right: 10px;
            }
            .profile-picture {
                width: 70px;
                height: 70px;
            }
            .name-title {
                font-size: 1.4rem;
            }
        }
    `;

    return (
        <div className="profile-page-container">
            <style>{styleSheet}</style>
            
            <div className="profile-content">
                
                {/* Hero Section: Image */}
<div className="hero-section">
    <div className="main-image-container">
        <img src={mockProfile.mainImage} alt="Main Profile" className="main-image" />
    </div>
</div>

                {/* Profile Card Overlay: Name, Stats */}
                <div className="profile-card-overlay">
                    
                    {/* Name, Age, Location (UI/UX Improvement applied here) */}
                    <div className="profile-header">
                        <div className="profile-picture-wrapper">
                            <img src={mockProfile.profilePic} alt="Profile Pic" className="profile-picture" />
                            <div className="verified-badge">
                                <span className="material-symbols-outlined" style={{fontSize: '14px'}}>check</span>
                            </div>
                            {/* New Edit Button */}
                            <button className="edit-icon-btn" onClick={() => console.log('Edit Profile Picture')}>
                                <span className="material-symbols-outlined edit-icon">edit</span>
                            </button>
                        </div>

                        <div className="name-info">
                            <h1 className="name-title">
                                {mockProfile.name}, {mockProfile.age}
                            </h1>
                            <div className="location-text">
                                <span className="material-symbols-outlined location-icon">location_on</span>
                                {mockProfile.location}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Row (Placed outside the card overlay for spacing) */}
                <div className="stats-row">
                    <div className="stat-card">
                        <span className="material-symbols-outlined stat-icon">favorite</span>
                        <div className="stat-value">{mockProfile.stats.likesMe}</div>
                        <div className="stat-label">Likes Me</div>
                    </div>
                    <div className="stat-card">
                        <span className="material-symbols-outlined stat-icon">sentiment_satisfied</span>
                        <div className="stat-value">{mockProfile.stats.iLikes}</div>
                        <div className="stat-label">I Likes</div>
                    </div>
                    <div className="stat-card">
                        <span className="material-symbols-outlined stat-icon">groups</span>
                        <div className="stat-value">{mockProfile.stats.matches}</div>
                        <div className="stat-label">Matches</div>
                    </div>
                </div>

                {/* About Section */}
                <div className="content-card">
                    <h2 className="card-title">
                        About <span className="material-symbols-outlined title-icon">female</span>
                    </h2>
                    <p className="about-text">"{mockProfile.about}"</p>
                </div>

                {/* Love Style Section (New Section) */}
                <LoveStyleSection loveStyle={mockProfile.loveStyle} />

                {/* Personality Section */}
                <div className="content-card">
                    <h2 className="card-title">
                        Personality <span className="material-symbols-outlined title-icon">diamond</span>
                    </h2>
                    <div className="tags-container">
                        {mockProfile.personality.map((p, index) => (
                            <Tag key={index} label={p.label} icon={p.icon} />
                        ))}
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="content-card">
                    <h2 className="card-title">
                        Preferences <span className="material-symbols-outlined title-icon">tune</span>
                    </h2>
                    <div className="preferences-list">
                        {mockProfile.preferences.map((pref, index) => (
                            <PreferenceRow 
                                key={index} 
                                type={pref.type} 
                                value={pref.value} 
                                icon={pref.icon} // Uses dynamic icons for better scannability
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
