import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import profileService from '../../api/services/profileService';
import { FiCamera } from 'react-icons/fi';
import OnboardingLayout from '../Shared/OnboardingLayout';
import Cropper from 'react-easy-crop';

// --- Styled Components (Using OnboardingLayout instead of PageWrapper) ---

const ContentWrapper = styled.div`
  width: 100%;
  padding-top: 200px;

  @media (max-height: 700px) {
    padding-top: 0;
  }
`;

const Card = styled.div`
  background: var(--color-bg-secondary); /* Or your desired "gap" color */
  border-radius: 24px;
  /* REMOVED: padding: 20px; */ /* Padding is now handled by CardContent */
  max-width: 390px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  overflow: hidden; /* Keep this, it's crucial for the rounded corners */
  box-sizing: border-box;
`;

// New: CardHeader for gradient background and title/subtitle
const CardHeader = styled.div`
  background: linear-gradient(135deg, var(--color-accent), #FF7F7F);
  padding: 16px 16px;
  text-align: center;
  color: var(--color-text-tertiary);
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #F9F4E2;
  border-radius: 24px 24px 0 0;

  @media (max-height: 700px) {
    padding: 8px 16px;
  }
`;

// NEW: CardContent wrapper for padding below the header
const CardContent = styled.div`
  padding: 12px;
  width: 100%;
  box-sizing: border-box;
  background: #F9F4E2;
  border-radius: 0 0 24px 24px;
  max-height: calc(100dvh - 320px);
  overflow-y: auto;

  @media (max-height: 700px) {
    max-height: calc(100dvh - 220px);
    padding: 10px;
  }
`;

// Title: Now inside CardHeader, color is white
const Title = styled.h1`
  color: var(--color-text-tertiary);
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
  line-height: 1.2;
  text-align: center;

  @media (max-height: 700px) {
    font-size: 18px;
    margin-bottom: 2px;
  }
`;

// Subtitle: Now inside CardHeader, color is white
const Subtitle = styled.p`
  color: var(--color-text-tertiary);
  font-size: 13px;
  margin-bottom: 0;
  text-align: center;
  opacity: 0.9;
  line-height: 1.3;

  @media (max-height: 700px) {
    font-size: 12px;
    line-height: 1.2;
  }
`;

// 3. UploadArea: Enhanced styling
const UploadArea = styled.div`
  border: 2px dashed ${({ $isDragging }) => ($isDragging ? '#FF7F7F' : '#FFBEBE')};
  border-radius: 24px;
  padding: 16px;
  min-height: 120px;
  width: 100%;
  margin-top: 0;
  margin-bottom: 0;
  text-align: center;
  background: ${({ $isDragging }) => ($isDragging ? '#E2DDB4' : '#F9F4E2')};
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;

  &:hover {
    background: #E2DDB4;
    border-color: #FF7F7F;
  }

  @media (max-height: 700px) {
    padding: 12px;
    min-height: 100px;
  }
`;

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  margin-top: 0;
  margin-bottom: 10px;
`;

const HiddenInput = styled.input`
  display: none;
`;

// UploadIcon: Color from accent
const UploadIcon = styled.div`
  font-size: 2.5rem;
  color: var(--color-accent);
  margin-bottom: 8px;

  @media (max-height: 700px) {
    font-size: 2rem;
    margin-bottom: 4px;
  }
`;

// UploadText: Dark grey
const UploadText = styled.p`
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;

  @media (max-height: 700px) {
    font-size: 14px;
    margin-bottom: 4px;
  }
`;

// UploadSubtext: Medium grey
const UploadSubtext = styled.p`
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.3;
  margin-bottom: 3px;

  @media (max-height: 700px) {
    font-size: 11px;
    margin-bottom: 2px;
  }
`;

// ErrorText: Accent color for status/error messages
const ErrorText = styled.p`
  color: var(--color-accent); /* Accent color for errors/status */
  font-size: 13px;\n  margin-top: 10px;\n  text-align: center;\n  font-weight: 500;\n`;

const PreviewWrapper = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* Creates a square aspect ratio */
`;

const PreviewImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px; /* Slightly less rounded than card */
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* Subtle shadow */
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 8px; /* Adjusted position */
  right: 8px; /* Adjusted position */
  background: var(--color-accent); /* Accent color */
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 28px; /* Slightly smaller */
  height: 28px; /* Slightly smaller */
  font-size: 1rem; /* Adjusted font size */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;
  z-index: 10; /* Ensure it's above the image */

  &:hover {
    background: #d63c55; /* Darker accent on hover */
  }
`;

// Cropper Modal Styles
const CropperModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const CropperModalContent = styled.div`
  background-color: var(--color-bg-primary);
  border-radius: 1rem;
  padding: 1rem;
  width: 90%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CropperContainer = styled.div`
  position: relative;
  width: 100%;
  height: 250px;
  background: #333;
`;

const CropperControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ZoomRange = styled.input`
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  background: var(--color-bg-hover, #e0e0e0);
  outline: none;
  border-radius: 4px;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-accent);
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-accent);
    cursor: pointer;
  }
`;

const CropperButtons = styled.div`
  display: flex;
  justify-content: space-around;
  gap: 1rem;
`;

const CropperButton = styled.button`
  flex: 1;
  padding: 0.75rem;
  border-radius: 0.75rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  color: white;

  &.cancel {
    background-color: var(--color-text-secondary, #888);

    &:hover {
      background-color: #555;
    }
  }

  &.upload {
    background-color: var(--color-accent);

    &:hover {
      background-color: #FF9999;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Using OnboardingLayout buttons instead of local ones

const ProfilePicture = () => {
  const MAX_FILES = 5;
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingPics, setExistingPics] = useState([]); // {id, image_url, category}
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Cropping states
  const [imageToCrop, setImageToCrop] = useState(null);
  const [cropIndex, setCropIndex] = useState(null); // Track which image is being cropped
  const [showCropper, setShowCropper] = useState(false);

  // Removed particle effects for a cleaner background

  const addFiles = (selectedFiles) => {
    setError('');
    const allFiles = Array.from(selectedFiles || []);
    const imageFiles = allFiles.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    // Enforce 10MB size limit per image
    const tooLarge = imageFiles.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    const validSizeFiles = imageFiles.filter(f => f.size <= MAX_FILE_SIZE_BYTES);
    if (tooLarge.length > 0) {
      setError(`Some files exceed ${MAX_FILE_SIZE_MB}MB and were skipped.`);
    }

    // Enforce max count of 5
    const currentFileCount = files.length;
    const availableSlots = Math.max(0, MAX_FILES - currentFileCount);
    if (availableSlots === 0) {
      setError(`You can upload up to ${MAX_FILES} photos.`);
      return;
    }

    const toAdd = validSizeFiles.slice(0, availableSlots);
    if (validSizeFiles.length > availableSlots) {
      setError(`Only ${availableSlots} more photo(s) can be added (max ${MAX_FILES}).`);
    }
    if (toAdd.length === 0) return;

    // Open cropper for the first image
    if (toAdd.length > 0) {
      const firstFile = toAdd[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result);
        setCropIndex(files.length); // Set index for where this will be inserted
        setShowCropper(true);
      };
      reader.readAsDataURL(firstFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleRemove = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError(''); // Clear error when a file is removed
  };

  const handleRemoveExisting = async (picId) => {
    try {
      await profileService.deleteMyPicture(picId);
      setExistingPics(prev => prev.filter(p => p.id !== picId));
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to delete picture.';
      setError(msg);
    }
  };

  // Cropper callbacks
  const handleCropComplete = useCallback(async (croppedBlob) => {
    if (!croppedBlob) return;

    // Convert blob to preview URL
    const previewUrl = URL.createObjectURL(croppedBlob);

    // Convert blob to File object
    const croppedFile = new File([croppedBlob], `cropped_image_${Date.now()}.jpeg`, {
      type: 'image/jpeg',
    });

    // Add to files and previews
    setFiles(prev => [...prev, croppedFile]);
    setPreviews(prev => [...prev, previewUrl]);

    // Close cropper
    setShowCropper(false);
    setImageToCrop(null);
    setCropIndex(null);
  }, []);

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
    setCropIndex(null);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (uploading) return;

    // Validation: Check if user ID exists in localStorage
    const userIdRaw = localStorage.getItem('current_user_id');
    const userId = userIdRaw ? Number(userIdRaw) : null;

    if (!userId) {
      alert('No user ID found. Please create your account first.');
      navigate('/account-info'); // Redirect back to registration
      return;
    }

    setUploading(true);
    try {
      if (files.length > 0) {
        // Map uploads to distinct categories so they don't overwrite each other
        // Order: profile (main), then additional slots used in EditProfile
        const categories = ['profile', 'bestSelfie', 'activity', 'travel', 'withPets', 'myLife'];

        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const category = categories[i] || 'profile';
          await profileService.uploadPicture(f, category);
        }
      }
      navigate('/id-verification');
    } catch (err) {
      // Enhanced error handling with specific messages
      let msg = 'Upload failed.';

      if (err?.response?.status === 404) {
        msg = 'User not found. Your session may have expired. Please register again.';
        localStorage.removeItem('current_user_id'); // Clear stale data
        setTimeout(() => navigate('/account-info'), 2000);
      } else if (err?.response?.status === 400 && err?.response?.data?.detail?.includes('not present')) {
        msg = 'User account not found in database. Please register again.';
        localStorage.removeItem('current_user_id'); // Clear stale data
        setTimeout(() => navigate('/account-info'), 2000);
      } else if (err?.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err?.message) {
        msg = err.message;
      }

      alert(msg);
      console.error('Profile picture upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => navigate('/account-info');

  const currentFileCount = files.length;
  const remainingSlots = MAX_FILES - (currentFileCount + existingPics.length);

  // Prefill existing pictures on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Check if token exists before trying to fetch
        const token = localStorage.getItem('access_token');
        if (!token) {
          console.warn('No access token found - skipping profile picture fetch');
          return;
        }

        const pics = await profileService.getMyPictures();
        if (!mounted) return;
        setExistingPics(Array.isArray(pics) ? pics : []);
      } catch (err) {
        // Non-blocking: show error but allow local uploads
        // Don't show error for 401 - it just means new user with no pictures
        if (err?.response?.status === 401) {
          console.warn('Authentication required for fetching pictures - user may not be logged in yet');
          return;
        }
        const msg = err?.response?.data?.detail || err?.message || 'Failed to load existing pictures.';
        setError(msg);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      {/* Image Cropper Modal */}
      {showCropper && imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          onFinalCropAndUpload={handleCropComplete}
          onCancel={handleCropCancel}
          cropShape="rect" // Use rect for profile pictures
        />
      )}

      <OnboardingLayout
        videoPosition='47% 0%'
        centerContent={false}
        topPadding='0.5rem'
        contentPaddingBottom='4px'
        buttonMarginTop='20px'
        buttonMarginBottom='12px'
        buttonGap='8px'
        buttons={
        <>
          <button
            onClick={handleSave}
            disabled={(currentFileCount === 0 && existingPics.length === 0) || uploading}
            style={{
              width: '100%',
              height: '44px',
              border: 'none',
              borderRadius: '24px',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: (currentFileCount === 0 && existingPics.length === 0) || uploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 20px rgba(255, 105, 135, 0.3)',
              outline: 'none',
              letterSpacing: '0.2px',
              background: (currentFileCount === 0 && existingPics.length === 0) || uploading
                ? 'linear-gradient(135deg, #cccccc, #aaaaaa)'
                : 'linear-gradient(135deg, var(--color-accent), #e24e4e)',
            }}
          >
            {uploading ? 'Uploading...' : 'Save & Continue'}
          </button>

          <button
            onClick={handleBack}
            style={{
              width: '100%',
              height: '44px',
              border: 'none',
              borderRadius: '24px',
              color: 'var(--color-text-primary)',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              outline: 'none',
              letterSpacing: '0.2px',
              backgroundColor: '#e0e0e0',
            }}
          >
            Back
          </button>
        </>
      }
    >
      <ContentWrapper>
        <Card>
          {/* This is your "pink area" (CardHeader) */}
          <CardHeader>
              <Title>Profile Picture</Title>
              <Subtitle>Upload a photo to personalize your profile</Subtitle>
            </CardHeader>

            {/* Wrap the rest of the card's content with CardContent */}
            <CardContent>
              {existingPics.length > 0 || currentFileCount > 0 ? (
                <>
                  <PreviewGrid>
                    {existingPics.map((p) => (
                      <PreviewWrapper key={`existing-${p.id}`}>
                        <PreviewImage src={p.image_url} alt={p.category || 'Existing'} />
                        <RemoveButton onClick={() => handleRemoveExisting(p.id)}>×</RemoveButton>
                      </PreviewWrapper>
                    ))}
                    {previews.map((src, idx) => (
                      <PreviewWrapper key={idx}>
                        <PreviewImage src={src} alt={`Preview ${idx + 1}`} />
                        <RemoveButton onClick={() => handleRemove(idx)}>×</RemoveButton>
                      </PreviewWrapper>
                    ))}
                  </PreviewGrid>
                  {remainingSlots > 0 && (
                    <UploadArea
                      onClick={handleUploadClick}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      $isDragging={isDragging}
                      // No inline style needed here, UploadArea will take 100% of CardContent
                    >
                      <HiddenInput
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => addFiles(e.target.files)}
                      />
                      <UploadIcon><FiCamera size="3rem" /></UploadIcon>
                      <UploadText>Add more photos</UploadText>
                      <UploadSubtext>Supports JPG, PNG, GIF</UploadSubtext>
                      <UploadSubtext>{remainingSlots} more photo(s) can be added (max {MAX_FILES})</UploadSubtext>
                    </UploadArea>
                  )}
                </>
              ) : (
                <UploadArea
                  onClick={handleUploadClick}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  $isDragging={isDragging}
                >
                  <HiddenInput
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => addFiles(e.target.files)}
                  />
                  <UploadIcon><FiCamera size="3rem" /></UploadIcon>
                  <UploadText>Drag & drop or click to upload</UploadText>
                  <UploadSubtext>Supports JPG, PNG, GIF</UploadSubtext>
                  <UploadSubtext>Up to {MAX_FILES} photos · Max {MAX_FILE_SIZE_MB}MB each</UploadSubtext>
                </UploadArea>
              )}
              {error && <ErrorText>{error}</ErrorText>}
            </CardContent>
        </Card>
      </ContentWrapper>
    </OnboardingLayout>
    </>
  );
};

// ImageCropperModal component
const ImageCropperModal = ({ imageSrc, onFinalCropAndUpload, onCancel, cropShape = 'rect' }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropChange = useCallback((crop) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom) => {
    setZoom(zoom);
  }, []);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (isCropping) return;
    if (!croppedAreaPixels) {
      onCancel();
      return;
    }

    setIsCropping(true);

    try {
      const croppedImageBlob = await getCroppedImage(imageSrc, croppedAreaPixels);
      onFinalCropAndUpload(croppedImageBlob);
    } catch (error) {
      console.error('Error during cropping:', error);
      onCancel();
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <CropperModalOverlay>
      <CropperModalContent>
        <CropperContainer>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropComplete}
            cropShape={cropShape}
            showGrid={true}
          />
        </CropperContainer>
        <CropperControls>
          <ZoomRange
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-label="Zoom"
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
          <CropperButtons>
            <CropperButton className="cancel" onClick={onCancel} disabled={isCropping}>
              Cancel
            </CropperButton>
            <CropperButton className="upload" onClick={handleCrop} disabled={isCropping}>
              {isCropping ? 'Processing...' : 'Crop & Add'}
            </CropperButton>
          </CropperButtons>
        </CropperControls>
      </CropperModalContent>
    </CropperModalOverlay>
  );
};

// Helper function to get the cropped image
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
      }, 'image/jpeg', 0.95);
    };
    image.onerror = (error) => reject(error);
  });
};

export default ProfilePicture;