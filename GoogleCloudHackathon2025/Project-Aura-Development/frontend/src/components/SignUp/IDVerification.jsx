import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import BackgroundVideo from '../Shared/BackgroundVideo';
import { FiCamera, FiCheckCircle, FiAlertCircle, FiX, FiClock } from 'react-icons/fi';
import { BsPassport, BsCreditCard2Front, BsCardText } from 'react-icons/bs';
import DocTypeDropdownSimple from '../Shared/DocTypeDropdownSimple';

// Align layout with ProfilePicture.jsx
const PageWrapper = styled.div`
  min-height: 100dvh;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2rem 1rem 0.5rem 1rem;
  position: relative;
  z-index: 1;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
`;

const ContentArea = styled.div`
  flex: 1 auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  padding-bottom: 8px;
  min-height: 0;
  overflow-y: auto;
  box-sizing: border-box;
`;

const Card = styled.div`
  background: var(--color-bg-secondary);
  border-radius: 24px;
  max-width: 390px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  overflow: visible;
  position: relative;
  z-index: 2;
  box-sizing: border-box;
`;

const CardHeader = styled.div`
  background: linear-gradient(135deg, var(--color-accent), #FF7F7F);
  padding: 16px 16px;
  text-align: center;
  color: var(--color-text-tertiary);
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #F9F4E2;
  border-radius: 24px 24px 0 0;
`;

const CardContent = styled.div`
  padding: 12px;
  width: 100%;
  box-sizing: border-box;
  background: #F9F4E2;
  border-radius: 0 0 24px 24px;
`;

const Title = styled.h1`
  color: var(--color-text-tertiary);
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
  text-align: center;
`;

const Subtitle = styled.p`
  color: var(--color-text-tertiary);
  font-size: 13px;
  margin-bottom: 0;
  text-align: center;
  opacity: 0.9;
  line-height: 1.3;
`;

// Replaced native Select with custom dropdown component

// Match Upload area design used in ProfilePicture.jsx
const UploadArea = styled.div`
  border: 2px dashed ${({ $isDragging }) => ($isDragging ? '#FF7F7F' : '#FFBEBE')};
  border-radius: 24px;
  padding: 16px;
  min-height: 140px;
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
`;

const HiddenInput = styled.input`
  display: none;
`;

const UploadIcon = styled.div`
  font-size: 2.5rem;
  color: var(--color-accent);
  margin-bottom: 8px;
`;

const UploadText = styled.p`
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
`;

const UploadSubtext = styled.p`
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.3;
  margin-bottom: 3px;
`;

const Preview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 1rem;
`;

const PreviewWrapper = styled.div`
  position: relative;
  width: 320px;
  height: 200px;
  margin: 0 auto;
`;

const PreviewImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.3);
`;

// Buttons identical to ProfilePicture.jsx
const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 320px;
  margin-top: 15px;
  margin-bottom: 25px;
`;

const PrimaryButton = styled.button`
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 24px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 20px rgba(255, 105, 135, 0.3);
  outline: none;
  letterSpacing: 0.2px;
  background: linear-gradient(135deg, var(--color-accent), #e24e4e);

  &:hover {
    box-shadow: 0 6px 25px rgba(255, 105, 135, 0.4);
    transform: translateY(-2px);
  }

  &:disabled {
    background: linear-gradient(135deg, #cccccc, #aaaaaa);
    color: #f0f0f0;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
`;

const SecondaryButton = styled.button`
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 24px;
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  outline: none;
  letterSpacing: 0.2px;
  background-color: #e0e0e0;

  &:hover {
    background-color: #d0d0d0;
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
  }
`;

const SkipButton = styled.button`
  width: 100%;
  height: 40px;
  border: 2px solid var(--color-accent-light);
  border-radius: 24px;
  color: #000000;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  background-color: transparent;

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Progress Steps Indicator
const ProgressContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0 16px;
`;

const ProgressStep = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  max-width: 80px;
`;

const StepCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  background: ${({ $active, $completed }) =>
    $completed ? 'linear-gradient(135deg, #4CAF50, #45a049)' :
    $active ? 'linear-gradient(135deg, var(--color-accent), #FF7F7F)' :
    '#e0e0e0'};
  color: ${({ $active, $completed }) => ($active || $completed) ? 'white' : '#999'};
  box-shadow: ${({ $active }) => $active ? '0 4px 12px rgba(255, 127, 127, 0.3)' : 'none'};
`;

const StepLabel = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: ${({ $active }) => $active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'};
  text-align: center;
`;

const StepConnector = styled.div`
  flex: 1;
  height: 2px;
  background: ${({ $completed }) => $completed ? '#4CAF50' : '#e0e0e0'};
  margin-top: -20px;
  max-width: 30px;
`;

// Document Type Icons Section
const DocTypeIconsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: nowrap;
`;

const DocTypeIconCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 8px;
  border-radius: 12px;
  background: ${({ $selected }) => $selected ? 'var(--color-accent-light)' : '#fff'};
  border: 2px solid ${({ $selected }) => $selected ? 'var(--color-accent)' : '#e0e0e0'};
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 0;

  &:hover {
    border-color: var(--color-accent);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const DocTypeIconWrapper = styled.div`
  font-size: 28px;
  color: ${({ $selected }) => $selected ? 'var(--color-accent)' : '#666'};
  margin-bottom: 6px;
`;

const DocTypeLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $selected }) => $selected ? 'var(--color-accent)' : '#666'};
  text-align: center;
  line-height: 1.2;
`;

// Modal for Skip Confirmation
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 24px;
  padding: 32px 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ModalCloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: #333;
  }
`;

const ModalIcon = styled.div`
  font-size: 64px;
  text-align: center;
  margin-bottom: 16px;
  color: #ff9800;
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  margin-bottom: 12px;
`;

const ModalText = styled.p`
  font-size: 15px;
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.6;
  margin-bottom: 8px;
`;

const ConsequencesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 20px 0;
`;

const ConsequenceItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fff3cd;
  border-left: 3px solid #ff9800;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 14px;
  color: #856404;
`;

const ConsequenceIcon = styled.span`
  font-size: 20px;
  margin-top: 2px;
`;

const ModalButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const ModalButton = styled.button`
  flex: 1;
  height: 48px;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant }) => $variant === 'primary' ? `
    background: linear-gradient(135deg, var(--color-accent), #e24e4e);
    color: white;
    box-shadow: 0 4px 20px rgba(255, 105, 135, 0.3);

    &:hover {
      box-shadow: 0 6px 25px rgba(255, 105, 135, 0.4);
      transform: translateY(-2px);
    }
  ` : `
    background: #e0e0e0;
    color: var(--color-text-primary);

    &:hover {
      background: #d0d0d0;
      transform: translateY(-2px);
    }
  `}
`;

// Loading Skeleton
const SkeletonContainer = styled.div`
  width: 100%;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const SkeletonBox = styled.div`
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: 12px;
  height: ${({ $height }) => $height || '180px'};
  margin-bottom: 12px;

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

// Verification Options Section
const VerificationSection = styled.div`
  margin-top: 12px;
  padding: 16px;
  background: #f9f4e2;
  border-radius: 16px;
  border: 2px dashed ${({ $isDragging }) => ($isDragging ? '#FF7F7F' : '#FFBEBE')};
`;

const VerificationTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  margin-bottom: 4px;
`;

const VerificationSubtitle = styled.div`
  font-size: 11px;
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: 12px;
`;

const VerificationButtonsContainer = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
`;

const VerificationButton = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 16px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px ${({ $variant }) =>
      $variant === 'mydigitalid' ? 'rgba(0, 102, 204, 0.2)' : 'rgba(73, 64, 224, 0.2)'};
    border-color: ${({ $variant }) =>
      $variant === 'mydigitalid' ? '#0052A3' : '#3730B3'};

    span {
      color: ${({ $variant }) =>
        $variant === 'mydigitalid' ? '#0052A3' : '#3730B3'};
    }
  }

  &:active {
    transform: translateY(-1px);
  }
`;

const VerificationIcon = styled.div`
  font-size: 32px;
  color: ${({ $variant }) =>
    $variant === 'mydigitalid' ? '#0066CC' : '#4940E0'};
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
`;

const VerificationButtonLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  text-align: center;
  line-height: 1.2;
  font-family: Josefin Sans, sans-serif;
  transition: color 0.3s ease;
`;

// Pending Verification Modal
const PendingModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
  backdrop-filter: blur(4px);
`;

const PendingModalContent = styled.div`
  background: white;
  border-radius: 24px;
  padding: 40px 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slideUp 0.3s ease;
  text-align: center;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const PendingIcon = styled.div`
  font-size: 80px;
  text-align: center;
  margin-bottom: 20px;
  color: #FF9800;
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }
`;

const PendingTitle = styled.h2`
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  margin-bottom: 12px;
`;

const PendingText = styled.p`
  font-size: 15px;
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.6;
  margin-bottom: 8px;
`;

const PendingHighlight = styled.div`
  background: #FFF3E0;
  border-left: 4px solid #FF9800;
  border-radius: 8px;
  padding: 16px;
  margin: 20px 0;
  text-align: left;
`;

const PendingHighlightText = styled.p`
  font-size: 14px;
  color: #E65100;
  font-weight: 600;
  margin: 0;
  line-height: 1.5;
`;

// Document type mapping
const DOC_TYPES = {
  passport: { label: 'Passport', icon: BsPassport },
  national_id: { label: 'National ID', icon: BsCreditCard2Front },
  driving_license: { label: 'Driver License', icon: BsCardText }
};

export default function IDVerification() {
  const navigate = useNavigate();
  const [docType, setDocType] = useState('passport');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Upload, 2: Review, 3: Submit
  const [isLoading, setIsLoading] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const inputRef = useRef(null);

  const handleChoose = () => inputRef.current?.click();

  const handleFileChange = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return;
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setCurrentStep(2); // Move to review step
    };
    reader.readAsDataURL(f);
  };

  const handleContinue = async () => {
    if (!file) return;

    setIsLoading(true);
    setCurrentStep(3); // Move to submit step

    // Simulate upload/processing
    setTimeout(() => {
      console.log('ID doc uploaded:', { docType, file });

      // Show pending verification modal
      setIsLoading(false);
      setShowPendingModal(true);
    }, 2000);
  };

  const handlePendingModalClose = () => {
    setShowPendingModal(false);
    navigate('/voice-setup', { state: { from: '/id-verification' } });
  };

  const handleBack = () => navigate('/profile-picture');

  const handleSkip = () => {
    setShowSkipModal(true);
  };

  const confirmSkip = () => {
    console.log('User skipped ID verification');
    navigate('/voice-setup', { state: { from: '/id-verification' } });
  };

  const handleDocTypeSelect = (type) => {
    setDocType(type);
  };

  const handleMyDigitalID = () => {
    console.log('Verify with MyDigitalID');
    // TODO: Integrate MyDigitalID verification flow
    alert('MyDigitalID verification will be available soon!');
  };

  const handleWorldID = () => {
    console.log('Verify with World ID');
    // TODO: Integrate World ID verification flow
    alert('World ID verification will be available soon!');
  };

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <BackgroundVideo objectPosition='47% 0%'/>

      {/* Pending Verification Modal */}
      {showPendingModal && (
        <PendingModalOverlay>
          <PendingModalContent>
            <PendingIcon>
              <FiClock />
            </PendingIcon>
            <PendingTitle>Pending Verification</PendingTitle>
            <PendingText>
              Your ID document has been successfully uploaded and is currently under review.
            </PendingText>

            <PendingHighlight>
              <PendingHighlightText>
                ⏱️ Verification typically takes 1-2 hours
              </PendingHighlightText>
            </PendingHighlight>

            <PendingText style={{ fontSize: '13px', marginTop: '16px' }}>
              You'll receive a notification once your verification is complete. In the meantime, feel free to continue setting up your profile!
            </PendingText>

            <ModalButton
              $variant="primary"
              onClick={handlePendingModalClose}
              style={{ marginTop: '24px', width: '100%' }}
            >
              Continue Setup
            </ModalButton>
          </PendingModalContent>
        </PendingModalOverlay>
      )}

      {/* Skip Confirmation Modal */}
      {showSkipModal && (
        <ModalOverlay onClick={() => setShowSkipModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalCloseButton onClick={() => setShowSkipModal(false)}>
              <FiX />
            </ModalCloseButton>
            <ModalIcon>
              <FiAlertCircle />
            </ModalIcon>
            <ModalTitle>Skip Verification?</ModalTitle>
            <ModalText>
              We understand you want to explore Aura first, but skipping ID verification has some limitations:
            </ModalText>

            <ConsequencesList>
              <ConsequenceItem>
                <ConsequenceIcon>⚠️</ConsequenceIcon>
                <span>Your profile will be marked as <strong>unverified</strong>, reducing trust from other users</span>
              </ConsequenceItem>
              <ConsequenceItem>
                <ConsequenceIcon>🔒</ConsequenceIcon>
                <span>Limited access to <strong>premium features</strong> and verified-only matches</span>
              </ConsequenceItem>
              <ConsequenceItem>
                <ConsequenceIcon>👁️</ConsequenceIcon>
                <span>Lower <strong>profile visibility</strong> in discovery and search results</span>
              </ConsequenceItem>
              <ConsequenceItem>
                <ConsequenceIcon>💬</ConsequenceIcon>
                <span>Some users may <strong>filter you out</strong> from their preferences</span>
              </ConsequenceItem>
            </ConsequencesList>

            <ModalText style={{ fontSize: '13px', fontStyle: 'italic', marginTop: '12px' }}>
              You can complete verification anytime from your profile settings
            </ModalText>

            <ModalButtonGroup>
              <ModalButton $variant="secondary" onClick={() => setShowSkipModal(false)}>
                Go Back
              </ModalButton>
              <ModalButton $variant="primary" onClick={confirmSkip}>
                Skip Anyway
              </ModalButton>
            </ModalButtonGroup>
          </ModalContent>
        </ModalOverlay>
      )}

      <PageWrapper style={{ background: 'transparent', position: 'relative', zIndex: 1 }}>
        {/* Progress Steps Indicator */}
        <ProgressContainer>
          <ProgressStep>
            <StepCircle $active={currentStep === 1} $completed={currentStep > 1}>
              {currentStep > 1 ? <FiCheckCircle /> : '1'}
            </StepCircle>
            <StepLabel $active={currentStep === 1}>Upload</StepLabel>
          </ProgressStep>

          <StepConnector $completed={currentStep > 1} />

          <ProgressStep>
            <StepCircle $active={currentStep === 2} $completed={currentStep > 2}>
              {currentStep > 2 ? <FiCheckCircle /> : '2'}
            </StepCircle>
            <StepLabel $active={currentStep === 2}>Review</StepLabel>
          </ProgressStep>

          <StepConnector $completed={currentStep > 2} />

          <ProgressStep>
            <StepCircle $active={currentStep === 3} $completed={false}>
              3
            </StepCircle>
            <StepLabel $active={currentStep === 3}>Submit</StepLabel>
          </ProgressStep>
        </ProgressContainer>

        <ContentArea>
          <Card>
            <CardHeader>
              <Title>ID Verification</Title>
              <Subtitle>Upload Passport, National ID, or Driving License</Subtitle>
            </CardHeader>
            <CardContent>
              {/* Document Type Icons */}
              <DocTypeIconsContainer>
                {Object.entries(DOC_TYPES).map(([key, { label, icon: Icon }]) => (
                  <DocTypeIconCard
                    key={key}
                    $selected={docType === key}
                    onClick={() => handleDocTypeSelect(key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleDocTypeSelect(key)}
                    aria-label={`Select ${label}`}
                  >
                    <DocTypeIconWrapper $selected={docType === key}>
                      <Icon />
                    </DocTypeIconWrapper>
                    <DocTypeLabel $selected={docType === key}>{label}</DocTypeLabel>
                  </DocTypeIconCard>
                ))}
              </DocTypeIconsContainer>

              {/* Legacy dropdown (hidden, kept for backward compatibility) */}
              <div style={{ display: 'none' }}>
                <DocTypeDropdownSimple value={docType} onChange={setDocType} />
              </div>

              {/* Loading Skeleton or Upload Area */}
              {isLoading && !preview ? (
                <SkeletonContainer>
                  <SkeletonBox $height="180px" />
                  <SkeletonBox $height="48px" />
                </SkeletonContainer>
              ) : preview ? (
                <Preview>
                  <PreviewWrapper>
                    <PreviewImage src={preview} alt="Document preview" />
                  </PreviewWrapper>
                  <SecondaryButton onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setCurrentStep(1);
                  }}>
                    Remove & Upload Different
                  </SecondaryButton>
                </Preview>
              ) : (
                <UploadArea onClick={handleChoose}>
                  <HiddenInput
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files[0])}
                    aria-label="Upload ID document"
                  />
                  <UploadIcon><FiCamera size="3rem" /></UploadIcon>
                  <UploadText>Click to upload or take a photo</UploadText>
                  <UploadSubtext>Supports JPG, PNG, GIF</UploadSubtext>
                  <UploadSubtext>Max 10MB</UploadSubtext>
                </UploadArea>
              )}

              {/* Quick Verification Options */}
              {!preview && (
                <VerificationSection>
                  <VerificationTitle>Quick Verification</VerificationTitle>
                  <VerificationSubtitle>Get verified instantly with digital identity</VerificationSubtitle>
                  <VerificationButtonsContainer>
                    <VerificationButton
                      $variant="mydigitalid"
                      onClick={handleMyDigitalID}
                      type="button"
                      aria-label="Verify with MyDigitalID"
                    >
                      <VerificationIcon $variant="mydigitalid">
                        <img
                          src="https://play-lh.googleusercontent.com/_yuXl7EdqxzBH8_nPGfX6HJD_9HPwG9-CLye1kqUUiS8-KqqrsrVREiv3lT2pNQxag"
                          alt="MyDigitalID"
                        />
                      </VerificationIcon>
                      <VerificationButtonLabel $variant="mydigitalid">
                        MyDigital  ID
                      </VerificationButtonLabel>
                    </VerificationButton>

                    <VerificationButton
                      $variant="worldid"
                      onClick={handleWorldID}
                      type="button"
                      aria-label="Verify with World ID"
                    >
                      <VerificationIcon $variant="worldid">
                        <img
                          src="https://world.org/favicon/safari-pinned-tab.svg"
                          alt="World ID"
                        />
                      </VerificationIcon>
                      <VerificationButtonLabel $variant="worldid">
                        World ID
                      </VerificationButtonLabel>
                    </VerificationButton>
                  </VerificationButtonsContainer>
                </VerificationSection>
              )}
            </CardContent>
          </Card>
        </ContentArea>

        <ButtonGroup>
          <PrimaryButton
            disabled={!file || isLoading}
            onClick={handleContinue}
            aria-label="Save and continue to next step"
          >
            {isLoading ? 'Uploading...' : 'Save & Continue'}
          </PrimaryButton>
          <SecondaryButton onClick={handleBack} disabled={isLoading}>
            Back
          </SecondaryButton>
          <SkipButton onClick={handleSkip} disabled={isLoading}>
            Skip for Now
          </SkipButton>
        </ButtonGroup>
      </PageWrapper>
    </div>
  );
}