import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronLeft, X, Flag, AlertTriangle, MessageSquareWarning, Mic, UserX, Shield, Ban, Image, Megaphone } from 'lucide-react';

const ReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const chatId = location.state?.chatId;

  const reportOptions = [
    { text: 'Explicit Content', icon: AlertTriangle, colorClass: 'icon-alert' },
    { text: 'Profanity / Harassment', icon: MessageSquareWarning, colorClass: 'icon-warning' },
    { text: 'Hostile Voice Messaging', icon: Mic, colorClass: 'icon-mic' },
    { text: 'Someone under 18 is involved', icon: UserX, colorClass: 'icon-user' },
    { text: 'Suspicious Fraud / Catfishing', icon: Shield, colorClass: 'icon-shield' },
    { text: 'Block', icon: Ban, colorClass: 'icon-ban' },
    { text: 'Report Profile Information / Photos', icon: Image, colorClass: 'icon-image' },
    { text: 'Advertiser / Spam', icon: Megaphone, colorClass: 'icon-spam' }
  ];

  const handleOptionClick = (option) => {
    if (option === 'Suspicious Fraud / Catfishing') {
      navigate('/report/submain', { state: { selectedOption: option, chatId } });
    } else {
      console.log(`Selected: ${option}`);
    }
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .report-page {
      font-family: "Josefin Sans", sans-serif;
      background: #F9F4E2;
      min-height: 100vh;
      min-height: 100dvh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .report-container {
      max-width: 450px;
      margin: 0 auto;
      padding: 0 16px 120px 16px;
      position: relative;
    }

    /* Header - Sticky */
    .report-header {
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
      width: 33%;
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

    /* Report Card */
    .report-card {
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
      padding: 8px 0;
    }

    /* Report Options - Settings Style */
    .report-option-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      cursor: pointer;
      background: none;
      border-left: none;
      border-right: none;
      border-top: none;
      width: 100%;
      text-align: left;
      font-family: inherit;
    }

    .report-option-container::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 127, 127, 0.15);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .report-option-container:active::before {
      width: 300px;
      height: 300px;
    }

    .report-option-container:hover {
      background-color: rgba(255, 127, 127, 0.04);
    }

    .report-option-container:active {
      background-color: rgba(255, 127, 127, 0.08);
      transform: scale(0.98);
    }

    .report-option-container:last-child {
      border-bottom: none;
    }

    .report-option {
      display: flex;
      align-items: center;
      flex: 1;
      gap: 14px;
    }

    .option-icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.25s ease;
      color: white;
      font-size: 18px;
    }

    .report-option-container:hover .option-icon-wrapper {
      transform: scale(1.05);
    }

    .icon-alert { background: linear-gradient(135deg, #FF6B6B, #FF8E8E); }
    .icon-warning { background: linear-gradient(135deg, #FF7F7F, #FFA0A0); }
    .icon-mic { background: linear-gradient(135deg, #E67E22, #F39C12); }
    .icon-user { background: linear-gradient(135deg, #9B59B6, #A569BD); }
    .icon-shield { background: linear-gradient(135deg, #3498DB, #5DADE2); }
    .icon-ban { background: linear-gradient(135deg, #E74C3C, #EC7063); }
    .icon-image { background: linear-gradient(135deg, #2ECC71, #58D68D); }
    .icon-spam { background: linear-gradient(135deg, #F39C12, #F7DC6F); }

    .option-text {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      line-height: 1.3;
    }

    .chevron-icon {
      color: #9CA3AF;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }

    .report-option-container:hover .chevron-icon {
      transform: translateX(4px);
      color: #FF7F7F;
    }

    /* Footer */
    .report-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
      line-height: 1.6;
      padding: 0 16px;
    }

    /* Mobile Responsive */
    @media (max-width: 430px) {
      .report-container {
        padding: 0 14px 100px 14px;
      }

      .title {
        font-size: 20px;
      }

      .option-icon-wrapper {
        width: 36px;
        height: 36px;
      }

      .option-text {
        font-size: 13px;
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="report-page">
        <div className="report-container">
          {/* Header */}
          <header className="report-header">
            <button
              className="back-button"
              onClick={() => navigate(chatId ? `/chat/${chatId}` : '/chat', { state: { fromReport: true } })}
              aria-label="Go back"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              className="cancel-button"
              onClick={() => navigate('/discover')}
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
            <h1 className="title">What is your reason for reporting?</h1>
          </div>

          {/* Report Options Card */}
          <div className="report-card">
            <div className="card-header">Select a Reason</div>
            <div className="card-body">
              {reportOptions.map((option, index) => (
                <button
                  key={index}
                  className="report-option-container"
                  onClick={() => handleOptionClick(option.text)}
                >
                  <div className="report-option">
                    <div className={`option-icon-wrapper ${option.colorClass}`}>
                      <option.icon size={18} />
                    </div>
                    <span className="option-text">{option.text}</span>
                  </div>
                  <ChevronRight size={18} className="chevron-icon" />
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="report-footer">
            <p>
              Please tell us why you are submitting this report, and give us a chance to get better.
              Your report will be submitted anonymously.
            </p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default ReportPage;
