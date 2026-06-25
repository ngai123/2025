import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, X, Flag, Upload, ChevronDown, CheckCircle } from 'lucide-react';
import userService from '../../api/services/userService';
import chatService from '../../api/services/chatService';

const Uploadsubmainreport = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [reportCategory, setReportCategory] = useState(location.state?.selectedCategory || 'Suspicious Fraud / Catfishing');
  const [reportReason, setReportReason] = useState(location.state?.selectedReason || 'Impersonation');
  const chatId = location.state?.chatId;
  const [details, setDetails] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBackClick = () => {
    navigate('/report/submain', { state: { selectedOption: reportCategory, chatId } });
  };

  const handleCancelClick = () => {
    navigate('/discover');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const currentUserId = parseInt(localStorage.getItem('current_user_id') || '0', 10);
    const reportedUserId = location.state?.reportedUserId;

    try {
      if (reportedUserId) {
        await userService.blockUser(reportedUserId);
      }
      if (chatId && currentUserId) {
        await chatService.blockUser(chatId, currentUserId);
      }
      setShowThankYou(true);
    } catch {
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseThankYou = () => {
    setShowThankYou(false);
    navigate('/discover', { replace: true });
  };

  const categoryOptions = [
    'Suspicious Fraud / Catfishing',
    'Advertiser / Spam',
    'Harassment',
    'Inappropriate Content',
    'Explicit Content',
    'Profanity / Harassment'
  ];

  const reasonOptions = [
    'Sent me a suspect link',
    'Selling sexual services or content',
    'Financial products/investment scams',
    'Impersonation',
    'Promoting other social accounts',
    'Scam',
    'Unwanted sexual content',
    'Others'
  ];

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      height: 100%;
      overflow-x: hidden;
    }

    .upload-page {
      font-family: "Josefin Sans", sans-serif;
      background: #F9F4E2;
      min-height: 100vh;
      min-height: 100dvh;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .upload-container {
      max-width: 450px;
      margin: 0 auto;
      padding: 0 16px 180px 16px;
    }

    /* Header - Sticky */
    .upload-header {
      position: sticky;
      top: 0;
      background: #F9F4E2;
      z-index: 20;
      padding: 16px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .back-button {
      background: none;
      border: none;
      cursor: pointer;
      color: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      transition: all 0.25s ease;
    }

    .back-button:hover {
      background: rgba(255, 127, 127, 0.1);
    }

    .back-button:active {
      transform: scale(0.95);
    }

    .cancel-button {
      background: none;
      border: none;
      cursor: pointer;
      color: #FF7F7F;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      transition: all 0.25s ease;
    }

    .cancel-button:hover {
      background: rgba(255, 127, 127, 0.1);
    }

    .cancel-button:active {
      transform: scale(0.95);
    }

    /* Progress Bar */
    .progress-container {
      width: 100%;
      background-color: #E2DDB4;
      border-radius: 9999px;
      height: 8px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .progress-bar {
      background: linear-gradient(135deg, #FF7F7F, #fa9595ff);
      height: 100%;
      border-radius: 9999px;
      width: 100%;
      transition: width 0.3s ease;
    }

    /* Title Section */
    .title-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    .icon-container {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #FFBEBE, #FFA0A0);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(255, 127, 127, 0.25);
    }

    .icon-container svg {
      color: #FF7F7F;
      width: 32px;
      height: 32px;
    }

    .title {
      font-size: 22px;
      font-weight: 700;
      text-align: center;
      color: #FF7F7F;
      line-height: 1.3;
    }

    /* Form Card */
    .form-card {
      margin-bottom: 16px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .card-header {
      background: linear-gradient(135deg, #fd7474ff, #fa9595ff);
      padding: 10px 16px;
      text-align: center;
      color: white;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    .card-body {
      background: #F9F4E2;
      padding: 20px 16px;
    }

    /* Form Elements */
    .form-group {
      margin-bottom: 20px;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }

    .form-label-optional {
      font-weight: 400;
      color: #6B7280;
      font-size: 12px;
    }

    .select-wrapper {
      position: relative;
    }

    .form-select {
      width: 100%;
      padding: 14px 44px 14px 16px;
      border: 2px solid #E8DCC8;
      border-radius: 12px;
      font-size: 14px;
      font-family: "Josefin Sans", sans-serif;
      background: #FFFFFF;
      color: #333;
      cursor: pointer;
      appearance: none;
      transition: all 0.25s ease;
    }

    .form-select:focus {
      outline: none;
      border-color: #FF7F7F;
      box-shadow: 0 0 0 3px rgba(255, 127, 127, 0.1);
    }

    .select-icon {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #9CA3AF;
      pointer-events: none;
    }

    .form-textarea {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #E8DCC8;
      border-radius: 12px;
      font-size: 14px;
      font-family: "Josefin Sans", sans-serif;
      background: #FFFFFF;
      color: #333;
      resize: vertical;
      min-height: 120px;
      transition: all 0.25s ease;
      line-height: 1.5;
    }

    .form-textarea:focus {
      outline: none;
      border-color: #FF7F7F;
      box-shadow: 0 0 0 3px rgba(255, 127, 127, 0.1);
    }

    .form-textarea::placeholder {
      color: #9CA3AF;
    }

    /* File Upload */
    .upload-area {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .upload-box {
      position: relative;
      width: 100px;
      height: 100px;
      background: #FFFFFF;
      border: 2px dashed #FF7F7F;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .upload-box:hover {
      background: rgba(255, 127, 127, 0.05);
      border-color: #fd7474ff;
    }

    .upload-box input {
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    .upload-box svg {
      color: #FF7F7F;
      margin-bottom: 4px;
    }

    .upload-box-text {
      font-size: 11px;
      color: #6B7280;
    }

    .file-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .file-name {
      font-size: 12px;
      color: #6B7280;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .file-name svg {
      color: #2ECC71;
    }

    .success-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(46, 204, 113, 0.1);
      border-radius: 8px;
      font-size: 12px;
      color: #2ECC71;
      font-weight: 600;
    }

    .image-preview {
      max-width: 100%;
      max-height: 200px;
      border-radius: 12px;
      object-fit: cover;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    /* Fixed Footer */
    .upload-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-width: 450px;
      margin: 0 auto;
      padding: 16px 20px 24px;
      background: #F9F4E2;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
      z-index: 100;
    }

    .submit-button {
      width: 100%;
      background: linear-gradient(135deg, #FF7F7F, #fa9595ff);
      color: white;
      border: none;
      border-radius: 20px;
      padding: 16px;
      font-size: 16px;
      font-weight: 700;
      font-family: "Josefin Sans", sans-serif;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 16px rgba(255, 127, 127, 0.35);
      letter-spacing: 1px;
    }

    .submit-button:hover:not(:disabled) {
      transform: scale(1.02);
      box-shadow: 0 6px 24px rgba(255, 127, 127, 0.45);
    }

    .submit-button:active:not(:disabled) {
      transform: scale(0.98);
    }

    .submit-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .footer-text {
      text-align: center;
      font-size: 11px;
      color: #6B7280;
      margin-top: 12px;
      line-height: 1.5;
    }

    /* Thank You Popup */
    .popup-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease;
      padding: 20px;
    }

    .popup-content {
      background: #F9F4E2;
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 360px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    }

    .popup-icon {
      font-size: 56px;
      margin-bottom: 16px;
    }

    .popup-title {
      font-size: 24px;
      font-weight: 700;
      color: #FF7F7F;
      margin-bottom: 12px;
    }

    .popup-message {
      font-size: 14px;
      color: #6B7280;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    .popup-button {
      background: linear-gradient(135deg, #FF7F7F, #fa9595ff);
      color: white;
      border: none;
      border-radius: 20px;
      padding: 14px 48px;
      font-size: 16px;
      font-weight: 700;
      font-family: "Josefin Sans", sans-serif;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 16px rgba(255, 127, 127, 0.35);
    }

    .popup-button:hover {
      transform: scale(1.02);
      box-shadow: 0 6px 24px rgba(255, 127, 127, 0.45);
    }

    .popup-button:active {
      transform: scale(0.98);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        transform: translateY(30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    /* Mobile Responsive */
    @media (max-width: 430px) {
      .upload-container {
        padding: 0 14px 170px 14px;
      }

      .title {
        font-size: 20px;
      }

      .card-body {
        padding: 16px 14px;
      }

      .upload-footer {
        padding: 14px 16px 20px;
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="upload-page">
        <div className="upload-container">
          {/* Header */}
          <header className="upload-header">
            <button
              className="back-button"
              onClick={handleBackClick}
              aria-label="Go back"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              className="cancel-button"
              onClick={handleCancelClick}
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </header>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-bar"></div>
          </div>

          {/* Title Section */}
          <div className="title-section">
            <div className="icon-container">
              <Flag />
            </div>
            <h1 className="title">Submit Your Report</h1>
          </div>

          {/* Form Card */}
          <div className="form-card">
            <div className="card-header">Report Details</div>
            <div className="card-body">
              {/* Category Select */}
              <div className="form-group">
                <label className="form-label" htmlFor="report-category">
                  Report Category
                </label>
                <div className="select-wrapper">
                  <select
                    className="form-select"
                    id="report-category"
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                  >
                    {categoryOptions.map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="select-icon" />
                </div>
              </div>

              {/* Reason Select */}
              <div className="form-group">
                <label className="form-label" htmlFor="report-reason">
                  Report Reason
                </label>
                <div className="select-wrapper">
                  <select
                    className="form-select"
                    id="report-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                  >
                    {reasonOptions.map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="select-icon" />
                </div>
              </div>

              {/* File Upload */}
              <div className="form-group">
                <label className="form-label">
                  Upload Screenshots <span className="form-label-optional">(Optional)</span>
                </label>
                <div className="upload-area">
                  <div className="upload-box">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                    <Upload size={24} />
                    <span className="upload-box-text">Add File</span>
                  </div>

                  {uploadedFile && (
                    <div className="file-info">
                      <div className="file-name">
                        <CheckCircle size={14} />
                        {uploadedFile.name}
                      </div>
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="success-badge">
                      <CheckCircle size={14} />
                      File uploaded successfully!
                    </div>
                  )}

                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="image-preview"
                    />
                  )}
                </div>
              </div>

              {/* Details Textarea */}
              <div className="form-group">
                <label className="form-label" htmlFor="details">
                  Details of the Incident <span className="form-label-optional">(Optional)</span>
                </label>
                <textarea
                  className="form-textarea"
                  id="details"
                  placeholder="• Tell us whether it happened on Aura or elsewhere&#10;• How this user's actions have affected you&#10;• Other evidence (e.g., Chat history on other platforms)"
                  rows="5"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="upload-footer">
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
          <p className="footer-text">
            Your report will be submitted anonymously. We take all reports seriously and will review this matter promptly.
          </p>
        </div>

        {/* Thank You Popup */}
        {showThankYou && (
          <div className="popup-overlay">
            <div className="popup-content">
              <div className="popup-icon">
                <CheckCircle size={56} color="#2ECC71" />
              </div>
              <h2 className="popup-title">Thank You!</h2>
              <p className="popup-message">
                Your report has been submitted successfully. We take all reports seriously and will review this matter promptly. Thank you for helping us maintain a safe community.
              </p>
              <button className="popup-button" onClick={handleCloseThankYou}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Uploadsubmainreport;
