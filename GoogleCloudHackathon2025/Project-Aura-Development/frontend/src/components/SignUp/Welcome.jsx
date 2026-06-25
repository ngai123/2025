import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiUserPlus, FiLogIn, FiDownload } from "react-icons/fi";
import logo from "../../image/logo.png";
import OnboardingLayout from '../Shared/OnboardingLayout';

const baseButtonStyle = {
  width: '100%',
  height: '42px',
  border: 'none',
  borderRadius: '24px',
  color: 'white',
  fontSize: '17px',
  fontWeight: '600',
  fontFamily: "'Josefin Sans', sans-serif",
  cursor: 'pointer',
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 20px rgba(68, 66, 65, 0.3)',
  outline: 'none',
  letterSpacing: '0.2px',
  position: 'relative',
  overflow: 'hidden',
};

function WelcomePage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

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

  // Handle PWA install prompt
  useEffect(() => {
    // DEV MODE: Always show button on localhost for testing UI
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev) {
      setShowInstallButton(true);
      console.log('DEV MODE: Showing install button for UI testing');
      return;
    }

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      // Already installed, don't show button
      setShowInstallButton(false);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event for later use
      setDeferredPrompt(e);
      // Show the install button
      setShowInstallButton(true);
      console.log('PWA install prompt captured');
    };

    const handleAppInstalled = () => {
      // Hide the install button after successful installation
      setShowInstallButton(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback for iOS Safari (doesn't support beforeinstallprompt)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('To install AURA on your iPhone:\n\n1. Tap the Share button (box with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm');
      }
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);

    // Clear the deferred prompt (can only be used once)
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }
  };

  const nextPage = () => {
    navigate('/account-info?mode=create'); // ⬅ jumps to Account.jsx page (for new signup)
  };

  const goToLogin = () => {
    navigate('/login'); // ⬅ jumps to Login page (for existing users)
  };

  // Particle effects removed for cleaner background

  const buttonStyles = `
    .welcome-button::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .welcome-button:active::before {
      width: 300px;
      height: 300px;
    }

    .welcome-button:active {
      transform: scale(0.98);
    }

    .welcome-button-white:hover {
      background: linear-gradient(135deg, #e6dbb8ff, #ebe6d5ff) !important;
      box-shadow: 0 6px 24px rgba(68, 66, 65, 0.4);
    }

    .welcome-button-pink:hover {
      background: linear-gradient(135deg, #fc6868, #f98b8b) !important;
      box-shadow: 0 6px 24px rgba(253, 116, 116, 0.5);
    }

    .welcome-button-install:hover {
      background: linear-gradient(135deg, #302e2eff) !important;
      box-shadow: 0 6px 24px rgba(107, 140, 206, 0.5);
    }

    /* Safari iOS specific fixes */
    @supports (-webkit-touch-callout: none) {
      .welcome-page-container {
        min-height: -webkit-fill-available !important;
      }
    }

    /* Mobile responsive - reduce card size */
    @media (max-height: 700px) {
      .welcome-page-container {
        padding-top: 0 !important;
      }
      .welcome-logo-section {
        padding-top: 15px !important;
      }
      .welcome-card {
        padding: 40px 16px 35px 16px !important;
        margin-bottom: 15px !important;
      }
      .welcome-card p:first-child {
        font-size: 20px !important;
      }
      .welcome-card p:last-child {
        font-size: 16px !important;
      }
      .welcome-button {
        height: 40px !important;
        font-size: 16px !important;
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: buttonStyles }} />
      <OnboardingLayout
        videoPosition="80% 0%"
        videoTransform="scale(1.28) translateY(10%)"
        centerContent={false}
      >
      <div
        className="welcome-page-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          textAlign: 'center',
          width: '100%',
          maxWidth: '320px',
          height: '100%',
          minHeight: '0',
          paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
        }}
      >
        {/* Top Section - Logo and Title in cloud area */}
        <div
          className="welcome-logo-section"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '10px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={logo}
              alt="AURA Logo"
              style={{
                width: '40vw',
                maxWidth: '150px',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(255, 107, 53, 0.2))',
              }}
            />
          </div>

          <h1
            style={{
              fontSize: '40px',
              fontWeight: '700',
              color: 'var(--color-accent)',
              letterSpacing: '-0.5px',
              lineHeight: '1',
              margin: '0'
            }}
          >
            AURA
          </h1>
        </div>

        {/* Center Section - White card and sign-in options */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            flexShrink: 0,
            marginTop: '15px',
          }}
        >
          {/* Content Card - More square with larger text */}
          <div
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '20px',
              padding: '60px 20px 50px 20px',
              width: '100%',
              maxWidth: '300px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              marginBottom: '20px',
            }}
            className="welcome-card"
          >
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)',
                  marginBottom: '8px',
                  lineHeight: '1.3',
                  margin: '0 0 8px 0'
                }}
              >
                Hi there! I'm AURA,<br/>your dating companion.
              </p>
              <p
                style={{
                  fontSize: '18px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.3',
                  margin: '0'
                }}
              >
                Ready to discover meaningful connections?
              </p>
            </div>
          </div>

          {/* Sign-in Options */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              width: '90%',
            }}
          >
          <button
            className="welcome-button welcome-button-white"
            style={{
              ...baseButtonStyle,
              background: 'linear-gradient(135deg, #fdeaa9ff, #fcefc2ff)',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              paddingLeft: '16px',
              paddingRight: '16px',
            }}
            onClick={() => nextPage()}
          >
              <FiUserPlus size={18} />
              <span>Create New Account</span>
            </button>

          <button
            className="welcome-button welcome-button-pink"
            style={{
              ...baseButtonStyle,
              background: 'linear-gradient(135deg, #fd7474ff, #fa9595ff)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              paddingLeft: '16px',
              paddingRight: '16px',
            }}
            onClick={() => goToLogin()}
          >
              <FiLogIn size={18} />
              <span>Log into Existing Account</span>
            </button>

            {/* Add to Home Screen Button - Only shows when installable */}
            {showInstallButton && (
              <button
                className="welcome-button welcome-button-install"
                style={{
                  ...baseButtonStyle,
                  background: 'linear-gradient(135deg, #000000ff)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  marginTop: '5px',
                }}
                onClick={handleInstallClick}
              >
                <FiDownload size={18} />
                <span>Add to Home Screen</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </OnboardingLayout>
    </>
  );
}

export default WelcomePage;
