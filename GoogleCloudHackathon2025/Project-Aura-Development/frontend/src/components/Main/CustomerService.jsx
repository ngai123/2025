import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiMail, FiMessageSquare } from 'react-icons/fi';

// --- CONFIGURATION ---
const CONFIG = {
    COLORS: {
        '--color-bg-primary-light': '#F9F4E2',
        '--color-bg-secondary-light': '#FFFFFF',
        '--color-text-primary-light': '#333333',
        '--color-text-secondary-light': '#6B7280',
        '--color-accent-red': '#FF7F7F',
        '--color-accent-pink': '#FFBEBE',
        '--color-icon-muted': '#9CA3AF',
        '--font-primary': "'Josefin Sans', sans-serif",
    }
};

export default function CustomerService() {
    const navigate = useNavigate();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    const allRequiredFilled = Boolean(subject) && Boolean(message);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!allRequiredFilled) {
            setError('Please fill in both subject and message.');
            return;
        }

        setError(null);
        setLoading(true);

        // Mock API call
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            // In a real app, you would send the data to your backend here
            // e.g., await customerService.submitFeedback({ subject, message });
            console.log('Submitting feedback:', { subject, message });

            setShowSuccessMessage(true);
            setTimeout(() => {
                setShowSuccessMessage(false);
                navigate('/settings');
            }, 2000);
        } catch (err) {
            setError('Failed to submit feedback. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/settings');
    };

    const styleSheet = `
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        :root {
            --color-bg-primary: ${CONFIG.COLORS['--color-bg-primary-light']};
            --color-bg-secondary: ${CONFIG.COLORS['--color-bg-secondary-light']};
            --color-text-primary: ${CONFIG.COLORS['--color-text-primary-light']};
            --color-text-secondary: ${CONFIG.COLORS['--color-text-secondary-light']};
            --color-accent-red: ${CONFIG.COLORS['--color-accent-red']};
            --color-accent-pink: ${CONFIG.COLORS['--color-accent-pink']};
            --color-icon-muted: ${CONFIG.COLORS['--color-icon-muted']};
            --font-primary: ${CONFIG.COLORS['--font-primary']};
        }

        .customer-service-page {
            font-family: var(--font-primary);
            background-color: #F9F4E2;
            color: var(--color-text-primary);
            min-height: 100dvh;
            padding: 0 8px 70px;
            max-width: 450px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 12px;
            background-color: #F9F4E2;
            position: sticky;
            top: 0;
            z-index: 20;
        }

        .back-button {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 8px;
            display: flex;
            align-items: center;
            color: var(--color-text-primary);
            font-size: 14px;
            font-weight: 600;
            transition: opacity 0.2s;
        }

        .back-button:hover {
            opacity: 0.7;
        }

        .header-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            flex: 1;
            text-align: center;
            margin-right: 40px;
        }

        .form-card {
            margin: 10px 4px 20px;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .card-header {
            background: linear-gradient(135deg, #fd7474ff, #fa9595ff);
            padding: 16px;
            text-align: center;
            color: white;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            border-bottom: 1px solid #F9F4E2;
        }

        .card-content {
            padding: 24px;
            background-color: #F9F4E2;
            border-radius: 0 0 24px 24px;
        }

        .form-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .input-wrapper {
            position: relative;
            width: 100%;
        }

        .text-input, .textarea-input {
            width: 100%;
            padding: 12px 16px;
            padding-left: 40px;
            border-radius: 16px;
            border: 1px solid rgba(0, 0, 0, 0.06);
            font-size: 16px;
            outline: none;
            background-color: var(--color-bg-secondary);
            color: var(--color-text-primary);
            transition: border-color 150ms ease, box-shadow 150ms ease;
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            box-sizing: border-box;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        
        .textarea-input {
            min-height: 120px;
            resize: vertical;
        }

        .text-input::placeholder, .textarea-input::placeholder {
            color: #9CA3AF;
            opacity: 1;
        }

        .text-input:focus, .textarea-input:focus {
            border-color: rgba(255, 127, 127, 0.5);
            box-shadow: 0 0 0 4px rgba(255, 127, 127, 0.18);
        }

        .input-icon-left {
            position: absolute;
            left: 12px;
            top: 14px;
            color: var(--color-text-secondary);
            pointer-events: none;
            z-index: 1;
        }

        .error-text {
            color: #DC2626;
            font-weight: 600;
            font-size: 14px;
            text-align: center;
        }

        .button-group {
            display: flex;
            gap: 12px;
            margin-top: 8px;
        }

        .action-button {
            flex: 1;
            padding: 14px;
            font-family: var(--font-primary);
            font-size: 16px;
            font-weight: 700;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            border: none;
            position: relative;
            overflow: hidden;
        }

        .action-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .submit-button {
            background-color: var(--color-accent-red);
            color: white;
            box-shadow: 0 2px 6px rgba(255, 127, 127, 0.18);
        }

        .submit-button:hover:not(:disabled) {
            filter: brightness(0.95);
            box-shadow: 0 3px 10px rgba(255, 127, 127, 0.25);
        }

        .submit-button:active:not(:disabled) {
            transform: scale(0.98);
        }

        .cancel-button {
            background-color: var(--color-bg-secondary);
            color: var(--color-text-primary);
            border: 1.5px solid var(--color-accent-pink);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .cancel-button:hover {
            background-color: rgba(255, 127, 127, 0.05);
            border-color: var(--color-accent-red);
        }

        .success-message-overlay {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1100;
            pointer-events: none;
        }

        .success-message {
            background-color: var(--color-accent-red);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            animation: successSlideIn 0.3s ease-out;
            font-family: var(--font-primary);
            font-weight: 600;
            max-width: 90%;
        }

        .success-icon {
            font-size: 24px;
        }

        @keyframes successSlideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.6s linear infinite;
            margin-right: 8px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;

    const SuccessMessage = ({ show, message }) => {
        if (!show) return null;
        return (
            <div className="success-message-overlay">
                <div className="success-message">
                    <span className="material-symbols-outlined success-icon">check_circle</span>
                    <span>{message}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="customer-service-page">
            <style dangerouslySetInnerHTML={{ __html: styleSheet }} />

            <div className="header">
                <button className="back-button" onClick={handleCancel}>
                    <FiChevronLeft size={24} />
                </button>
                <h1 className="header-title">Contact Us</h1>
            </div>

            <div className="form-card">
                <div className="card-header">
                    Feedback & Support
                </div>
                <div className="card-content">
                    <form className="form-container" onSubmit={handleSubmit}>
                        <div className="input-wrapper">
                            <div className="input-icon-left">
                                <FiMail size={18} />
                            </div>
                            <input
                                className="text-input"
                                type="text"
                                placeholder="Subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="input-wrapper">
                            <div className="input-icon-left">
                                <FiMessageSquare size={18} />
                            </div>
                            <textarea
                                className="textarea-input"
                                placeholder="Your message..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        {error && <div className="error-text">{error}</div>}

                        <div className="button-group">
                            <button
                                type="button"
                                className="action-button cancel-button"
                                onClick={handleCancel}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="action-button submit-button"
                                disabled={loading || !allRequiredFilled}
                            >
                                {loading && <span className="loading-spinner"></span>}
                                {loading ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <SuccessMessage
                show={showSuccessMessage}
                message="Feedback submitted successfully!"
            />
        </div>
    );
}
