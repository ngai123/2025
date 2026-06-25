import React from 'react';
import styled from 'styled-components';
import BackgroundVideo from './BackgroundVideo';

// Optimized wrapper for all onboarding screens
const PageWrapper = styled.div`
  min-height: 100dvh;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: calc(${({ $topPadding }) => $topPadding || '1rem'} + env(safe-area-inset-top)) 1rem calc(1rem + env(safe-area-inset-bottom)) 1rem;
  position: relative;
  z-index: 1;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
`;
const ContentArea = styled.div`
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  align-items: ${({ $centerVertically, $alignContent }) =>
    $alignContent || ($centerVertically ? 'center' : 'flex-start')};
  width: 100%;
  padding-bottom: ${({ $paddingBottom }) => $paddingBottom || '8px'};
  min-height: 0;
  box-sizing: border-box;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap || '10px'};
  width: 100%;
  max-width: 320px;
  margin-top: ${({ $marginTop }) => $marginTop || '12px'};
  margin-bottom: ${({ $marginBottom }) => $marginBottom || '8px'};
  flex-shrink: 0;

  @media (max-height: 700px) {
    margin-top: ${({ $mobileMarginTop }) => $mobileMarginTop || '8px'};
    margin-bottom: ${({ $mobileMarginBottom }) => $mobileMarginBottom || '12px'};
  }
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
  letter-spacing: 0.2px;
  background: linear-gradient(135deg, var(--color-accent), #e24e4e);

  &:hover:not(:disabled) {
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
  letter-spacing: 0.2px;
  background-color: #e0e0e0;

  &:hover:not(:disabled) {
    background-color: #d0d0d0;
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/**
 * OnboardingLayout - Shared layout component for all onboarding screens
 *
 * @param {object} props
 * @param {ReactNode} props.children - Main content to render
 * @param {ReactNode} props.buttons - Button elements to render at bottom
 * @param {string} props.videoPosition - Background video object-position (default: '50% 0%')
 * @param {string} props.videoTransform - Background video transform (optional)
 * @param {boolean} props.centerContent - Center content vertically (default: false)
 * @param {string} props.topPadding - Custom top padding for the page (default: '1rem')
 * @param {string} props.contentPaddingBottom - Custom bottom padding for content area (default: '8px')
 * @param {string} props.buttonMarginTop - Custom top margin for button group (default: '12px')
 * @param {string} props.buttonMarginBottom - Custom bottom margin for button group (default: '8px')
 * @param {string} props.buttonGap - Custom gap between buttons (default: '10px')
 * @param {string} props.mobileButtonMarginTop - Mobile top margin for button group (default: '8px')
 * @param {string} props.mobileButtonMarginBottom - Mobile bottom margin for button group (default: '12px')
 */
const OnboardingLayout = ({
  children,
  buttons,
  videoPosition = '50% 0%',
  videoTransform,
  centerContent = false,
  alignContent,
  topPadding,
  contentPaddingBottom,
  buttonMarginTop,
  buttonMarginBottom,
  buttonGap,
  mobileButtonMarginTop,
  mobileButtonMarginBottom
}) => {
  return (
    <div style={{
      minHeight: '100dvh',
      position: 'relative'
    }}>
      <BackgroundVideo
        objectPosition={videoPosition}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          ...(videoTransform ? { transform: videoTransform } : {})
        }}
      />

      <PageWrapper $topPadding={topPadding}>
        <ContentArea
          $centerVertically={centerContent}
          $alignContent={alignContent}
          $paddingBottom={contentPaddingBottom}
        >
          {children}
        </ContentArea>

        {buttons && (
          <ButtonGroup
            $marginTop={buttonMarginTop}
            $marginBottom={buttonMarginBottom}
            $gap={buttonGap}
            $mobileMarginTop={mobileButtonMarginTop}
            $mobileMarginBottom={mobileButtonMarginBottom}
          >
            {buttons}
          </ButtonGroup>
        )}
      </PageWrapper>
    </div>
  );
};

// Export individual button components for reuse
export { PrimaryButton, SecondaryButton, ButtonGroup };
export default OnboardingLayout;
