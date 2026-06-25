// src/components/Report.js
import React from 'react';

const Report = () => {
  const reportOptions = [
    "Explicit Content",
    "Profanity / Harassment",
    "Hostile Voice Messaging",
    "Someone under 18 is involved",
    "Suspicious Fraud / Catfishing",
    "Block",
    "Report Profile Information / Photos",
    "Advertiser / Spam"
  ];

  const handleBackClick = () => {
    // Handle back navigation
    console.log("Back button clicked");
  };

  const handleCancelClick = () => {
    // Handle cancel action
    console.log("Cancel button clicked");
  };

  const handleReportOptionClick = (option) => {
    // Handle report option selection
    console.log("Selected option:", option);
  };

  // iOS PWA viewport fix styles
  const containerStyle = {
    minHeight: '100dvh',
    height: '100dvh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  };

  return (
    <div className="flex flex-col p-4" style={containerStyle}>
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <button 
          className="text-text-light dark:text-text-dark"
          onClick={handleBackClick}
        >
          <span className="material-symbols-outlined">
            arrow_back_ios
          </span>
        </button>
        <button 
          className="text-primary font-semibold"
          onClick={handleCancelClick}
        >
          <span className="material-symbols-outlined" aria-label="Close">close</span>
        </button>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-beige-light rounded-full h-2.5 mb-8 dark:bg-gray-700">
        <div className="bg-primary h-2.5 rounded-full" style={{ width: '45%' }}></div>
      </div>

      {/* Title Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-pale-pink p-4 rounded-full mb-4">
          <span className="material-symbols-outlined text-primary text-4xl">
            flag
          </span>
        </div>
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
          What is your reason for reporting?
        </h1>
      </div>

      {/* Main Content - Report Options */}
      <main className="flex-grow space-y-3">
        {reportOptions.map((option, index) => (
          <button
            key={index}
            className="w-full flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleReportOptionClick(option)}
          >
            <span className="text-text-light dark:text-text-dark">{option}</span>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </button>
        ))}
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>
          Please tell us why you are submitting this report, and give us a chance to get better. 
          Please rest assured. The report will be submitted anonymously.
        </p>
      </footer>
    </div>
  );
};

export default Report;