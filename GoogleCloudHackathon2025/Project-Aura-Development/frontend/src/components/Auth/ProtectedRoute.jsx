import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute Component
 *
 * Wraps routes that require authentication. If the user is not logged in
 * (no user ID or token in localStorage), redirects to the login page.
 *
 * Usage:
 * <Route path="/discover" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
 */
const ProtectedRoute = ({ children }) => {
  const userId = localStorage.getItem('current_user_id');
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');

  // If no user ID or token, redirect to login
  if (!userId || !token) {
    console.warn('ProtectedRoute: No authentication found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected component
  return children;
};

export default ProtectedRoute;
