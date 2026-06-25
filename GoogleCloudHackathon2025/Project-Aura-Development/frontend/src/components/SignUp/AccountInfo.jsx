import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import userService from "../../api/services/userService";
import logo from "../../image/logo.png";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { FiEye, FiEyeOff, FiUser, FiMail, FiLock, FiPhone, FiUsers, FiCalendar } from "react-icons/fi";

// Material-UI DatePicker imports
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { InputAdornment } from '@mui/material';
import dayjs from 'dayjs';
import DocTypeDropdownSimple from '../Shared/DocTypeDropdownSimple';
import OnboardingLayout, { PrimaryButton, SecondaryButton } from '../Shared/OnboardingLayout';

// Styled Components
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
    gap: 2px;
    margin-bottom: 4px;
    margin-top: 4px;
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
    margin-bottom: 0;
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
    font-size: 22px;
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
    font-size: 15px;
    line-height: 1.2;
  }
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
    padding: 10px 16px;
  }
`;

const CardContent = styled.div`
  padding: 24px;
  padding-bottom: 20px;
  width: 100%;
  box-sizing: border-box;
  background: #F9F4E2;
  border-radius: 0 0 24px 24px;
  max-height: calc(100dvh - 280px);
  overflow-y: auto;

  @media (max-height: 700px) {
    padding: 10px 14px;
    max-height: calc(100dvh - 180px);
  }
`;

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-height: 700px) {
    gap:6px;
    padding-bottom: 4px;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  z-index: 1;

  &:focus-within {
    z-index: 100;
  }

  /* Ensure dropdown menus appear above other form fields */
  &.has-open-dropdown {
    z-index: 9999;
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
    padding: 8px 12px;
    padding-left: ${props => props.$hasLeftIcon ? '36px' : '12px'};
    padding-right: ${props => props.$hasRightIcon ? '44px' : '12px'};
    font-size: 14px;
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

const IconRight = styled.div`
  position: absolute;
  right: 25px;
  top: 60%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  pointer-events: none;
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 20px;
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
`;

const InlineNotice = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #FFE8E8;
  color: #7A1C1C;
  border: 1px solid #FFB7B7;
  border-radius: 12px;
  padding: 10px 12px;
  margin-top: 8px;
`;

// Custom DatePicker wrapper to force placeholder color
const DatePickerWrapper = styled.div`
  width: 100%;

  /* Force all input text to be placeholder color when empty */
  &.date-empty {
    input {
      color: #9CA3AF !important;
      -webkit-text-fill-color: #9CA3AF !important;
    }
  }

  /* Black text when date is selected */
  &.date-filled {
    input {
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
    }
  }

  /* Ensure placeholder is always gray */
  input::placeholder {
    color: #9CA3AF !important;
    opacity: 1 !important;
    -webkit-text-fill-color: #9CA3AF !important;
  }
`;

// Native date input for mobile devices
const NativeDateInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  padding-left: 40px;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  font-size: 16px;
  outline: none;
  background-color: var(--color-bg-secondary);
  color: ${props => props.value ? 'var(--color-text-primary)' : '#9CA3AF'};
  transition: border-color 150ms ease, box-shadow 150ms ease;
  font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  height: 48px;

  /* Style the placeholder/empty state */
  &::-webkit-date-and-time-value {
    text-align: left;
  }

  /* iOS specific styling */
  &::-webkit-datetime-edit {
    color: ${props => props.value ? 'var(--color-text-primary)' : '#9CA3AF'};
  }

  &::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.6;
    filter: ${props => props.theme === 'dark' ? 'invert(1)' : 'none'};
  }

  &::placeholder {
    color: #9CA3AF;
    opacity: 1;
  }

  &:focus {
    border-color: rgba(255,127,127,0.5);
    box-shadow: 0 0 0 4px rgba(255,127,127,0.18);
  }

  @media (max-height: 700px) {
    padding: 8px 12px;
    padding-left: 36px;
    font-size: 14px;
    height: 40px;
  }
`;

function AccountInfo() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  // countryCode no longer needed; we now send a single E.164 phone string
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Add ref to directly manipulate the input if needed
  const dateInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice || isTouchDevice);
    };
    checkMobile();
  }, []);

  const isDateOfBirthValid = dateOfBirth && dayjs(dateOfBirth).isValid();

  // Validation: require password only in create mode
  const allRequiredFilledCreate =
    Boolean(fullName) &&
    Boolean(email) &&
    password.length >= 8 &&
    Boolean(phoneNumber) &&
    isDateOfBirthValid &&
    Boolean(gender);

  const allRequiredFilledEdit =
    Boolean(fullName) &&
    Boolean(email) &&
    Boolean(phoneNumber) &&
    isDateOfBirthValid &&
    Boolean(gender);

  const allRequiredFilled = isEditing ? allRequiredFilledEdit : allRequiredFilledCreate;

  const handleContinueClick = () => {
    if (loading) return;
    if (!allRequiredFilled) {
      alert("Please complete all fields before continuing.");
      return;
    }
    if (isEditing) {
      handleUpdate();
    } else {
      handleRegister();
    }
  };

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        full_name: fullName,
        email,
        password,
        // Compose E.164 phone string using the phone input's numeric value
        phone_number: `+${String(phoneNumber).replace(/\D/g, "")}`,
        date_of_birth: dateOfBirth ? dayjs(dateOfBirth).format('YYYY-MM-DD') : null,
        gender,
      };
      console.log('Registration payload:', payload);
      const data = await userService.register(payload);

      // Backend now returns {access_token, token_type, user}
      // Token is automatically stored by userService
      const userId = data?.user?.id || data?.id; // Support both new and old response format
      if (userId) {
        localStorage.setItem("current_user_id", String(userId));
      }

      navigate("/profile-picture");
    } catch (err) {
      let msg = "Registration failed";
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        // Handle both string and array/object error formats
        if (typeof detail === 'string') {
          msg = detail;
        } else if (Array.isArray(detail)) {
          // FastAPI validation errors come as array
          msg = detail.map(e => e.msg || JSON.stringify(e)).join(', ');
        } else if (typeof detail === 'object') {
          msg = JSON.stringify(detail);
        }
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      console.error('Registration error:', err?.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setError(null);
    setLoading(true);
    try {
      const id = localStorage.getItem("current_user_id");
      if (!id) throw new Error("No current user in session");
      const payload = {
        full_name: fullName,
        email,
        phone_number: `+${String(phoneNumber).replace(/\D/g, "")}`,
        date_of_birth: dateOfBirth ? dayjs(dateOfBirth).format('YYYY-MM-DD') : null,
        gender,
      };
      await userService.update(id, payload);
      navigate("/profile-picture");
    } catch (err) {
      let msg = "Update failed";
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        // Handle both string and array/object error formats
        if (typeof detail === 'string') {
          msg = detail;
        } else if (Array.isArray(detail)) {
          // FastAPI validation errors come as array
          msg = detail.map(e => e.msg || JSON.stringify(e)).join(', ');
        } else if (typeof detail === 'object') {
          msg = JSON.stringify(detail);
        }
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      console.error('Update error:', err?.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // If the user already registered and navigates back here, prefill and switch to edit mode
  // Only enter edit mode if URL doesn't explicitly request create mode
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode');

    // If mode=create is specified, always show fresh signup form
    if (mode === 'create') return;

    const id = localStorage.getItem("current_user_id");
    if (!id) return;

    setIsEditing(true);
    setLoading(true);
    userService
      .getById(id)
      .then((user) => {
        setFullName(user?.full_name || "");
        setEmail(user?.email || "");
        setPhoneNumber((user?.phone_number || "").replace(/\D/g, ""));
        setDateOfBirth(user?.date_of_birth ? dayjs(user.date_of_birth) : null);
        setGender(user?.gender || "");
      })
      .catch((err) => {
        let msg = "Failed to load account";
        if (err?.response?.data?.detail) {
          const detail = err.response.data.detail;
          if (typeof detail === 'string') {
            msg = detail;
          } else if (Array.isArray(detail)) {
            msg = detail.map(e => e.msg || JSON.stringify(e)).join(', ');
          } else if (typeof detail === 'object') {
            msg = JSON.stringify(detail);
          }
        } else if (err?.message) {
          msg = err.message;
        }
        setError(msg);
        console.error('Load account error:', err?.response?.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Effect to force input color update when date changes
  useEffect(() => {
    if (dateInputRef.current) {
      const input = dateInputRef.current.querySelector('input');
      if (input) {
        if (!dateOfBirth) {
          input.style.color = '#9CA3AF';
          input.style.webkitTextFillColor = '#9CA3AF';
        } else {
          input.style.color = '#000000';
          input.style.webkitTextFillColor = '#000000';
        }
      }
    }
  }, [dateOfBirth]);

  const goBack = () => navigate("/");

  // Monitor phone dropdown open/close state and adjust width
  useEffect(() => {
    const checkDropdown = () => {
      const dropdown = document.querySelector('.country-list');
      setIsPhoneDropdownOpen(!!dropdown);

      // Match dropdown width to the actual phone input element
      if (dropdown && phoneInputRef.current) {
        // Get the actual input element inside the PhoneInput component
        const phoneInput = phoneInputRef.current.querySelector('.react-tel-input .form-control');
        if (phoneInput) {
          const inputWidth = phoneInput.offsetWidth;
          dropdown.style.width = `${inputWidth}px`;
          dropdown.style.minWidth = `${inputWidth}px`;
          dropdown.style.maxWidth = `${inputWidth}px`;
        }
      }
    };

    // Check on mount and periodically
    const interval = setInterval(checkDropdown, 100);

    // Also check on click events
    document.addEventListener('click', checkDropdown);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', checkDropdown);
    };
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-datepicker input {
        color: ${dateOfBirth ? '#000000' : '#9CA3AF'} !important;
        -webkit-text-fill-color: ${dateOfBirth ? '#000000' : '#9CA3AF'} !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [dateOfBirth]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <OnboardingLayout
        videoPosition="80% 0%"
        videoTransform="scale(1.1) translateY(0%)"
        topPadding="0.5rem"
        contentPaddingBottom="4px"
        buttonMarginTop="20px"
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
              <Title>{isEditing ? "Edit Account" : "Account Information"}</Title>
              <Subtitle>
                {isEditing ? "Update your details and save changes." : "Please fill in your details to create an account."}
              </Subtitle>
            </CardHeader>

            <CardContent>
              <FormContainer>
            <InputWrapper>
              <IconLeft>
                <FiUser size={18} />
              </IconLeft>
              <StyledInput
                type="text"
                placeholder="Full Name"
                $hasLeftIcon
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </InputWrapper>

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
              />
              {typeof error === 'string' && /Email already registered/i.test(error) && (
                <InlineNotice>
                  <span>This email is already registered. Please log in to continue.</span>
                  <SecondaryButton onClick={() => navigate('/login')}>Go to Login</SecondaryButton>
                </InlineNotice>
              )}
            </InputWrapper>

            {/* Password field with visibility toggle - only for create mode */}
            {!isEditing && (
              <InputWrapper>
                <IconLeft>
                  <FiLock size={18} />
                </IconLeft>
                <StyledInput
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 8 chars)"
                  $hasLeftIcon
                  $hasRightIcon
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <ToggleButton
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </ToggleButton>
              </InputWrapper>
            )}

            {/* Phone input with country code selector */}
            <InputWrapper
              ref={phoneInputRef}
              className={isPhoneDropdownOpen ? 'has-open-dropdown' : ''}
              style={{ backgroundColor: "var(--color-bg-secondary)", borderRadius: "16px" }}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                /* Phone input responsive styles */
                @media (max-height: 700px) {
                  .react-tel-input .form-control {
                    height: 40px !important;
                    font-size: 14px !important;
                    padding: 8px 12px !important;
                  }
                  .react-tel-input .flag-dropdown {
                    height: 40px !important;
                  }
                }

                /* Fix phone dropdown z-index and positioning */
                .react-tel-input .country-list {
                  z-index: 10000 !important;
                  position: fixed !important;
                  background: white !important;
                  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.14) !important;
                  border-radius: 12px !important;
                  border: 1px solid rgba(0, 0, 0, 0.06) !important;
                  max-height: 250px !important;
                  overflow-y: auto !important;
                  margin-top: 4px !important;
                }

                /* Style country list items */
                .react-tel-input .country-list .country {
                  padding: 10px 14px !important;
                  display: flex !important;
                  align-items: center !important;
                  gap: 10px !important;
                  transition: background 120ms ease !important;
                }

                .react-tel-input .country-list .country:hover,
                .react-tel-input .country-list .country.highlight {
                  background: #E2DDB4 !important;
                }

                /* Country name and dial code layout */
                .react-tel-input .country-list .country .country-name {
                  flex: 1 !important;
                  white-space: nowrap !important;
                  overflow: hidden !important;
                  text-overflow: ellipsis !important;
                  min-width: 0 !important;
                }

                .react-tel-input .country-list .country .dial-code {
                  color: #666 !important;
                  font-size: 14px !important;
                  flex-shrink: 0 !important;
                  margin-left: 8px !important;
                }

                /* Custom scrollbar for dropdown */
                .react-tel-input .country-list::-webkit-scrollbar {
                  width: 8px;
                }

                .react-tel-input .country-list::-webkit-scrollbar-track {
                  background: #f1f1f1;
                  border-radius: 10px;
                }

                .react-tel-input .country-list::-webkit-scrollbar-thumb {
                  background: #c1c1c1;
                  border-radius: 10px;
                }

                .react-tel-input .country-list::-webkit-scrollbar-thumb:hover {
                  background: #a8a8a8;
                }
              `}} />
              <PhoneInput
                inputStyle={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "16px",
                  border: "1px solid rgba(0,0,0,0.06)",
                  backgroundColor: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  paddingRight: "44px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
                buttonStyle={{ borderRadius: "16px 0 0 16px" }}
                containerStyle={{ width: "100%" }}
                dropdownStyle={{
                  borderRadius: "12px",
                }}
                country={"us"}
                value={phoneNumber}
                onChange={(value) => {
                  setPhoneNumber(String(value));
                }}
                placeholder="Phone Number"
              />
              <IconRight>
                <FiPhone size={18} />
              </IconRight>
            </InputWrapper>

            {/* Date of Birth Input - Native on mobile, Material-UI on desktop */}
            {isMobile ? (
              // Native HTML5 date input for mobile devices
              <InputWrapper>
                <IconLeft>
                  <FiCalendar size={18} />
                </IconLeft>
                <NativeDateInput
                  type="date"
                  value={dateOfBirth ? dayjs(dateOfBirth).format('YYYY-MM-DD') : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      setDateOfBirth(dayjs(value));
                    } else {
                      setDateOfBirth(null);
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                  max={dayjs().format('YYYY-MM-DD')}
                />
              </InputWrapper>
            ) : (
              // Material-UI DatePicker for desktop
              <DatePickerWrapper
                ref={dateInputRef}
                className={dateOfBirth ? 'date-filled' : 'date-empty'}
              >
                <style dangerouslySetInnerHTML={{ __html: `
                  .custom-datepicker .MuiInputAdornment-root.MuiInputAdornment-positionEnd {
                    margin-right: 14px;
                  }
                  @media (max-height: 700px) {
                    .custom-datepicker .MuiOutlinedInput-root {
                      height: 40px !important;
                    }
                    .custom-datepicker .MuiInputBase-input {
                      padding: 8px 8px 8px 0 !important;
                      font-size: 14px !important;
                    }
                  }
                `}} />
                <DatePicker
                  value={dateOfBirth}
                  onChange={(newValue) => setDateOfBirth(newValue)}
                  format="YYYY-MM-DD"
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      placeholder: "YYYY-MM-DD",
                      className: 'custom-datepicker',
                      InputProps: {
                        startAdornment: (
                          <InputAdornment
                          position="start"
                          >
                            <FiCalendar size={18} style={{ color: '#666666' }} />
                          </InputAdornment>
                        ),
                        style: {
                          borderRadius: '16px',
                          height: '48px',
                          backgroundColor: 'var(--color-bg-secondary)',
                        }
                      },
                      sx: {
                        width: '100%',
                        '& .MuiInputBase-input': {
                          padding: '12px 8px 12px 0',
                          fontSize: '16px',
                          fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                          '&::placeholder': {
                            color: '#9CA3AF !important',
                            opacity: '1 !important',
                          }
                        },
                        '& .MuiInputLabel-root': {
                          display: 'none',
                        },
                        '& .MuiOutlinedInput-root': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                          transition: 'border-color 150ms ease, box-shadow 150ms ease',
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 4px rgba(255,127,127,0.18)',
                          }
                        },
                      },
                    },
                  }}
                />
              </DatePickerWrapper>
            )}

            {/* Select Gender field (custom dropdown) */}
            <DocTypeDropdownSimple
              value={gender}
              onChange={setGender}
              options={[
                { value: "", label: "Select Gender" },
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
              placeholder="Select Gender"
              leftIcon={<FiUsers size={18} />}
            />

            {error && !(/Email already registered/i.test(String(error))) && <ErrorText>{error}</ErrorText>}

            {/* Create/Update Account Button */}
            <PrimaryButton
              onClick={handleContinueClick}
              disabled={loading || !allRequiredFilled}
            >
              {loading ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Account")}
            </PrimaryButton>
              </FormContainer>
            </CardContent>
          </Card>
        </ContentWrapper>
      </OnboardingLayout>
    </LocalizationProvider>
  );
}

export default AccountInfo;