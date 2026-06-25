import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import OnboardingLayout from '../Shared/OnboardingLayout';
import { FiCheckCircle, FiCheck } from 'react-icons/fi';

const ContentWrapper = styled.div`
  width: 100%;

  @media (max-height: 700px) {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
  }
`;

const StyledButton = styled.button`
  width: 100%;
  max-width: 320px;
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

  @media (max-height: 700px) {
    transform: translateY(-180px);
  }

  &:hover {
    box-shadow: 0 6px 25px rgba(255, 105, 135, 0.4);
    transform: translateY(-2px);

    @media (max-height: 700px) {
      transform: translateY(-42px);
    }
  }
`;

const CardContainer = styled.div`
  background: var(--color-bg-secondary);
  border-radius: 24px;
  max-width: 390px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  overflow: hidden;
  box-sizing: border-box;

  @media (max-height: 700px) {
    max-width: 360px;
  }
`;

const CardHeader = styled.div`
  background: linear-gradient(135deg, var(--color-accent), #FF7F7F);
  padding: 24px 16px;
  text-align: center;
  color: var(--color-text-tertiary);
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #F9F4E2;
  border-radius: 24px 24px 0 0;

  @media (max-height: 700px) {
    padding: 16px 12px;
  }
`;

const IconWrapper = styled.div`
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  margin: 0 auto 16px;

  @media (max-height: 700px) {
    width: 48px;
    height: 48px;
    margin-bottom: 10px;
  }
`;

const Title = styled.h1`
  color: var(--color-text-tertiary);
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
  line-height: 1.2;
  text-align: center;

  @media (max-height: 700px) {
    font-size: 18px;
    margin-bottom: 4px;
  }
`;

const Subtitle = styled.p`
  color: var(--color-text-tertiary);
  font-size: 16px;
  margin-bottom: 0;
  text-align: center;
  opacity: 0.9;
  line-height: 1.3;

  @media (max-height: 700px) {
    font-size: 14px;
    line-height: 1.2;
  }
`;

const CardContent = styled.div`
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  background: #F9F4E2;
  border-radius: 0 0 24px 24px;

  @media (max-height: 700px) {
    padding: 14px 16px;
  }
`;

const NotificationContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const TitleWithIcon = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;

  @media (max-height: 700px) {
    gap: 8px;
    margin-bottom: 5px;
  }
`;

const CheckboxDecor = styled.div`
  min-width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  bottom: 2px;

  @media (max-height: 700px) {
    min-width: 16px;
    height: 16px;
    border-width: 1.5px;
  }
`;

const ContentTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;

  @media (max-height: 700px) {
    font-size: 17px;
  }
`;

const Description = styled.p`
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;

  @media (max-height: 700px) {
    font-size: 13px;
    line-height: 1.4;
  }
`;

function Redirect() {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate('/edit-profile');
  };

  return (
    <OnboardingLayout
      videoPosition="80% 0%"
      videoTransform="scale(1.28) translateY(10%)"
      alignContent="flex-end"
      buttonMarginTop="10px"
      buttonMarginBottom="300px"
      mobileButtonMarginTop="0px"
      mobileButtonMarginBottom="0px"
      buttons={
        <StyledButton onClick={handleContinue}>
          Complete Profile
        </StyledButton>
      }
    >
      <ContentWrapper>
        <CardContainer>
          <CardHeader>
            <IconWrapper>
              <FiCheckCircle
                size={window.innerHeight <= 700 ? 28 : 36}
                style={{ color: '#FFFFFF' }}
              />
            </IconWrapper>

            <Title>Welcome to AURA!</Title>

            <Subtitle>Your account has been successfully created</Subtitle>
          </CardHeader>

          <CardContent>
            <NotificationContent>
              <TitleWithIcon>
                <CheckboxDecor />
                <ContentTitle>Complete Your Profile</ContentTitle>
                <CheckboxDecor />
              </TitleWithIcon>

              <Description>
                Please complete your profile to start matching with other users and unlock all features.
              </Description>
            </NotificationContent>
          </CardContent>
        </CardContainer>
      </ContentWrapper>
    </OnboardingLayout>
  );
}

export default Redirect;
