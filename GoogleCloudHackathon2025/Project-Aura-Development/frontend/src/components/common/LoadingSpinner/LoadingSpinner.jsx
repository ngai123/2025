
// src/components/common/LoadingSpinner/LoadingSpinner.jsx
import React from 'react';
import './LoadingSpinner.css'; // We'll create this CSS file next
// Assuming your logo is in src/assets/logo.svg or similar
import AuraLogo from '../../../image/logo.png'; // <--- IMPORTANT: Adjust this path to your actual logo file

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner">
        <img src={AuraLogo} alt="Aura Logo" className="loading-logo" />
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
