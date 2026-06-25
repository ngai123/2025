import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Added Navigate
import { ToastProvider } from './components/common/Toast/ToastProvider'; // <--- NEW: Import ToastProvider
import { SocketProvider } from './contexts/SocketContext'; // <--- NEW: Import SocketProvider
import ProtectedRoute from './components/Auth/ProtectedRoute'; // <--- NEW: Import ProtectedRoute
import './App.css';
import './styles/ios-fixes.css'; // iOS-specific fixes
import Welcome from './components/SignUp/Welcome';
import ProfileSetup from "./components/SignUp/ProfileSetup.jsx";
import EditProfile from "./components/Main/EditProfile.jsx";
import ProfilePicture from "./components/SignUp/ProfilePicture";
import IDVerification from "./components/SignUp/IDVerification";
import VoiceSetupScreen2 from "./components/SignUp/VoiceSetupScreen2.jsx";
import Redirect from "./components/SignUp/Redirect.jsx";
import InboxPage from './components/Chat/InboxPage.jsx';
import MainPage from './components/Main/MainPage.jsx';
import SettingsPage from './components/Main/SettingsPage.jsx';
import ChatRoute from './components/Chat/ChatRoute.jsx';
import ReportPage from './components/Report/Mainsecurity.jsx';
import Submainreport from './components/Report/Submainreport.jsx';
import Uploadsubmainreport from './components/Report/Uploadsubmainreport.jsx';
import AccountInfo from './components/SignUp/AccountInfo.jsx';
import AccountInfoModification from './components/Main/AccountInfoModification.jsx';
import LikedMePage from './components/Like/Likedmepage.jsx';
import MyLikePage from './components/Like/Mylikepage.jsx';
import PremiumUser from './components/premium/PremiumUser.jsx';
import LoginPage from './components/SignUp/LoginPage.jsx';
import ProfileView from './components/Discover/ProfileView.jsx';
import CustomerService from './components/Main/CustomerService.jsx';
import PersonalityAnalysisChatbot from './components/SignUp/PersonalityAnalysisChatbot.jsx';

// Inject global theme CSS variables once at app root
const ThemeStylesGlobal = () => (
  <style>{`
    :root {
      --color-bg-primary-light: #F9F4E2;
      --color-bg-primary-rgb-light: 249, 244, 226; /* NEW  with RGB values can delete later if buruk*/
      --color-bg-secondary-light: #FFFFFF;
      --color-bg-hover-light: #F0F0F0; /* NEW: A subtle light grey for hover */

      --color-text-primary-light: #000000;
       --color-bg-primary-rgb-dark: 18, 18, 18; /* NEW */
      --color-text-secondary-light: #6B7280;
      --color-text-tertiary-light: #FFFFFF;
      --color-text-quaternary-light: #000000;

      --color-accent-red: #FF7F7F;
      --color-accent-pink: #FFBEBE;

      --color-progress-track-light: #E2DDB4;
      --color-icon-muted: #9CA3AF;

      --color-bg-primary-dark: #121212;
      --color-bg-secondary-dark: #1E1E1E;
      --color-bg-hover-dark: #2A2A2A; /* NEW: A subtle dark grey for hover */

      --color-text-primary-dark: #FFFFFF;
      --color-text-secondary-dark: #9CA3AF;
      --color-text-tertiary-dark: #F9F4E2;
      --color-text-quaternary-dark: #000000;
    }

    /* Subtle transitions for theme changes */
    body {
      transition: background-color 150ms ease, color 150ms ease;
    }

    body.theme-light {
      --color-bg-primary: var(--color-bg-primary-light);
      --color-bg-primary-rgb: var(--color-bg-primary-rgb-light); /* NEW */
      --color-bg-secondary: var(--color-bg-secondary-light);
      --color-bg-hover: var(--color-bg-hover-light); /* NEW: Map to general hover variable */
      --color-text-primary: var(--color-text-primary-light);
      --color-text-secondary: var(--color-text-secondary-light);
      --color-text-tertiary: var(--color-text-tertiary-light);
      --color-text-quaternary: var(--color-text-quaternary-light);
      --color-accent: var(--color-accent-red);

      background: var(--color-bg-primary);
      color: var(--color-text-primary);
    }
    body.theme-dark {
      --color-bg-primary: var(--color-bg-primary-dark);
      --color-bg-primary-rgb: var(--color-bg-primary-rgb-dark); /* NEW */
      --color-bg-secondary: var(--color-bg-secondary-dark);
      --color-bg-hover: var(--color-bg-hover-dark); /* NEW: Map to general hover variable */
      --color-text-primary: var(--color-text-primary-dark);
      --color-text-secondary: var(--color-text-secondary-dark);
      --color-text-tertiary: var(--color-text-tertiary-dark);
      --color-text-quaternary: var(--color-text-quaternary-dark);
      --color-accent: var(--color-accent-red);

      background: var(--color-bg-primary);
      color: var(--color-text-primary);
    }
  `}</style>
);

// Ensure a default theme class is set and persisted preference applied
const ThemeInitializer = () => {
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('aura-theme') : null;
    const cls = stored === 'dark' ? 'theme-dark' : 'theme-light';
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(cls);
  }, []);
  return null;
};


function App() {
  return (
    <Router>
      {/* Global theme styles and default initializer */}
      <ThemeStylesGlobal />
      <ThemeInitializer />
      <ToastProvider> {/* <--- NEW: Wrap with ToastProvider */}
        <SocketProvider> {/* <--- NEW: Wrap with SocketProvider for single WebSocket connection */}
          <Routes>
          {/* Public Routes - Account Sign Up */}
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account-info" element={<AccountInfo />} />
          <Route path="/profile-picture" element={<ProfilePicture />} />
          <Route path="/id-verification" element={<IDVerification />} />
          <Route path="/voice-setup" element={<VoiceSetupScreen2 />} />
          <Route path="/personality-analysis" element={<PersonalityAnalysisChatbot />} />
          <Route path="/redirect" element={<Redirect />} />
          {/* <Route path="/profile" element={<ProfileSetup />} /> */}

          {/* Protected Routes - Require Authentication */}
          <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/discover/:id" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
          <Route path="/discover" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatRoute /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><ChatRoute /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="/report/submain" element={<ProtectedRoute><Submainreport /></ProtectedRoute>} />
          <Route path="/report/upload" element={<ProtectedRoute><Uploadsubmainreport /></ProtectedRoute>} />
          <Route path="/likes-me" element={<ProtectedRoute><LikedMePage /></ProtectedRoute>} />
          <Route path="/my-likes" element={<ProtectedRoute><MyLikePage /></ProtectedRoute>} />
          <Route path="/premium" element={<ProtectedRoute><PremiumUser /></ProtectedRoute>} />
          <Route path="/account-info-modification" element={<ProtectedRoute><AccountInfoModification /></ProtectedRoute>} />
          <Route path="/helpdesk" element={<ProtectedRoute><CustomerService /></ProtectedRoute>} />
        </Routes>
        </SocketProvider> {/* <--- NEW: Wrap with SocketProvider */}
      </ToastProvider> {/* <--- NEW: Wrap with ToastProvider */}
    </Router>
  );
}

export default App;




