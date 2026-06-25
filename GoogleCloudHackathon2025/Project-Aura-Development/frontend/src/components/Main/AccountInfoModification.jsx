import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { FiUser, FiMail, FiPhone, FiUsers, FiCalendar } from 'react-icons/fi';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { InputAdornment } from '@mui/material';
import dayjs from 'dayjs';
import DocTypeDropdownSimple from '../Shared/DocTypeDropdownSimple';
import userService from '../../api/services/userService'; // Import userService

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

export default function AccountInfoModification() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState(null);

    // Form state - editable fields
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    // Read-only fields
    const [dateOfBirth, setDateOfBirth] = useState(null);
    const [gender, setGender] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    const dateInputRef = useRef(null);
    const styleRef = useRef(null);

    const isDateOfBirthValid = dateOfBirth && dayjs(dateOfBirth).isValid();

    // Validation - only check editable fields
    const allRequiredFilled =
        Boolean(fullName) &&
        Boolean(email) &&
        Boolean(phoneNumber);

    // Load user data on mount
    useEffect(() => {
        const currentUserId = localStorage.getItem('current_user_id');
        if (currentUserId) {
            setUserId(currentUserId);
        } else {
            setError('User not found. Please log in again.');
            setLoading(false);
            return;
        }

        const loadUserData = async () => {
            setLoading(true);
            try {
                const userData = await userService.getById(currentUserId);
                setFullName(userData.full_name || '');
                setEmail(userData.email || '');
                setPhoneNumber((userData.phone_number || '').replace(/\D/g, ''));
                setDateOfBirth(userData.date_of_birth ? dayjs(userData.date_of_birth) : null);
                setGender(userData.gender || '');
            } catch (err) {
                setError('Failed to load account information');
            } finally {
                setLoading(false);
            }
        };

        if (currentUserId) {
            loadUserData();
        }
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

    useEffect(() => {
        // Remove old style if it exists
        if (styleRef.current && document.head.contains(styleRef.current)) {
            document.head.removeChild(styleRef.current);
        }

        // Create new style element
        const style = document.createElement('style');
        style.textContent = `
            .custom-datepicker input {
                color: ${dateOfBirth ? '#000000' : '#9CA3AF'} !important;
                -webkit-text-fill-color: ${dateOfBirth ? '#000000' : '#9CA3AF'} !important;
            }
        `;
        document.head.appendChild(style);
        styleRef.current = style;

        return () => {
            // Only remove if it's still in the document
            if (styleRef.current && document.head.contains(styleRef.current)) {
                document.head.removeChild(styleRef.current);
            }
        };
    }, [dateOfBirth]);

    const handleSaveChanges = async () => {
        if (!allRequiredFilled) {
            setError('Please complete all fields before saving.');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const payload = {
                full_name: fullName,
                email,
                phone_number: `+${String(phoneNumber).replace(/\D/g, '')}`,
            };

            await userService.update(userId, payload);

            // Show success message
            setShowSuccessMessage(true);

            // Auto-hide success message and navigate back after 2 seconds
            setTimeout(() => {
                setShowSuccessMessage(false);
                navigate('/settings');
            }, 2000);
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Failed to update account');
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

        .account-modification-page {
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

        .section-label {
            font-size: 12px;
            font-weight: 700;
            color: var(--color-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 8px;
            margin-bottom: -8px;
        }

        .input-wrapper {
            position: relative;
            width: 100%;
        }

        .text-input {
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

        .text-input:disabled {
            background-color: rgba(0, 0, 0, 0.03);
            color: var(--color-text-secondary);
            cursor: not-allowed;
        }

        .text-input::placeholder {
            color: #9CA3AF;
            opacity: 1;
        }

        .text-input:focus:not(:disabled) {
            border-color: rgba(255, 127, 127, 0.5);
            box-shadow: 0 0 0 4px rgba(255, 127, 127, 0.18);
        }

        .input-icon-left {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-text-secondary);
            pointer-events: none;
            z-index: 1;
        }

        .input-icon-right {
            position: absolute;
            right: 24px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-text-secondary);
            pointer-events: none;
            z-index: 1;
        }

        .phone-input-container {
            position: relative;
            width: 100%;
            background-color: var(--color-bg-secondary);
            border-radius: 16px;
        }

        .date-picker-wrapper {
            width: 100%;
        }

        .date-picker-wrapper.date-empty input {
            color: #9CA3AF !important;
            -webkit-text-fill-color: #9CA3AF !important;
        }

        .date-picker-wrapper.date-filled input {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
        }

        .date-picker-wrapper input::placeholder {
            color: #9CA3AF !important;
            opacity: 1 !important;
            -webkit-text-fill-color: #9CA3AF !important;
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

        .action-button::before {
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

        .action-button:active::before {
            width: 300px;
            height: 300px;
        }

        .save-button {
            background-color: var(--color-accent-red);
            color: white;
            box-shadow: 0 2px 6px rgba(255, 127, 127, 0.18);
        }

        .save-button:hover:not(:disabled) {
            filter: brightness(0.95);
            box-shadow: 0 3px 10px rgba(255, 127, 127, 0.25);
        }

        .save-button:active:not(:disabled) {
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

        .cancel-button:active {
            transform: scale(0.98);
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

        .success-text {
            font-size: 1rem;
        }

        @keyframes successSlideIn {
            from {
                transform: translateY(-50px) scale(0.8);
                opacity: 0;
            }
            to {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
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
                    <span className="success-text">{message}</span>
                </div>
            </div>
        );
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="account-modification-page">
                <style dangerouslySetInnerHTML={{ __html: styleSheet }} />

                {/* Header */}
                <div className="header">
                    <button className="back-button" onClick={handleCancel}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="header-title">Edit Account</h1>
                </div>

                {/* Form Card */}
                <div className="form-card">
                    <div className="card-header">
                        Account Information
                    </div>
                    <div className="card-content">
                        <div className="form-container">
                            {/* Editable Fields Section */}
                            <div className="section-label">Editable Information</div>

                            {/* Full Name */}
                            <div className="input-wrapper">
                                <div className="input-icon-left">
                                    <span style={{ display: 'flex', alignItems: 'center', marginTop: '0px' }}>
                                        <FiUser size={18} />
                                    </span>
                                </div>
                                <input
                                    className="text-input"
                                    type="text"
                                    placeholder="Full Name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* Email */}
                            <div className="input-wrapper">
                                <div className="input-icon-left">
                                    <span style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                                        <FiMail size={18} />
                                    </span>
                                </div>
                                <input
                                    className="text-input"
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* Phone Number */}
                            <div className="phone-input-container">
                                <PhoneInput
                                    inputStyle={{
                                        width: '100%',
                                        height: '48px',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(0,0,0,0.06)',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        color: 'var(--color-text-primary)',
                                        paddingRight: '44px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                    }}
                                    buttonStyle={{ borderRadius: '16px 0 0 16px' }}
                                    containerStyle={{ width: '100%' }}
                                    dropdownStyle={{ borderRadius: '12px' }}
                                    country={'my'}
                                    value={phoneNumber}
                                    onChange={(value) => setPhoneNumber(String(value))}
                                    placeholder="Phone Number"
                                    disabled={loading}
                                />
                                <div className="input-icon-right">
                                    <span style={{ display: 'flex', alignItems: 'center', marginTop: '-1px'/* Adjust this value */ }}>
                                    <FiPhone size={18} />
                                    </span>
                                </div>
                            </div>

                            {/* Read-Only Fields Section */}
                            <div className="section-label">Read-Only Information</div>

                            {/* Date of Birth - Read-only */}
                            <div
                                ref={dateInputRef}
                                className={`date-picker-wrapper ${dateOfBirth ? 'date-filled' : 'date-empty'}`}
                            >
                                <DatePicker
                                    value={dateOfBirth}
                                    onChange={(newValue) => setDateOfBirth(newValue)}
                                    format="YYYY-MM-DD"
                                    disabled={true}
                                    slotProps={{
                                        textField: {
                                            variant: 'outlined',
                                            placeholder: "YYYY-MM-DD",
                                            className: 'custom-datepicker',
                                            InputProps: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <FiCalendar size={18} style={{ color: '#666666' }} />
                                                    </InputAdornment>
                                                ),
                                                style: {
                                                    borderRadius: '16px',
                                                    height: '48px',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                                                }
                                            },
                                            sx: {
                                                width: '100%',
                                                '& .MuiInputBase-input': {
                                                    padding: '12px 8px 12px 0',
                                                    fontSize: '16px',
                                                    fontFamily: "'Josefin Sans', sans-serif",
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
                                                },
                                            },
                                        },
                                    }}
                                />
                            </div>

                            {/* Gender - Read-only */}
                            <div className="input-wrapper">
                                <div className="input-icon-left">
                                    <span style={{ display: 'flex', alignItems: 'center', marginTop: '0px'/* Adjust this value */ }}>
                                    <FiUsers size={18} />
                                    </span>
                                </div>
                                <input
                                    className="text-input"
                                    type="text"
                                    placeholder="Gender"
                                    value={gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : ''}
                                    disabled={true}
                                />
                            </div>

                            {/* Error Message */}
                            {error && <div className="error-text">{error}</div>}

                            {/* Action Buttons */}
                            <div className="button-group">
                                <button
                                    className="action-button cancel-button"
                                    onClick={handleCancel}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="action-button save-button"
                                    onClick={handleSaveChanges}
                                    disabled={loading || !allRequiredFilled}
                                >
                                    {loading && <span className="loading-spinner"></span>}
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                <SuccessMessage
                    show={showSuccessMessage}
                    message="Account updated successfully!"
                />
            </div>
        </LocalizationProvider>
    );
}
