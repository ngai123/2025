import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import styled from "styled-components";
import userService from "../../api/services/userService";
import logo from "../../image/logo.png";
import { FiEye, FiEyeOff, FiMail, FiLock } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import OnboardingLayout, { PrimaryButton, SecondaryButton } from '../Shared/OnboardingLayout';

// Styled Components - matching AccountInfo.jsx design
const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 390px;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  width: 100%;

  @media (max-height: 700px) {
    margin-bottom: 8px;
  }
`;

const Logo = styled.img`
  width: 40vw;
  max-width: 150px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(255, 107, 53, 0.2));
  margin-bottom: 2px;

  @media (max-height: 700px) {
    max-width: 120px;
  }
`;

const Title = styled.h1`
  color: var(--color-text-tertiary);
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
  line-height: 1.2;
  text-align: center;
`;

const Subtitle = styled.p`
  color: var(--color-text-tertiary);
  font-size: 16px;
  margin-bottom: 0;
  text-align: center;
  opacity: 0.9;
  line-height: 1.3;
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
  overflow: hidden;
  box-sizing: border-box;
`;

const CardHeader = styled.div`
  background: linear-gradient(135deg, var(--color-accent), #FF7F7F);
  padding: 18px 16px;
  text-align: center;
  color: var(--color-text-tertiary);
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #F9F4E2;
  border-radius: 24px 24px 0 0;

  @media (max-height: 700px) {
    padding: 12px 16px;
  }
`;

const CardContent = styled.div`
  padding: 24px 20px 24px 20px;
  width: 100%;
  box-sizing: border-box;
  background: #F9F4E2;
  border-radius: 0 0 24px 24px;

  @media (max-height: 700px) {
    padding: 12px 16px 14px 16px;
  }
`;

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-height: 700px) {
    gap: 4px;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  margin-bottom: 4px;

  @media (max-height: 700px) {
    margin-bottom: 0px;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  padding-left: ${props => props.$hasLeftIcon ? '40px' : '16px'};
  padding-right: ${props => props.$hasRightIcon ? '48px' : '16px'};
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  font-size: 16px;
  outline: none;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  transition: border-color 150ms ease, box-shadow 150ms ease;
  font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);

  &::placeholder {
    color: #9CA3AF;
    opacity: 1;
  }

  &:focus {
    border-color: rgba(255,127,127,0.5);
    box-shadow: 0 0 0 4px rgba(255,127,127,0.18);
  }

  @media (max-height: 700px) {
    padding: 10px 14px;
    padding-left: ${props => props.$hasLeftIcon ? '38px' : '14px'};
    padding-right: ${props => props.$hasRightIcon ? '46px' : '14px'};
    font-size: 15px;
  }
`;

const IconLeft = styled.div`
  position: absolute;
  left: 12px;
  top: 62%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  pointer-events: none;
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
`;

const ErrorText = styled.div`
  color: #DC2626;
  font-weight: 600;
  font-size: 14px;
  text-align: center;
`;

const SignUpLink = styled.p`
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: var(--color-text-primary);

  a {
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.8;
    }
  }

  @media (max-height: 700px) {
    margin-top: 6px;
    margin-bottom: 0;
    font-size: 13px;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  text-align: center;
  margin: 10px 0 10px 0;
  color: var(--color-text-secondary);
  font-size: 14px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  &::before {
    margin-right: 12px;
  }

  &::after {
    margin-left: 12px;
  }

  @media (max-height: 700px) {
    margin: 6px 0 6px 0;
    font-size: 13px;
  }
`;

const SocialButton = styled.button`
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-height: 700px) {
    height: 42px;
    font-size: 15px;
  }
`;

const GoogleButton = styled(SocialButton)`
  background: #ffffff;
  color: #000000;
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin-bottom: 4px;
`;

const AppleButton = styled(SocialButton)`
  background: #000000;
  color: #ffffff;
  margin-bottom: 4px;
`;

const IconWrapper = styled.span`
  position: absolute;
  left: 16px;
  display: flex;
  align-items: center;
`;

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    const userId = localStorage.getItem('current_user_id');
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    // If user is logged in, redirect to inbox page
    if (userId && token) {
      console.log('User already logged in, redirecting to /inbox');
      navigate('/inbox', { replace: true });
    }
  }, [navigate]);
  const [error, setError] = useState(null);

  const isFormValid = Boolean(email) && Boolean(password);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await userService.login({
        email,
        password,
      });

      // Store user ID for subsequent requests (required for X-User-ID header)
      // Backend returns: { access_token, token_type, user: { id, email, ... } }
      if (data?.user?.id) {
        localStorage.setItem("current_user_id", String(data.user.id));
      }

      // Check if user has completed profile setup
      // If they haven't uploaded profile pictures, redirect to profile-picture
      // Otherwise, navigate to inbox
      navigate("/inbox");
    } catch (err) {
      let msg = "Login failed";
      if (err?.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && isFormValid && !loading) {
      handleLogin();
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth login
    alert("Google login will be implemented soon!");
  };

  const handleAppleLogin = () => {
    // TODO: Implement Apple OAuth login
    alert("Apple login will be implemented soon!");
  };

  const goBack = () => navigate("/");

  return (
    <OnboardingLayout
      videoPosition='47% 0%'
      topPadding="0.5rem"
      contentPaddingBottom="4px"
      buttonMarginTop="4px"
      buttonMarginBottom="12px"
      buttons={
        <SecondaryButton onClick={goBack}>
          Back
        </SecondaryButton>
      }
    >
      <ContentWrapper>
        <Header>
          <Logo src={logo} alt="AURA Logo" />
        </Header>

        <Card>
          <CardHeader>
            <Title>Welcome Back</Title>
            <Subtitle>Sign in to continue your journey</Subtitle>
          </CardHeader>

          <CardContent>
            <FormContainer>
              {/* Social Login Buttons */}
              <GoogleButton onClick={handleGoogleLogin}>
                <IconWrapper>
                  <FcGoogle size={20} />
                </IconWrapper>
                <span>Sign in with Google</span>
              </GoogleButton>

              <AppleButton onClick={handleAppleLogin}>
                <IconWrapper>
                  <FaApple size={20} />
                </IconWrapper>
                <span>Sign in with Apple</span>
              </AppleButton>

              <Divider>or</Divider>

              {/* Email Input */}
              <InputWrapper>
                <IconLeft>
                  <FiMail size={18} />
                </IconLeft>
                <StyledInput
                  type="email"
                  placeholder="Email"
                  $hasLeftIcon
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoComplete="email"
                />
              </InputWrapper>

              {/* Password Input with visibility toggle */}
              <InputWrapper>
                <IconLeft>
                  <FiLock size={18} />
                </IconLeft>
                <StyledInput
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  $hasLeftIcon
                  $hasRightIcon
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoComplete="current-password"
                />
                <ToggleButton
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </ToggleButton>
              </InputWrapper>

              {error && <ErrorText>{error}</ErrorText>}

              {/* Login Button */}
              <PrimaryButton
                onClick={handleLogin}
                disabled={loading || !isFormValid}
                style={{ marginTop: '8px' }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </PrimaryButton>

              {/* Sign up link */}
              <SignUpLink>
                Don't have an account?{' '}
                <a href="/account-info">
                  Create one
                </a>
              </SignUpLink>
            </FormContainer>
          </CardContent>
        </Card>
      </ContentWrapper>
    </OnboardingLayout>
  );
}

export default LoginPage;
