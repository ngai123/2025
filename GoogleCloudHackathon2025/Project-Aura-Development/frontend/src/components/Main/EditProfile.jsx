import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "../common/Toast/ToastProvider";
import HeartLoader from "../common/HeartLoader.jsx";
import { Hearts } from 'react-loader-spinner';
import { UserPen } from 'lucide-react'; // Import Lucide UserPen icon
import BottomNav from './BottomNav'; // Import BottomNav component
import api, { BASE_URL } from '../../api/axios'; // Use centralized axios instance with auth interceptor
import './EditProfile.css'; // Extracted CSS for better performance

// Lazy load Cropper component - only loaded when needed
const Cropper = lazy(() => import('react-easy-crop'));

// Use the centralized API instance which has authentication built-in
const axiosInstance = api;

// --- Profile Cache Helpers (stale-while-revalidate pattern) ---
const PROFILE_CACHE_KEY = 'editProfile_cachedData';
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache validity

const getCurrentUserId = () => {
  return localStorage.getItem('current_user_id') || localStorage.getItem('userId') || null;
};

const getCachedProfile = () => {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp, userId } = JSON.parse(cached);

    // Validate that cache belongs to current user - prevent data leakage between accounts
    const currentUserId = getCurrentUserId();
    if (userId && currentUserId && String(userId) !== String(currentUserId)) {
      // Cache belongs to different user - clear it and return null
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }

    // Return cached data even if stale (we'll revalidate in background)
    return { data, isStale: Date.now() - timestamp > PROFILE_CACHE_TTL };
  } catch {
    return null;
  }
};

const setCachedProfile = (data) => {
  try {
    const userId = getCurrentUserId();
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
      userId // Store user ID with cache to validate on retrieval
    }));
  } catch {
    // Ignore cache errors (e.g., quota exceeded)
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

// Helper: Capitalize first character, keep remaining characters as-is
const capitalizeFirst = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Helper: Calculate age from date_of_birth (ISO string: YYYY-MM-DD)
const calculateAgeFromDOB = (dobStr) => {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

// Love Style Icon Mapping - maps love style types to Material Symbols icons
const loveStyleIconMap = {
  // Based on common love style archetypes
  'SAFE': 'home',                    // The Sanctuary Builder - home/security
  'SANCTUARY': 'home',               // The Sanctuary Builder - alternative key
  'FIRE': 'local_fire_department',   // The Passionate Flame - fire/intensity
  'FLAME': 'local_fire_department',  // The Passionate Flame - alternative key
  'WAVE': 'waves',                   // The Flowing Partner - adaptable/fluid
  'STAR': 'star',                    // The Shining Light - brightness/inspiration
  'ROCK': 'landscape',               // The Steady Foundation - stability/strength
  'WIND': 'air',                     // The Free Spirit - freedom/movement
  'MOON': 'nights_stay',             // The Intuitive Soul - emotion/intuition
  'SUN': 'wb_sunny',                 // The Radiant Giver - warmth/generosity
  'TREE': 'park',                    // The Growing Partner - growth/nurturing
  'OCEAN': 'water',                  // The Deep Connector - depth/emotion
  'MOUNTAIN': 'terrain',             // The Steady Climber - ambition/stability
  'GARDEN': 'yard',                  // The Nurturing Soul - care/cultivation
  'BRIDGE': 'connect_without_contact', // The Connector - relationships/communication
  'NEST': 'cottage',                 // The Sanctuary Builder variant
  'SPARK': 'bolt',                   // The Electric Connection - energy/excitement
  'ANCHOR': 'anchor',                // The Grounding Force - stability/support
  'COMPASS': 'explore',              // The Guiding Partner - direction/adventure
  'HEART': 'favorite',               // The Pure Romantic - love/affection
};

// Helper function to get the correct icon for a love style
const getLoveStyleIcon = (loveStyle) => {
  if (!loveStyle) return 'favorite';

  // Map of invalid/AI-generated icon names to valid Material Symbols
  // This catches icons that look valid but don't actually exist
  const iconCorrections = {
    'nest_eco': 'cottage',
    'nest eco': 'cottage',
    'nesteco': 'cottage',
    'eco_nest': 'cottage',
    'fire_element': 'local_fire_department',
    'flame': 'local_fire_department',
  };

  // List of VERIFIED valid Material Symbol icon names
  const validMaterialIcons = new Set([
    'favorite', 'psychology', 'spa', 'explore', 'shield', 'healing',
    'diversity_3', 'volunteer_activism', 'auto_awesome',
    'home', 'local_fire_department', 'waves', 'star', 'landscape',
    'air', 'nights_stay', 'wb_sunny', 'park', 'water', 'terrain',
    'yard', 'connect_without_contact', 'cottage', 'bolt', 'anchor',
    'eco', 'nest', 'roofing', 'house', 'cabin', 'nature', 'forest',
    'whatshot', 'sentiment_satisfied', 'mood', 'self_improvement'
  ]);

  // Get icon and type, handling potential non-string values
  const icon = typeof loveStyle.icon === 'string' ? loveStyle.icon : null;
  const type = typeof loveStyle.type === 'string' ? loveStyle.type : null;

  // 1. Check if icon needs correction (AI-generated invalid icons)
  if (icon) {
    const iconLower = icon.toLowerCase().trim();

    // First check if this icon needs correction
    if (iconCorrections[iconLower]) {
      return iconCorrections[iconLower];
    }

    // Check if it's a URL for image rendering
    if (icon.startsWith('http') || icon.includes('/') || icon.includes('.svg') || icon.includes('.png')) {
      return icon;
    }

    // Check if it's already a valid Material Symbol
    if (validMaterialIcons.has(iconLower)) {
      return iconLower;
    }

    // Try to map from the icon value using loveStyleIconMap
    const iconCode = iconLower.replace(/[_\-0-9\s]+.*$/, '').trim().toUpperCase();
    if (loveStyleIconMap[iconCode]) {
      return loveStyleIconMap[iconCode];
    }
  }

  // 2. Fallback: try to map from type field (e.g., "SAFE" -> "home")
  if (type) {
    const typeCode = type.toUpperCase().replace(/[_\-0-9\s]+.*$/, '').trim();
    if (loveStyleIconMap[typeCode]) {
      return loveStyleIconMap[typeCode];
    }
  }

  // 3. Final fallback - use 'home' for sanctuary-related or 'favorite' as default
  const archetype = loveStyle.archetype?.toLowerCase() || '';
  if (archetype.includes('sanctuary') || archetype.includes('safe') || archetype.includes('nest')) {
    return 'home';
  }

  return 'favorite';
};

// Robust getThemeColor with explicit fallbacks
const getThemeColor = (variable, fallback = '#FF7F7F') => {
    if (typeof document !== 'undefined' && document.body) { // <--- Add document.body check
      const value = getComputedStyle(document.body) // <--- CHANGE THIS LINE
        .getPropertyValue(variable)
        .trim();
      // If value is empty, use the provided fallback
      return value || fallback;
    }
    return fallback; // Fallback for SSR or if document is not available
  };

  const isDarkTheme = () => {
    return typeof document !== 'undefined' && document.body && document.body.classList.contains('theme-dark'); // <--- Add document.body check
  };

// Hoisted to module scope to keep identity stable and avoid remounts
const EditProfile = () => {
  const navigate = useNavigate(); // Hook for navigation
 // State to hold the fetched profile data (for initial display and updates)
  const [_PROFILE_DATA, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // NEW: For the save profile operation
  const [_ERROR, setError] = useState(null);
  const { showToast } = useToast(); // <--- NEW: Initialize useToast hook

  //username
  //const [userName, setUserName] = useState(''); // Or fetch from user data/props
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState(null);
  // Smart Photos removed
  const [aboutMe, setAboutMe] = useState('');
  // Add a ref for the About Me textarea
  const aboutMeTextareaRef = useRef(null); 
  const [profileImage, setProfileImage] = useState(null);
  const [_PROFILE_IMAGE_ID, setProfileImageId] = useState(null);
  // Add this state variable back for image URLs
  const [photoSlots, setPhotoSlots] = useState({
    bestSelfie: null,
    activity: null,
    travel: null,
    withPets: null,
    myLife: null
  });
  const [photoSlotsIds, setPhotoSlotsIds] = useState({
    bestSelfie: null,
    activity: null,
    travel: null,
    withPets: null,
    myLife: null
  });


  // NEW: State to track loading for each individual photo slot
  const [photoLoading, setPhotoLoading] = useState({
    profile: false,
    bestSelfie: false,
    activity: false,
    travel: false,
    withPets: false,
    myLife: false,
  });

  // NEW STATES FOR CROPPING
  const [imageToCrop, setImageToCrop] = useState(null); // Stores the URL/Base64 of the image to be cropped
  const [cropType, setCropType] = useState(null);     // Stores the type ('profile', 'bestSelfie', etc.) for the image being cropped
  const [showCropper, setShowCropper] = useState(false); // Controls visibility of the cropping modal

  const interestToastRef = useRef(null);
  const interestToastTimeoutRef = useRef(null);

  const [editableFields, setEditableFields] = useState({
    comeFrom: '',
    speaking: [],
    height: '',
    zodiac: '',
    degree: '',
    work: '',
    industry: ''
  });
  const [isEditingAboutMe, setIsEditingAboutMe] = useState(false);
  const [isEditingInterests, setIsEditingInterests] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [myGoal, setMyGoal] = useState('');
  
  //Prompts
  const [userPrompts, setUserPrompts] = useState([]);

  //Personality love style
  const [loveStyle, setLoveStyle] = useState({
    type: '',
    archetype: '',
    icon: 'psychology',
    traits: [],
    compatibility: 0,
    description: ''
  });

  // Personality love style View more
  const [isLoveStyleExpanded, setIsLoveStyleExpanded] = useState(false);

  // Personality Analysis Report
  const [personalityAnalysis, setPersonalityAnalysis] = useState({
    characteristic_json: '',
    trait_scores: null
  });
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);

  //My Relationship
  const [isEditingRelationship, setIsEditingRelationship] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState([]);

  const fileInputRefs = {
    profile: useRef(null),
    bestSelfie: useRef(null),
    activity: useRef(null),
    travel: useRef(null),
    withPets: useRef(null),
    myLife: useRef(null)
  };

  // Data configurations remains the same as default can change later
  const coolPrompts = [
    "A life goal of mine is...",
    "I'm competitive about...",
    "The one thing I can't live without is...",
    "The most embarrassing thing I've done is...",
    "My unpopular opinion about food is...",
    "What I'm looking for in a partner is...",
    "My go-to comfort show is...",
    "The best way to spend a Sunday is..."
  ];
  
  const photoSlotData = [
    { key: 'bestSelfie', icon: 'photo_camera_front', label: 'Best Selfie' },
    { key: 'activity', icon: 'skateboarding', label: 'Activity' },
    { key: 'travel', icon: 'flight_takeoff', label: 'Travel' },
    { key: 'withPets', icon: 'pets', label: 'With Pets' },
    { key: 'myLife', icon: 'menu_book', label: 'My Life' }
  ];

  const allInterests = [
            { icon: 'menu_book', label: 'Reading' },
            { icon: 'tv', label: 'TV' },
            { icon: 'play_circle', label: 'YouTube' },
            { icon: 'directions_car', label: 'Cars' },
            { icon: 'eco', label: 'Healthy lifestyle' },
            { icon: 'sports_tennis', label: 'Badminton' },
            { icon: 'directions_run', label: 'Running' },
            { icon: 'flight_takeoff', label: 'Travel' }, 
            { icon: 'music_note', label: 'Dancing' },
            { icon: 'music_note', label: 'R&B' },
            { icon: 'music_note', label: 'Soul' },
            { icon: 'mic', label: 'Pop' },
            { icon: 'local_cafe', label: 'Cafes' },
            { icon: 'coffee', label: 'Coffee' },
            { icon: 'emoji_food_beverage', label: 'Tea' },
            { icon: 'park', label: 'Nature' },
            { icon: 'hiking', label: 'Hiking' },
            { icon: 'sports_esports', label: 'Gaming' },
            { icon: 'palette', label: 'Art' },
            { icon: 'edit', label: 'Writing' },
            { icon: 'movie', label: 'Movies' },
            { icon: 'restaurant', label: 'Cooking' }
  ];

  //Relationship Options
  const allRelationshipOptions = [
    { label: 'Single', icon: 'person' },
    { label: 'In a relationship', icon: 'favorite' },
    { label: 'It\'s complicated', icon: 'question_mark' },
    { label: 'Open relationship', icon: 'group' },
    { label: 'Prefer not to say', icon: 'visibility_off' },
    { label: 'Divorced', icon: 'person_off' },
    { label: 'Engaged', icon: 'diamond' },
    { label: 'Married', icon: 'handshake' },
    { label: 'Dating casually', icon: 'coffee' }
  ];


  const dropdownOptions = {
    speaking: ['English', 'Bahasa Melayu', 'Mandarin', 'Tamil', 'Cantonese', 'Hokkien'],
    height: heightOptions,
    zodiac: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'],
    degree: ['High School', 'Diploma', 'Undergraduate', 'Bachelor\'s', 'Master\'s', 'PhD', 'Professional'],
    work: ['Employed', 'Unemploy' , 'Student', 'Freelance'],
    industry: ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Hospitality'],
    myGoal: ['Long term partner', 'Short term partner', 'New friends', 'Still figuring out'] 
  };


  const basicInfoFields = [
    { key: 'comeFrom', icon: 'home', label: 'Come From', editable: true },
    { key: 'speaking', icon: 'record_voice_over', label: 'Language', dropdown: true, multiSelect: true }, // <--- NEW: multiSelect: true
    { key: 'height', icon: 'height', label: 'Height', dropdown: true },
    { key: 'zodiac', icon: 'nights_stay', label: 'Zodiac', dropdown: true },
    { key: 'myGoal', icon: 'flag', label: 'My Goal', dropdown: true }
  ];

  const workEducationFields = [
    { key: 'degree', icon: 'school', label: 'Education', dropdown: true },
    { key: 'work', icon: 'work', label: 'Work', dropdown: true }, 
    { key: 'industry', icon: 'business_center', label: 'Industry', dropdown: true } 
  ];

  // --- API Calls ---

  // Helper function to populate state from profile data
  const populateStateFromData = useCallback((data, analysisData = null) => {
    setProfileData(data);
    setFirstName(data.first_name || '');
    setLastName(data.last_name || '');
    const derivedAge = typeof data.age === 'number' ? data.age : calculateAgeFromDOB(data.date_of_birth);
    setAge(derivedAge ?? null);
    setAboutMe(data.about_me || '');

    // Handle profile pictures
    let mainProfilePic = null;
    let mainProfilePicId = null;
    const newPhotoSlots = {
      bestSelfie: null,
      activity: null,
      travel: null,
      withPets: null,
      myLife: null
    };
    const newPhotoSlotsIds = {
      bestSelfie: null,
      activity: null,
      travel: null,
      withPets: null,
      myLife: null
    };

    if (data.profile_pictures && Array.isArray(data.profile_pictures)) {
      data.profile_pictures.forEach(pic => {
        if (pic.category === 'profile') {
          mainProfilePic = toFullImageUrl(pic.image_url);
          mainProfilePicId = pic.id;
        } else if (Object.prototype.hasOwnProperty.call(newPhotoSlots, pic.category)) {
          newPhotoSlots[pic.category] = toFullImageUrl(pic.image_url);
          newPhotoSlotsIds[pic.category] = pic.id;
        }
      });
    }

    setProfileImage(mainProfilePic);
    setPhotoSlots(newPhotoSlots);
    setProfileImageId(mainProfilePicId);
    setPhotoSlotsIds(newPhotoSlotsIds);

    setEditableFields({
      comeFrom: data.come_from || '',
      speaking: Array.isArray(data.language_name) ? data.language_name : (data.language_name ? [data.language_name] : []),
      height: data.height_cm ? `${data.height_cm} cm` : '',
      zodiac: data.zodiac || '',
      degree: data.education_id || '',
      work: data.employment_id || '',
      industry: data.industry_id || ''
    });
    setMyGoal(data.my_goal_id || '');
    setSelectedInterests(data.interests || []);
    setSelectedRelationship(data.relationship_status ? [data.relationship_status] : []);
    setUserPrompts(data.user_prompts?.map(p => ({ ...p, isEditing: false })) || []);
    setLoveStyle(data.love_style || loveStyle);

    if (analysisData) {
      setPersonalityAnalysis({
        characteristic_json: analysisData.characteristic_json || '',
        trait_scores: analysisData.trait_scores || null
      });
    }
  }, [loveStyle]);

  // Function to fetch profile data with stale-while-revalidate caching
  const fetchProfile = async () => {
    setError(null);

    // Try to show cached data immediately for instant UI
    const cached = getCachedProfile();
    if (cached?.data) {
      populateStateFromData(cached.data.profile, cached.data.analysis);
      // If cache is fresh, skip network fetch
      if (!cached.isStale) {
        setLoading(false);
        return;
      }
      // Cache is stale - show cached data but continue to revalidate
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      // Get user ID for analysis request
      const storedId = localStorage.getItem('current_user_id') || localStorage.getItem('userId');
      const userId = storedId ? String(storedId) : null;

      // Parallel fetch: profile and analysis at the same time for faster load
      const [profileResponse, analysisResponse] = await Promise.all([
        axiosInstance.get('/profile/me'),
        userId
          ? axiosInstance.get(`/users/${userId}/analysis`).catch(() => null)
          : Promise.resolve(null)
      ]);

      const data = profileResponse.data;
      const analysisData = analysisResponse?.data || null;

      // Update state with fresh data
      populateStateFromData(data, analysisData);

      // Cache the fresh data
      setCachedProfile({ profile: data, analysis: analysisData });

    } catch (err) {
      console.error("Error fetching profile:", err);
      // Only show error if we don't have cached data
      if (!cached?.data) {
        setError(err.response?.data?.detail || err.message || 'Failed to fetch profile');
        setTimeout(() => {
          showToast(err.response?.data?.detail || err.message || 'Failed to fetch profile', 'error');
        }, 0);
      }
    } finally {
      setLoading(false);
    }
  };


  // Helper function to show the "minimum interests" toast only once
  const showInterestMinToast = () => {
    if (!interestToastRef.current) { // Only show if not currently active
      interestToastRef.current = true;
      showToast("You must select at least 3 interests.", 'error');

      // Reset the flag after a delay (e.g., 3 seconds, typical toast duration)
      if (interestToastTimeoutRef.current) {
        clearTimeout(interestToastTimeoutRef.current);
      }
      interestToastTimeoutRef.current = setTimeout(() => {
        interestToastRef.current = false;
      }, 3000); // Adjust duration as needed for your toast display
    }
  };

  // Add this useEffect to clean up the timeout when the component unmounts
useEffect(() => {
  return () => {
    if (interestToastTimeoutRef.current) {
      clearTimeout(interestToastTimeoutRef.current);
    }
  };
}, []); // Empty dependency array means it runs once on mount and once on unmount

 // Function to save profile changes (PUT /profile/me)
const handleSaveProfile = async () => {
  setIsSaving(true);
  setError(null);

  //limit to one relationship, min 3 interests
    // --- NEW: Frontend Validation ---
  if (selectedRelationship.length !== 1) {
    setTimeout(()=>{showToast("Please select exactly one relationship status.", 'error')},0); // <--- NEW: Use showToast
    setLoading(false);
    setIsSaving(false);
    return; // Stop the save process
  }

  if (selectedInterests.length < 3) {
    setTimeout(()=>{showInterestMinToast()},0); // <--- NEW: Use showToast from helper function
    setLoading(false);
    setIsSaving(false);
    return; // Stop the save process
  }
  // --- END NEW: Frontend Validation ---

  try {
    const payload = { // <--- Opening curly brace
      //username: userName, // Uncomment if you want to allow use
      first_name: firstName, 
      last_name: lastName,   
      about_me: aboutMe.trim(),//.trim() is for removing leading/trailing spaces
      come_from: editableFields.comeFrom,
      language_name: editableFields.speaking,
      zodiac: editableFields.zodiac,
      interests: selectedInterests,
      relationship_status: selectedRelationship[0], // Send single value not an array
      user_prompts: userPrompts,
      height_cm: editableFields.height ? parseInt(editableFields.height.replace(' cm', ''), 10) : null, // Corrected 'editableFields.h' to 'editableFields.height'
      education_id: editableFields.degree,
      employment_id: editableFields.work,
      industry_id: editableFields.industry,
      my_goal_id: myGoal,
    }; // <--- Closing curly brace should be here, after all properties

    await axiosInstance.put('/profile/me', payload);

    console.log("Profile updated successfully.");
    // Invalidate cache so next visit fetches fresh data
    localStorage.removeItem(PROFILE_CACHE_KEY);
    setTimeout(()=>{showToast("Profile updated successfully!", 'success')},0);

  } catch (err) {
    console.error("Error updating profile:", err);
    setError(err.response?.data?.detail || err.message || 'Failed to update profile');
    setTimeout(()=>{showToast(err.response?.data?.detail || err.message || 'Failed to update profile', 'error')},0); // <--- NEW: Use showToast(err.response?.data?.detail || err.message || 'Failed to update profile', 'error'); // <--- NEW: Use showToast
  } finally {
    setIsSaving(false);
  }
};

   // --- Photo Management API Calls ---

const handleImageUpload = async (type, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset any photo loading state for this type immediately
    // This is important if a previous upload failed and left a spinner
    setPhotoLoading(prev => ({ ...prev, [type]: false })); 
    setError(null); // Clear any previous errors

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result); // Set the image data for the cropper
      setCropType(type);             // Store the type for later upload
      
      // Delay showing the cropper slightly to ensure the current render cycle completes
      setTimeout(() => {
        setShowCropper(true); // Show the cropper modal
      }, 0); // Use setTimeout to defer to next event loop tick
      
      event.target.value = null;     // Clear the input so same file can be selected again
    };
    reader.readAsDataURL(file);
};

  // NEW: Callback when cropping is complete
const handleUploadCroppedImage = useCallback(async (croppedBlob) => { // Argument is now guaranteed to be a Blob
  console.log("--- PARENT handleUploadCroppedImage (upload function) ENTERED ---");
  console.log("PARENT handleUploadCroppedImage: showCropper value at guard check:", showCropper);
  console.log("PARENT handleUploadCroppedImage: croppedBlob received:", croppedBlob ? "YES" : "NO");
  console.log("PARENT handleUploadCroppedImage: cropType received:", cropType);

  // *** CRITICAL GUARD ***
  // This function should ONLY be called by ImageCropperModal's button click.
  // If it's called prematurely, croppedBlob will likely be null/undefined.
  // Also, ensure the cropper is actually meant to be active.
  // The `croppedBlob` argument is now guaranteed to be a Blob from ImageCropperModal.
  // The primary check is now `showCropper` and `cropType`.
  if (!showCropper || !cropType) { // Simplified guard
    console.warn("PARENT handleUploadCroppedImage called prematurely or with invalid context. Ignoring upload.");
    return;
  }
  // *** END CRITICAL GUARD ***

  console.log("PARENT handleUploadCroppedImage: Proceeding with upload for cropType:", cropType);

  // Reset cropper states immediately to prevent further accidental calls
  // These are now handled by the parent after receiving the final blob
  setShowCropper(false);
  setImageToCrop(null);
  // Note: cropType is cleared in finally block

  setPhotoLoading(prev => ({ ...prev, [cropType]: true }));
  setError(null);

  try {
    const formData = new FormData();
    formData.append('file', croppedBlob, 'cropped_image.jpeg'); // Use the received croppedBlob
    formData.append('category', cropType === 'profile' ? 'profile' : cropType);

    const response = await axiosInstance.post('/profile/me/pictures', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Corrected Content-Type for FormData
      },
    });

    const newPicture = response.data;
    console.log("Cropped picture uploaded:", newPicture);

    // Update local state - convert relative URLs to full API URLs
    if (cropType === 'profile') {
      setProfileImage(toFullImageUrl(newPicture.image_url));
      setProfileImageId(newPicture.id);
    } else {
      setPhotoSlots(prev => ({ ...prev, [cropType]: toFullImageUrl(newPicture.image_url) }));
      setPhotoSlotsIds(prev => ({ ...prev, [cropType]: newPicture.id }));
    }
    setTimeout(() => showToast("Image uploaded successfully!", 'success'), 0);

  } catch (err) {
    console.error("Error uploading cropped image:", err);
    setError(err.response?.data?.detail || err.message || 'Failed to upload image');
    setTimeout(() => showToast(`Error uploading image: ${err.response?.data?.detail || err.message}`, 'error'), 0);
  } finally {
    setPhotoLoading(prev => ({ ...prev, [cropType]: false }));
    setCropType(null);
  }
}, [cropType, showToast, setPhotoLoading, setError, setProfileImage, setProfileImageId, setPhotoSlots, setPhotoSlotsIds, showCropper]); // Dependencies
  // NEW: Callback to cancel cropping
  const onCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
    setCropType(null);
  };

 const handleDeletePhoto = async (type) => {
     // NEW: Prevent deletion of the main profile picture if no picture exists
    if (type === 'profile') {
      setTimeout(() => {
        showToast("Main profile picture cannot be deleted, only replaced.", 'info');
      }, 0);
      return; // Stop the function here
    }

    // For other photo slots, proceed with deletion logic
    let pictureIdToDelete = photoSlotsIds[type]; // Only check auxiliary slots here

    if (!pictureIdToDelete) {
      setTimeout(()=>{showToast("No image to delete for this slot.", 'info')},0);
      return;
    }

    setError(null);

    // Store current image in case we need to rollback
    const previousImage = photoSlots[type];
    const previousImageId = photoSlotsIds[type];

    // Optimistically set loading state
    setPhotoLoading(prev => ({ ...prev, [type]: true }));

    try {
      await axiosInstance.delete(`/profile/me/pictures/${pictureIdToDelete}`);
      
      // Success - clear the image
      setPhotoSlots(prev => ({ ...prev, [type]: null }));
      setPhotoSlotsIds(prev => ({ ...prev, [type]: null }));
      
      setTimeout(()=>{showToast("Image deleted successfully!", 'success')},0);

    } catch (err) {
      // Error - rollback to previous state
      setPhotoSlots(prev => ({ ...prev, [type]: previousImage }));
            setPhotoSlotsIds(prev => ({ ...prev, [type]: previousImageId }));
            
            setTimeout(()=>{showToast(`Error deleting image: ${err.response?.data?.detail || err.message}`, 'error')},0);
          } finally {
            setPhotoLoading(prev => ({ ...prev, [type]: false }));
          }
  };


  // --- Prompt Management API Calls ---

  // Handles adding a new prompt
    const handleAddPrompt = async () => {
      if (userPrompts.length >= 3) {
        setTimeout(()=>{showToast("You can only add up to 3 prompts.", 'info')},0); // <--- NEW: Use showToast("You can only add up to 3 prompts.", 'info'); // <--- NEW: Use showToast
        return;
      }

      setUserPrompts(prev => [...prev, { question: '', answer: '', isEditing: true }]); // NEW: Add isEditing: true for the new prompt
    };
    
    // Handles changing an existing prompt's question or answer
  const handlePromptChange = async (index, newQuestion, newAnswer) => {
      // NEW: Check for duplicate question among other prompts
      // Only check if newQuestion is not empty (i.e., user has selected something)
      // And ensure the newQuestion is not the same as the current question for that prompt (to allow editing answer)
      if (newQuestion && newQuestion !== userPrompts[index].question) {
          const isDuplicate = userPrompts.some((p, i) => i !== index && p.question === newQuestion);
          if (isDuplicate) {
              setTimeout(() => {
                  showToast(`You already have the prompt: "${newQuestion}". Please choose a different question.`, 'error');
              }, 0);
              // OPTIONAL: Revert the selection in the UI if possible, or just prevent the update
              // For now, we'll prevent the update and keep the old question
              return; // Stop the change if it's a duplicate
          }
      }

      const updatedPrompts = [...userPrompts];
      updatedPrompts[index] = {  ...updatedPrompts[index], question: newQuestion, answer: newAnswer };
      setUserPrompts(updatedPrompts);   
  };
    
    // Handles deleting a prompt
    const handleDeletePrompt = async (index) => {
      // Remove the prompt from local state
        setUserPrompts(prev => prev.filter((_, i) => i !== index));
    };

    // NEW: Toggles the editing state for a specific prompt
    const handleTogglePromptEdit = (index) => {
      setUserPrompts(prev => prev.map((prompt, i) =>
        i === index ? { ...prompt, isEditing: !prompt.isEditing } : prompt
      ));
    };


  // --- Effects ---
  useEffect(() => {
    fetchProfile();
  }, []);

  // --- Event Handlers (remain mostly the same, but now interact with state) ---
  // handleFieldEdit, toggleInterest, handleRelationshipSelect, handlePromptChange, handleAddPrompt, handleDeletePrompt
  // These will be updated in the next steps for prompt management.
  
  // NEW: useEffect to log aboutMe state changes
  useEffect(() => {
  }, [aboutMe]); // This effect runs whenever aboutMe changes

  const handleFieldEdit = (field, value) => {
    setEditableFields(prev => ({ ...prev, [field]: value }));
    setDropdownOpen(null);
  };

// Auto-resize About Me textarea when content changes
  useEffect(() => {
  if (isEditingAboutMe && aboutMeTextareaRef.current) {
    // Reset height to 'auto' to correctly calculate the scrollHeight
    aboutMeTextareaRef.current.style.height = 'auto';
    // Set the height to the scrollHeight to fit content
    aboutMeTextareaRef.current.style.height = aboutMeTextareaRef.current.scrollHeight + 'px';
  }
}, [aboutMe, isEditingAboutMe]); // Re-run when aboutMe or isEditingAboutMe changes

  const toggleInterest = (interest) => {
    setSelectedInterests(prev => {
    // If the interest is already selected (user is trying to deselect)
    if (prev.includes(interest)) {
      // NEW: Check if deselecting would violate the minimum of 3 interests
      if (prev.length <= 3) {
        setTimeout(()=> showInterestMinToast(),0); // <--- NEW: Use showInterestMinToast to show the toast only once from helper function
        return prev; // Prevent deselection, return previous state unchanged
      }
      // If more than 3 are selected, allow deselection
      return prev.filter(i => i !== interest);
    } else {
      // If the interest is not selected, add it (no upper limit specified here)
      return [...prev, interest];
    }
  });
};

  // Handler for Relationship
  const handleRelationshipSelect = (optionLabel) => {
   setSelectedRelationship(prev =>{
      // If the clicked option is already selected, do nothing (cannot deselect the only one)
      if (prev.includes(optionLabel)) {
        return prev; // Return the previous state unchanged
      } else {
        // If the clicked option is not selected, select only this one
        return [optionLabel];
      }
  });
  };
  
  // Reusable components (ends)

// Calculate progress
const calculateProgress = () => {
  let completed = 0;
  // Total is now 1 (profileImage) + 5 (photoSlots) + 1 (aboutMe) + 1 (selectedInterests) + 1 (selectedRelationship) + 7 (editableFields) + 3 (userPrompts) + 1 (myGoal) = 20
  const total = 20; // <--- CHANGE THIS FROM 16 TO 20

  if (profileImage) completed++;
  completed += Object.values(photoSlots).filter(Boolean).length;
  if (aboutMe.trim()) completed++;
  if (selectedInterests.length > 0) completed++;
  if (selectedRelationship.length > 0) completed++;
  // --- ADD THIS BLOCK INSTEAD
  Object.values(editableFields).forEach(val => {
    if (Array.isArray(val)) {
      // If it's an array (like 'speaking'), count it as complete if it has items
      if (val.length > 0) {
        completed++;
      }
    } else if (typeof val === 'string' && val.trim() !== '') {
      // If it's a string, count it as complete if it's not empty
      completed++;
    }
    // Note: Other types (like numbers) are not directly in editableFields for completion here.
  });
  // --- END OF ADDED BLOCK ---

  completed += userPrompts.length; // Count 1 point per prompt
  if (myGoal) completed++; // Count myGoal if it exists (now an integer ID)

  return Math.round((completed / total) * 100);
};

// Inside EditProfile component, just before the final `return (`

  // Centered heart loader during initial profile fetch
  if (loading) {
    return (
            <HeartLoader overlay />
    );
  }

  return (
    <div className="edit-profile-container">
      {/* Full-page Saving Overlay */}
          {isSaving && (
            <div className="full-page-saving-overlay">
              <Hearts
                color={getThemeColor('--color-accent', '#FF7F7F')}
                height={80} // Make the spinner larger for a full-page overlay
                width={80}
                secondaryColor={isDarkTheme() ?
                  getThemeColor('--color-bg-secondary-dark', '#333333') :
                  getThemeColor('--color-bg-secondary-light', '#FFFFFF')
                }
              />
            </div>
          )}

           {/* NEW: Image Cropper Modal */}
          {showCropper && imageToCrop && (
            <ImageCropperModal
              imageSrc={imageToCrop}
              onFinalCropAndUpload={handleUploadCroppedImage}
              onCancel={onCropCancel}
              cropShape={cropType === 'profile' ? 'round' : 'rect'} // Make profile pic round
            />
          )}

      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserPen
            size={22}
            style={{
              color: 'var(--color-text-primary)',
              transform: 'translateY(-3px)' // Adjust Y position: negative = up, positive = down
            }}
          />
          <h1 style={{ margin: 0 }}>
            Edit Profile
          </h1>
        </div>
        <button onClick={handleSaveProfile}>
          <span className="material-icons-outlined text-primary" style={{ fontSize: '22px', transform: 'translateY(-5px)' }}>
            check
          </span>
        </button>
      </header>

      <div className="main-content">
        {/* User Name Section */}
        <div className="section" style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0
          }}>
            {firstName} {lastName}
          </h1>
        </div>

        {/* Progress Bar */}
        <div className="section">
          <div className="progress-text">{calculateProgress()}% Complete</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${calculateProgress()}%` }}></div>
          </div>
        </div>

        {/* Photo Section */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Photos</h2>      
          </div>
          <div className="photo-grid">
            {/* Main Profile Picture */}
            <div className="photo-slot-container">
              <div 
                className={`photo-slot ${profileImage ? 'has-image' : ''} ${photoLoading.profile ? 'is-loading' : ''}`}
                style={profileImage ? { backgroundImage: `url(${profileImage})` } : {}}
                onClick={() => !profileImage && !photoLoading.profile && fileInputRefs.profile.current?.click()}
                role="button" 
                aria-label="Profile photo slot"
              >
                {!profileImage && !photoLoading.profile && (
                  <div className="icon-content">
                    <span className="material-icons-outlined">person</span>
                    <span className="slot-label">Profile</span>
                  </div>
                )}
                
                {/* The add button now acts as a replace button if an image exists */}
                {!photoLoading.profile && (
                  <button 
                    className="add-button" 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent parent div's onClick from firing twice
                      fileInputRefs.profile.current?.click();
                    }}
                  >
                    <span className="material-icons-outlined">add</span>
                  </button>
                )}
                
                {photoLoading.profile && (
                  <div className="loading-overlay">
                    <Hearts  color={getThemeColor('--color-accent', '#FF7F7F')} 
                      height={40} 
                      width={40}
                      secondaryColor={isDarkTheme() ? 
                        getThemeColor('--color-bg-secondary-dark', '#333333') : 
                        getThemeColor('--color-bg-secondary-light', '#FFFFFF')
                      }
                       />
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRefs.profile}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('profile', e)}
                disabled={photoLoading.profile}
              />
            </div>

            {/* Photo Slots */}
            {photoSlotData.map((slot) => (
              <PhotoSlot
                key={slot.key}
                slot={slot}
                image={photoSlots[slot.key]}
                onUpload={handleImageUpload}
                onDelete={handleDeletePhoto}
                loading={photoLoading[slot.key]} // <--- NEW: Pass loading state
              />
            ))}
          </div>
        </div>

        {/* Smart Photos removed */}

        {/* Verify Profile */}
        <div className="section">
          <button className="verify-button" onClick={() => console.log('Verify profile clicked')}>
            <div className="verify-info">
              <span className="material-icons-outlined">verified_user</span>
              <span>Verify Your Profile</span>
            </div>
            <div className="verify-status">
              <span>Verified</span>
              <span className="material-icons-outlined">arrow_forward_ios</span>
            </div>
          </button>
        </div>

        {/* NEW PROMPT SECTION */}
        <PromptSection 
         userPrompts={userPrompts}
          coolPrompts={coolPrompts}
          handleAddPrompt={handleAddPrompt}
          handlePromptChange={handlePromptChange}
          handleDeletePrompt={handleDeletePrompt}
          handleTogglePromptEdit={handleTogglePromptEdit}
        />
        
        {/* About Me */}
        <div className="section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="section-title">About Me</h2>
              <span className="material-icons-outlined" style={{ color: 'var(--color-accent)', fontSize: '25px' }}>
                edit_note
              </span>
            </div>
             {/* Edit/Done button for About Me */}
            <button
              className="edit-button"
              onClick={()=> setIsEditingAboutMe(!isEditingAboutMe)}
              type="button"
            >
              {isEditingAboutMe ? 'Done' : 'Edit'}
            </button>
          </div>
          {/*Conditional rendering for textarea or static text */}
          {isEditingAboutMe ? (
            <textarea 
            ref={aboutMeTextareaRef} // ref here
            className="about-textarea"
            placeholder="Learn and growth" 
            value={aboutMe}
            onChange={(e) => {
              setAboutMe(e.target.value);
            }}
          />
          ):(
        <p className="about-textarea static-text"> {/* Reusing textarea styles for consistency */}
          {aboutMe
            ? (aboutMe.length > 200 ? `${aboutMe.slice(0, 200)}...` : aboutMe)
            : "Tell us something about yourself..."}
          </p>
          )}
        </div>

        {/* My Relationship */}
        <div className="section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="section-title">My relationship</h2>
              <span className="material-icons-outlined" style={{ color: 'var(--color-accent)', fontSize: '25px' }}>
                favorite
              </span>
            </div>
            <button
              className="edit-button"
              onClick={() => setIsEditingRelationship(!isEditingRelationship)}
              type="button"
            >
              {isEditingRelationship ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className="interests-container"> {/* Reusing interests-container styles */}
            <p className="interests-description">
              Let others know your relationship status.
            </p>
            <div className="interests-grid"> {/* Reusing interests-grid styles */}
              {(isEditingRelationship
                ? allRelationshipOptions //when editting it show all options
                : allRelationshipOptions.filter(option => selectedRelationship.includes(option.label)) //when not editting it only show selected options) //when not editting it only show selected option
              ).map((option) => (
                <button
                  key={option.label}
                  className={`interest-tag ${
                    selectedRelationship.includes(option.label) ? 'selected' : 'unselected'
                  }`}
                  onClick={() => handleRelationshipSelect(option.label)}
                >
                  <span className="material-icons-outlined">
                    {option.icon}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="section-title">My interests</h2>
              <span className="material-icons-outlined" style={{ color: 'var(--color-accent)', fontSize: '25px' }}>
                favorite
              </span>
            </div>
            <button 
              className="edit-button"
              onClick={() => setIsEditingInterests(!isEditingInterests)}
              type="button"
            >
              {isEditingInterests ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className="interests-container">
            <p className="interests-description">
              Tell others what you're into. Select minimum 3 interests.
            </p>
            <div className="interests-grid">
          {(isEditingInterests ? allInterests : selectedInterests.map(interest => 
            allInterests.find(ai => ai.label === interest) || { icon: 'star', label: interest }
          )).map((interest, index) => (
            <button 
              key={index}
              className={`interest-tag ${
                selectedInterests.includes(interest.label) ? 'selected' : 'unselected'
              }`}
              onClick={() => toggleInterest(interest.label)}
            >
              <span className="material-icons-outlined" >
                {interest.icon}
              </span>
              {interest.label}
            </button>
          ))}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="section">
           <div className="section-header" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="section-title">Basic Information</h2>
              <span className="material-icons-outlined" style={{ color: 'var(--color-accent)', fontSize: '25px' }}>
                badge
              </span>
            </div>
          </div>
          <div className="fields-group">
          {basicInfoFields.map((field) => (
            field.dropdown ? (
              <DropdownField
                key={field.key}
                field={field}
                // Use myGoal state for the 'myGoal' field, otherwise use editableFields
                value={field.key === 'myGoal' ? myGoal : editableFields[field.key]}
                options={dropdownOptions[field.key]}
                // Use setMyGoal for the 'myGoal' field, otherwise use handleFieldEdit
                onChange={field.key === 'myGoal' ? (key, value) => setMyGoal(value) : handleFieldEdit}
                // NEW PROPS: Pass the global dropdown state and setter
                isOpen={dropdownOpen === field.key} // <--- NEW
                onToggle={() => setDropdownOpen(dropdownOpen === field.key ? null : field.key)} // <--- NEW
                multiSelect={field.multiSelect} /* <--- NEW: Pass multiSelect prop */
              />
            ) : (
              <EditableField
                key={field.key}
                field={field}
                value={editableFields[field.key]}
                onChange={handleFieldEdit}
              />
            )
          ))}
          </div>
        </div>

        {/* Work & Education */}
        <div className="section">
          <div className="section-header" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="section-title">Work & Education</h2>
              <span className="material-icons-outlined" style={{ color: 'var(--color-accent)', fontSize: '25px' }}>
                work
              </span>
            </div>
          </div>
          <div className="fields-group">
          {workEducationFields.map((field) => (
            field.dropdown ? (
              <DropdownField
                key={field.key}
                field={field}
                value={editableFields[field.key]}
                options={dropdownOptions[field.key]}
                onChange={handleFieldEdit}
                // NEW PROPS: Pass the global dropdown state and setter
                isOpen={dropdownOpen === field.key} // <--- NEW
                onToggle={() => setDropdownOpen(dropdownOpen === field.key ? null : field.key)} // <--- NEW
              />
            ) : (
              <EditableField
                key={field.key}
                field={field}
                value={editableFields[field.key]}
                onChange={handleFieldEdit}
              />
            )
          ))}
          </div>
        </div>

        {/* Love Style Section */}
        <div className="section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="section-title">Love Style</h2>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '25px' }}>
                auto_awesome 
              </span>
            </div>
            <button className="edit-button" onClick={() => navigate('/voice-setup', { state: { from: '/edit-profile' } })} type="button">
              Change
            </button>
          </div>

          <div className="love-style-card">
            {/* Character Icon - UPDATED */}
            <div className="love-style-character">
              {(() => {
                const iconValue = getLoveStyleIcon(loveStyle);
                // Check if it's a URL for image rendering
                if (iconValue.startsWith('http') || iconValue.includes('/') || iconValue.includes('.')) {
                  return <img src={iconValue} alt={`${loveStyle?.archetype || 'Love Style'} icon`} className="love-style-image" />;
                }
                // Otherwise render as Material Symbol
                return <span className="material-symbols-outlined love-style-icon">{iconValue}</span>;
              })()}
            </div>
            
            {/* Type Badge */}
            <div className="love-style-badge">
              <span className="love-style-type">{loveStyle.archetype} ({loveStyle.type})</span>
            </div>
            
            {/* Personality Traits */}
            <div className="love-style-traits">
              {loveStyle.traits.map((traitItem, index) => (
                <span key={index} className="trait-tag">{traitItem.trait}</span>
              ))}
            </div>
            
            {isLoveStyleExpanded && (
              <>
                {/* Compatibility */}
                <div className="love-style-compatibility">
                  <span className="compatibility-percentage">{loveStyle.compatibility}%</span>
                  <span className="compatibility-text">of people you meet will like you</span>
                </div>
                
                {/* Description */}
                <p className="love-style-description">
                  {loveStyle.description}
                </p>
              </>
            )}

            {/* 👇 TOGGLE BUTTON */}
            <button
              className="love-style-toggle"
              onClick={() => setIsLoveStyleExpanded(!isLoveStyleExpanded)}
              type="button"
            >
              <span>{isLoveStyleExpanded ? 'Show Less' : 'Show More'}</span>
              <span className="material-symbols-outlined">
                {isLoveStyleExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
              </span>
            </button>
          </div>
        </div>

        {/* Personality Analysis Report Section */}
        <div className="section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="section-title">Personality Analysis</h2>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '25px' }}>
                psychology
              </span>
            </div>
            <button className="edit-button" onClick={() => navigate('/personality-analysis', { state: { from: '/edit-profile' } })} type="button">
              View Full
            </button>
          </div>

          <div className="analysis-card">
            {personalityAnalysis.characteristic_json ? (
              <>
                {/* Header with icon */}
                <div className="analysis-header">
                  <div className="analysis-icon-container">
                    <span className="material-symbols-outlined">insights</span>
                  </div>
                  <div className="analysis-title-group">
                    <h3>Your AI Analysis</h3>
                    <p>Based on your voice responses</p>
                  </div>
                </div>

                {/* Analysis content - truncated or full */}
                <div
                  className="analysis-content"
                  dangerouslySetInnerHTML={{
                    __html: isAnalysisExpanded
                      ? personalityAnalysis.characteristic_json
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n\n/g, '<br/><br/>')
                          .replace(/\n/g, '<br/>')
                      : (personalityAnalysis.characteristic_json.length > 300
                          ? personalityAnalysis.characteristic_json
                              .substring(0, 300)
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n\n/g, '<br/><br/>')
                              .replace(/\n/g, '<br/>') + '...'
                          : personalityAnalysis.characteristic_json
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n\n/g, '<br/><br/>')
                              .replace(/\n/g, '<br/>'))
                  }}
                />

                {/* Toggle button */}
                {personalityAnalysis.characteristic_json.length > 300 && (
                  <button
                    className="love-style-toggle"
                    onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                    type="button"
                    style={{ alignSelf: 'center', marginTop: '1rem' }}
                  >
                    <span>{isAnalysisExpanded ? 'Show Less' : 'Read More'}</span>
                    <span className="material-symbols-outlined">
                      {isAnalysisExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </button>
                )}
              </>
            ) : (
              /* Empty state - no analysis yet */
              <div className="analysis-empty">
                <span className="material-symbols-outlined analysis-empty-icon">psychology_alt</span>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>
                  No Analysis Yet
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  Complete the voice setup to get your personalized personality analysis
                </p>
                <button
                  className="analysis-cta-button"
                  onClick={() => navigate('/voice-setup', { state: { from: '/edit-profile' } })}
                  type="button"
                >
                  Start Voice Analysis
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

// --- Reusable components (defined outside EditProfile to avoid re-rendering issues) ---


// --- Generate granular height options ---
const generateHeightOptions = () => {
  const options = [];
  for (let i = 140; i <= 200; i++) { // From 140 cm to 200 cm
    options.push(`${i} cm`);
  }
  return options;
};
const heightOptions = generateHeightOptions(); // Call it once to generate the array

const PhotoSlot = ({ slot, image, onUpload, onDelete, loading }) => {
const fileInputRef = useRef(null); // Local ref for each PhotoSlot

  return (
    <div className="photo-slot-container">
      <div
        className={`photo-slot ${image ? 'has-image' : ''} ${loading ? 'is-loading' : ''}`}
        style={image ? { backgroundImage: `url(${image})` } : {}}
        onClick={() => !image && !loading && fileInputRef.current?.click()}
        role="button" 
        aria-label={`${slot.label} photo slot`}
      >
        {/* Show content when not loading */}
        {!image && !loading && (
          <div className="icon-content">
            <span className="material-icons-outlined">{slot.icon}</span>
            <span className="slot-label">{slot.label}</span>
          </div>
        )}
        
        {image && !loading && (
          <button 
            className="delete-button" 
            onClick={(e) => { 
              e.stopPropagation(); 
              onDelete(slot.key); 
            }} 
            type="button"
          >
            <span className="material-icons-outlined">close</span>
          </button>
        )}
        
        {!image && !loading && (
          <button 
            className="add-button" 
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <span className="material-icons-outlined">add</span>
          </button>
        )}
        
        {/* Theme-aware loading overlay */}
        {loading && (
          <div className="loading-overlay">
              <Hearts 
              color={getThemeColor('--color-accent', '#FF7F7F')} // Ensure fallback
              height={35} 
              width={35}
              secondaryColor={isDarkTheme() ? 
                getThemeColor('--color-bg-secondary-dark', '#333333') : // Ensure fallback
                getThemeColor('--color-bg-secondary-light', '#FFFFFF')  // Ensure fallback
              }
            />
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => onUpload(slot.key, e)}
        style={{ display: 'none' }}
        disabled={loading}
      />
    </div>
  );
};

const DropdownField = ({ field, value, options, onChange, isOpen, onToggle, multiSelect }) => {
// NEW: multiSelect prop
 const handleOptionClick = (option) => {
    if (multiSelect) {
      // For multi-select, toggle the option in the array
      const newValue = value.includes(option)
        ? value.filter(item => item !== option)
        : [...value, option];
      onChange(field.key, newValue);
    } else {
      // For single-select, just set the option and close
      onChange(field.key, option);
      onToggle(); // Close dropdown after single selection
    }
  };

 // NEW: formatDisplayValue now accepts multiSelect as an argument
  const formatDisplayValue = (val, isMultiSelect) => {
    if (isMultiSelect && Array.isArray(val)) { // <--- Use isMultiSelect here
      const display = val.join(', ');
      const maxLength = 25;
      return display.length > maxLength ? display.substring(0, maxLength - 3) + '...' : display;
    }
    return val;
  };

  return (
    <div className="dropdown-container">
      <button 
        className="dropdown-trigger"
        onClick={onToggle} // <--- Use the passed onToggle prop
      >
        <div className="field-info">
          <span className="material-icons-outlined">{field.icon}</span>
          <span>{field.label}</span>
        </div>
        <div className="field-value">
          <span>{formatDisplayValue(value, multiSelect)}</span> {/* NEW: Use formatDisplayValue */}
          <span className="material-icons-outlined">
            {isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}{/* <--- Use isOpen prop */}
          </span>
        </div>
      </button>
      {isOpen && ( // <--- Use isOpen prop
        <div className="dropdown-menu">
          {options.map(option => {
            // This is the logic that determines if 'selected' class is applied
            const isSelected = (multiSelect && Array.isArray(value) && value.includes(option)) || (!multiSelect && value === option);
            // Add a console log here to see the result of this condition for each option
            // console.log(`DEBUG DropdownField: Option: ${option}, Value: ${value}, isMultiSelect: ${multiSelect}, isSelected: ${isSelected}`);
            return (
              <button
                key={option}
                className={`dropdown-option ${isSelected ? 'selected' : ''}`} // This applies the class
                onClick={() => handleOptionClick(option)}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const EditableField = ({ field, value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  // Focus the input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleValueChange = (e) => {
    let newValue = e.target.value;
    // Apply 25 character limit only for 'comeFrom'
    if (field.key === 'comeFrom' && newValue.length > 25) {
      newValue = newValue.substring(0, 25); // Enforce 15 char limit
    }
    onChange(field.key, newValue);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  // Truncate value for static display if it's 'comeFrom' and too long
  const displayValue = (field.key === 'comeFrom' && value && value.length > 25)
    ? value.substring(0, 22) + '...' // Truncate to 22 chars + "..." = 25 total
    : value;


// Inside the EditableField component, in its return statement
// ...

return (
  <button
    className="editable-field-container"
    onClick={() => setIsEditing(true)} // Click the button to start editing
    type="button" // Important: prevent implicit form submission
  >
    <div className="field-info">
      <span className="material-icons-outlined">{field.icon}</span>
      <span>{field.label}</span>
    </div>
    <div className="field-value">
      {/* Re-adding the conditional rendering wrapped in a React Fragment */}
      <> {/* <--- React Fragment opening tag */}
        {isEditing ? ( // Conditionally render input when editing
          <input
            ref={inputRef}
            className="editable-input"
            value={value} // Show full value for editing
            onChange={handleValueChange}
            onBlur={handleBlur} // Stop editing when input loses focus
            onClick={(e) => e.stopPropagation()} // Prevent button click from propagating when clicking input
            maxLength={field.key === 'comeFrom' ? 25 : undefined} // Apply maxLength only for 'comeFrom'
          />
        ) : ( // Show static text when not editing
          <span className="static-value">
            {field.key === 'comeFrom' ? (displayValue || '') : (displayValue || 'Not set')}
          </span>
        )}
        <span className="material-icons-outlined">arrow_forward_ios</span>
      </> {/* <--- React Fragment closing tag */}
    </div>
  </button>
);
};



// NEW COMPONENT: PromptSection (now receives props for handlers and data)
const PromptSection = ({ userPrompts, coolPrompts, handleAddPrompt, handlePromptChange, handleDeletePrompt, handleTogglePromptEdit }) => (
  <div className="section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 className="section-title">Prompts (Icebreakers)</h2>
          <span className="material-icons-outlined" style={{ color: 'var(--color-accent)', fontSize: '25px' }}>
            question_answer
          </span>
        </div>
          {userPrompts.length < 3 && (
              <button className="edit-button" onClick={handleAddPrompt} type="button">
                  Add Prompt
              </button>
          )}
      </div>
      <p className="interests-description">
          Choose a question and give a fun, short answer. Limit 3 prompts.
      </p>
      {userPrompts.map((prompt, index) => (
          <div key={index} className="prompt-card"> {/* <--- This div opens here */}
              {prompt.isEditing ? ( // Conditional rendering for editing mode
                  <> {/* React Fragment to group multiple elements */}
                      <select
                          className="prompt-select"
                          value={prompt.question}
                          onChange={(e) => handlePromptChange(index, e.target.value, prompt.answer)}
                      >
                          {/* NEW: Add a default placeholder option */}
                          <option value="" disabled>Choose a prompt...</option> 
                          {coolPrompts.map((q, idx) => (   //idx is for key and q is for value  
                              <option key={idx} value={q}>{q}</option>
                          ))}
                      </select>
                      <textarea
                          className="prompt-answer-textarea"
                          placeholder="Your engaging answer..."
                          value={prompt.answer}
                          onChange={(e) => handlePromptChange(index, prompt.question, e.target.value)}
                      />
                      {/* Buttons for editing mode */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                          <button className="delete-button-prompt" onClick={() => handleDeletePrompt(index)} type="button">
                              <span className="material-icons-outlined">delete_outline</span> 
                          </button>
                          <button className="edit-button" onClick={() => handleTogglePromptEdit(index)} type="button">
                              Done {/* <--- The "Done" button */}
                          </button>
                      </div>
                  </>
              ) : ( // Conditional rendering for viewing mode
                  <div onClick={() => handleTogglePromptEdit(index)} style={{ cursor: 'pointer' }}> {/* Click to edit */}
                      <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{prompt.question}</p>
                      <p style={{ color: 'var(--color-text-secondary)' }}>{prompt.answer || "No answer yet. Click to edit."}</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                          <button className="edit-button" onClick={(e) => { e.stopPropagation(); handleTogglePromptEdit(index); }} type="button">
                              Edit {/* <--- The "Edit" button */}
                          </button>
                      </div>
                  </div>
              )}
          </div> 
      ))}
  </div>
);

const ImageCropperModal = ({ imageSrc, onFinalCropAndUpload, onCancel, cropShape = 'round' }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false); // NEW: State to prevent double clicks

  // Debugging: Log when the modal renders and when croppedAreaPixels changes
  useEffect(() => {
    console.log("ImageCropperModal rendered. croppedAreaPixels:", croppedAreaPixels);
  }, [croppedAreaPixels]);

  const onCropChange = useCallback((crop) => {
    setCrop(crop);
    console.log("Cropper: onCropChange called. Crop:", crop);
  }, []);

  const onZoomChange = useCallback((zoom) => {
    setZoom(zoom);
    console.log("Cropper: onZoomChange called. Zoom:", zoom);
  }, []);

  const onCropAreaChange = useCallback((croppedArea, croppedAreaPixels) => {
    // This is the callback from react-easy-crop when the crop area changes
    console.log("Cropper: onCropComplete (internal) called. Setting croppedAreaPixels:", croppedAreaPixels);
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    console.log("--- handleCrop function ENTERED (from button click) ---");
    console.log("ImageCropperModal: 'Upload' button clicked. croppedAreaPixels:", croppedAreaPixels);

    if (isCropping) { // Prevent multiple clicks
      console.warn("ImageCropperModal: Already cropping, ignoring multiple clicks.");
      return;
    }

    if (!croppedAreaPixels) {
      console.warn("ImageCropperModal: 'Upload' clicked, but croppedAreaPixels is null. Cannot crop.");
      onCancel(); // Cancel the modal if no crop area is defined
      return;
    }

    setIsCropping(true); // Set cropping state

    try {
      console.log("ImageCropperModal: Calling getCroppedImage...");
      const croppedImageBlob = await getCroppedImage(imageSrc, croppedAreaPixels);
      console.log("ImageCropperModal: getCroppedImage resolved. Calling parent's onFinalCropAndUpload (upload).");
      onFinalCropAndUpload(croppedImageBlob); // This calls the parent's upload logic
    } catch (error) {
      console.error("ImageCropperModal: Error during cropping:", error);
      onCancel(); // Cancel on error
    } finally {
      setIsCropping(false); // Reset cropping state
    }
  };

  return (
    <div className="cropper-modal-overlay">
      <div className="cropper-modal-content">
        <div className="cropper-container">
          <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Hearts color="#FF7F7F" height={40} width={40} /></div>}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1} // For square/round crops, aspect ratio is 1:1
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropAreaChange} // This is react-easy-crop's internal callback
              cropShape={cropShape} // 'round' for profile, 'rect' for others
              showGrid={true}
            />
          </Suspense>
        </div>
        <div className="cropper-controls">
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => {
              setZoom(parseFloat(e.target.value));
            }}
            className="zoom-range"
          />
          <div className="cropper-buttons">
            <button className="edit-button" onClick={onCancel} disabled={isCropping}>Cancel</button>
            <button className="edit-button" onClick={handleCrop} disabled={isCropping}>
              {isCropping ? 'Uploading...' : 'Upload'} {/* Dynamic button text */}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get the cropped image (keep this outside the component)
const getCroppedImage = (imageSrc, croppedAreaPixels) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const { x, y, width, height } = croppedAreaPixels;

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(
        image,
        x,
        y,
        width,
        height,
        0,
        0,
        width,
        height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob); 
      }, 'image/jpeg'); // Specify image format and quality
    };
    image.onerror = (error) => reject(error);
  });
};

export default EditProfile;
