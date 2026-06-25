
// src/components/common/Toast/Toast.jsx
import React, { useEffect, useState } from 'react';
import './Toast.css'; // We'll create this CSS file next

const Toast = ({ message, type, id, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show the toast with a slight delay for animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    // Auto-hide after 3 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      // Allow time for fade-out animation before removing from DOM
      const removeTimer = setTimeout(() => onClose(id), 300);
      return () => clearTimeout(removeTimer);
    }, 3000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [id, onClose]);

  const toastClass = `toast-notification ${type} ${isVisible ? 'show' : 'hide'}`;

  return (
    <div className={toastClass} role="alert">
      <div className="toast-icon">
        {type === 'success' && <span className="material-icons-outlined">check_circle</span>}
        {type === 'error' && <span className="material-icons-outlined">error_outline</span>}
        {type === 'info' && <span className="material-icons-outlined">info_outline</span>}
      </div>
      <div className="toast-message">{message}</div>
      <button className="toast-close-button" onClick={() => onClose(id)} type="button">
        <span className="material-icons-outlined">close</span>
      </button>
    </div>
  );
};

export default Toast;
