import React, { useState } from 'react';
import { FaInfinity, FaHeart, FaKissWinkHeart, FaLockOpen, FaAward, FaCrown, FaCreditCard } from 'react-icons/fa';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const PremiumPayNew = ({ onClosePremiumPay, onSubscriptionSuccess }) => {
    const [selectedCard, setSelectedCard] = useState('1 Month');
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    // Payment form states
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [cardName, setCardName] = useState('');
    const [cardType, setCardType] = useState(null);
    const [saveCard, setSaveCard] = useState(false);

    const navigate = useNavigate();

    // Detect card type
    const detectCardType = (number) => {
        const cleanNumber = number.replace(/\s/g, '');
        if (/^4/.test(cleanNumber)) return { type: 'visa', name: 'Visa', color: '#1A1F71', maxLength: 16 };
        if (/^5[1-5]/.test(cleanNumber)) return { type: 'mastercard', name: 'Mastercard', color: '#EB001B', maxLength: 16 };
        if (/^3[47]/.test(cleanNumber)) return { type: 'amex', name: 'American Express', color: '#006FCF', maxLength: 15 };
        return null;
    };

    // Format card number with spaces every 4 digits
    const formatCardNumber = (value) => {
        const cleanValue = value.replace(/\s/g, '');
        const detectedType = detectCardType(cleanValue);
        setCardType(detectedType);

        const maxLength = detectedType?.maxLength || 16;
        const limitedValue = cleanValue.slice(0, maxLength);

        let formatted = '';
        for (let i = 0; i < limitedValue.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formatted += ' ';
            }
            formatted += limitedValue[i];
        }

        return formatted;
    };

    // Format expiry as MM/YY
    const formatExpiry = (value) => {
        const cleanValue = value.replace(/\D/g, '');
        if (cleanValue.length >= 2) {
            return cleanValue.slice(0, 2) + '/' + cleanValue.slice(2, 4);
        }
        return cleanValue;
    };

    const handleCardNumberChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        setCardNumber(formatCardNumber(value));
    };

    const handleExpiryChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 4) {
            setExpiry(formatExpiry(value));
        }
    };

    const handleCvcChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        const maxLength = cardType?.type === 'amex' ? 4 : 3;
        if (value.length <= maxLength) {
            setCvc(value);
        }
    };

    const handleCardSelect = (period) => {
        setSelectedCard(period);
    };

    const handleClose = () => {
        if (onClosePremiumPay) {
            onClosePremiumPay();
        } else {
            navigate(-1);
        }
    };

    const [showVerifyGate, setShowVerifyGate] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const handleVerifyAndContinue = async () => {
        const idRaw = localStorage.getItem('current_user_id');
        const currentUserId = idRaw ? Number(idRaw) : null;

        if (!currentUserId) {
            alert('No user ID found. Please log in again.');
            return;
        }

        setVerifying(true);
        try {
            await api.put(`/profile/verify/${currentUserId}`);
            setShowVerifyGate(false);
            setShowPaymentForm(true);
        } catch (error) {
            console.error('Verification failed:', error);
            alert('Verification failed. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handleContinue = async () => {
        const idRaw = localStorage.getItem('current_user_id');
        const currentUserId = idRaw ? Number(idRaw) : null;
        try {
            let uid = currentUserId;
            if (!uid) {
                const userRaw = localStorage.getItem('user');
                uid = userRaw ? JSON.parse(userRaw)?.id : null;
            }
            if (!uid) {
                setShowVerifyGate(true);
                return;
            }
            const { data } = await api.get(`/users/${uid}`);
            const isVerified = !!data?.is_verified;
            if (isVerified) {
                setShowPaymentForm(true);
            } else {
                setShowVerifyGate(true);
            }
        } catch (e) {
            setShowVerifyGate(true);
        }
    };

    const handleMockPaymentSubmit = async (e) => {
        e.preventDefault();
        setPaymentProcessing(true);
        const idRaw = localStorage.getItem('current_user_id');
        const currentUserId = idRaw ? Number(idRaw) : null;
        if (!currentUserId) {
            alert('No authenticated user found. Please log in again.');
            setPaymentProcessing(false);
            return;
        }

        try {
            const paymentDetails = {
                cardNumber: cardNumber.replace(/\s/g, ''),
                expiry,
                cvc,
                cardName,
                cardType: cardType?.name || 'Unknown',
                saveCard
            };

            await api.post('/payment/process-mock', {
                userId: currentUserId,
                subscriptionPeriod: selectedCard,
                paymentDetails: paymentDetails
            });

            localStorage.setItem('isPremiumUser', 'true');
            setShowPaymentForm(false);

            setCardNumber('');
            setExpiry('');
            setCvc('');
            setCardName('');
            setCardType(null);
            setSaveCard(false);

            setShowSuccessPopup(true);

            setTimeout(() => {
                setShowSuccessPopup(false);
                if (onSubscriptionSuccess) {
                    onSubscriptionSuccess();
                } else {
                    navigate('/likes-me', { state: { isPremiumUser: true } });
                }
            }, 2000);

        } catch (error) {
            console.error('Error during mock payment or subscription:', error.message);
            alert(`Payment failed: ${error.message}. Please try again.`);
        } finally {
            setPaymentProcessing(false);
        }
    };

    const getCardIcon = () => {
        if (!cardType) return <FaCreditCard style={{ color: '#999', fontSize: '20px' }} />;

        const iconColors = {
            visa: '#1A1F71',
            mastercard: '#EB001B',
            amex: '#006FCF'
        };

        return <FaCreditCard style={{ color: iconColors[cardType.type], fontSize: '20px' }} />;
    };

    const pricingPlans = [
        { period: '1 Week', price: '9.60', perWeek: null },
        { period: '1 Month', price: '19.60', perWeek: '4.90', popular: true },
        { period: '3 Months', price: '46.90', perWeek: '3.90' }
    ];

    const privileges = [
        { icon: FaInfinity, title: 'Unlimited Likes', description: null, colorClass: 'icon-infinity' },
        { icon: FaHeart, title: 'See Who Likes You', description: null, colorClass: 'icon-heart' },
        { icon: FaKissWinkHeart, title: '30 Free Crushes Per Month', description: null, colorClass: 'icon-crush' },
        { icon: FaLockOpen, title: 'Unlock My Likes', description: "See everyone you've liked. Send Crush when you don't feel like waiting.", colorClass: 'icon-unlock' },
        { icon: FaAward, title: 'Premium Icon', description: 'Increase your matching chance by 2.5x. You can choose to hide it to keep it low-key.', colorClass: 'icon-badge' }
    ];

    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600;700&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .premium-page {
            font-family: "Josefin Sans", sans-serif;
            background: #F9F4E2;
            min-height: 100vh;
            min-height: 100dvh;
        }

        .premium-container {
            max-width: 450px;
            margin: 0 auto;
            padding: 0 16px 180px 16px;
            position: relative;
        }

        /* Header - Left aligned */
        .premium-header {
            position: sticky;
            top: 0;
            background: #F9F4E2;
            z-index: 20;
            padding: 16px 0;
            display: flex;
            align-items: center;
            justify-content: flex-start;
        }

        .header-title {
            font-size: 24px;
            font-weight: 700;
            color: #333;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .crown-icon-wrapper {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            position: relative;
            top: -4px; /* Adjust Y position here */
        }

        .header-title .crown-icon {
            color: #FF7F7F;
            font-size: 20px;
        }

        /* Card Component - Matches Settings Page */
        .premium-card {
            margin-bottom: 12px;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .card-header {
            background: linear-gradient(135deg, #fd7474ff, #fa9595ff);
            padding: 8px 16px;
            text-align: center;
            color: white;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }

        .card-body {
            background: #F9F4E2;
            padding: 16px;
        }

        /* Pricing Cards */
        .pricing-grid {
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        .price-option {
            flex: 1;
            max-width: 120px;
            background: #FFFFFF;
            border-radius: 16px;
            padding: 16px 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.25s ease;
            border: 2px solid transparent;
            position: relative;
        }

        .price-option:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 127, 127, 0.15);
        }

        .price-option.selected {
            border-color: #FF7F7F;
            background: rgba(255, 127, 127, 0.08);
        }

        .price-option.popular {
            max-width: 130px;
        }

        .popular-badge {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #FF7F7F, #fa9595ff);
            color: white;
            padding: 4px 10px;
            border-radius: 10px;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.5px;
            white-space: nowrap;
        }

        .period-label {
            font-size: 12px;
            font-weight: 600;
            color: #666;
            margin-bottom: 8px;
        }

        .price-amount {
            font-size: 20px;
            font-weight: 700;
            color: #FF7F7F;
            margin-bottom: 4px;
        }

        .price-amount .currency {
            font-size: 14px;
        }

        .per-week {
            font-size: 10px;
            color: #999;
        }

        .selected-check {
            position: absolute;
            top: 12px;
            right: 8px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #FF7F7F;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .price-option.popular .selected-check {
            top: 18px;
        }

        /* Scrollable container for privileges - iOS PWA fix */
        .privileges-scroll-container {
            max-height: calc(100vh - 420px);
            max-height: calc(100dvh - 420px);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 8px;
            margin-bottom: 0;
        }

        /* Privilege Items - Matches Settings Link Style */
        .privilege-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .privilege-item:last-child {
            border-bottom: none;
        }

        .privilege-icon-wrapper {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-right: 14px;
            color: white;
            font-size: 16px;
        }

        .icon-infinity { background: linear-gradient(135deg, #FFA0A0, #FFBEBE); }
        .icon-heart { background: linear-gradient(135deg, #FF7F7F, #FFA0A0); }
        .icon-crush { background: linear-gradient(135deg, #2ECC71, #58D68D); }
        .icon-unlock { background: linear-gradient(135deg, #E67E22, #F39C12); }
        .icon-badge { background: linear-gradient(135deg, #F39C12, #F7DC6F); }

        .privilege-content {
            flex: 1;
        }

        .privilege-title {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 2px;
        }

        .privilege-description {
            font-size: 11px;
            color: #6B7280;
            line-height: 1.4;
        }

        .privilege-chevron {
            color: #9CA3AF;
            flex-shrink: 0;
        }

        /* Fixed Footer */
        .premium-footer {
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

        .cta-button {
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
            margin-bottom: 12px;
        }

        .cta-button:hover {
            transform: scale(1.02);
            box-shadow: 0 6px 24px rgba(255, 127, 127, 0.45);
        }

        .cta-button:active {
            transform: scale(0.98);
        }

        .back-button-footer {
            width: 100%;
            background: transparent;
            color: #FF7F7F;
            border: 2px solid #FF7F7F;
            border-radius: 20px;
            padding: 14px;
            font-size: 16px;
            font-weight: 700;
            font-family: "Josefin Sans", sans-serif;
            cursor: pointer;
            transition: all 0.25s ease;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }

        .back-button-footer:hover {
            background: rgba(255, 127, 127, 0.1);
            transform: scale(1.02);
        }

        .back-button-footer:active {
            transform: scale(0.98);
        }

        .footer-text {
            text-align: center;
            font-size: 12px;
            color: #6B7280;
            margin-bottom: 6px;
        }

        .footer-terms {
            text-align: center;
            font-size: 10px;
            color: #9CA3AF;
            line-height: 1.5;
        }

        .footer-terms a {
            color: #FF7F7F;
            text-decoration: none;
            font-weight: 600;
        }

        /* Popup Overlay */
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
            background: #FFFFFF;
            border-radius: 24px;
            padding: 40px 32px;
            max-width: 400px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        }

        .popup-crown {
            font-size: 48px;
            color: #FF7F7F;
            margin-bottom: 16px;
        }

        .popup-title {
            font-size: 24px;
            font-weight: 700;
            color: #333;
            margin-bottom: 12px;
        }

        .popup-message {
            font-size: 16px;
            color: #6B7280;
            line-height: 1.5;
        }

        /* Payment Form */
        .payment-form-content {
            padding: 24px;
            max-width: 420px;
            text-align: left;
            max-height: 90vh;
            overflow-y: auto;
            background: #F9F4E2;
            border-radius: 24px;
        }

        .payment-form-header {
            margin-bottom: 20px;
            text-align: center;
        }

        .payment-form-title {
            font-size: 22px;
            font-weight: 700;
            color: #333;
            margin-bottom: 6px;
        }

        .payment-form-subtitle {
            font-size: 12px;
            color: #6B7280;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        /* Card Preview */
        .card-preview {
            background: linear-gradient(145deg, #FF7F7F 0%, #fa9595ff 50%, #FFBEBE 100%);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
            color: white;
            box-shadow: 0 8px 24px rgba(255, 127, 127, 0.35);
            position: relative;
            overflow: hidden;
            aspect-ratio: 1.6 / 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .card-preview-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .card-preview-type {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            opacity: 0.9;
            font-weight: 600;
        }

        .card-preview-chip {
            width: 36px;
            height: 26px;
            background: linear-gradient(135deg, #FFF 0%, #E8E8E8 100%);
            border-radius: 4px;
            opacity: 0.9;
        }

        .card-preview-number {
            font-family: 'SF Mono', 'Courier New', monospace;
            font-size: 18px;
            letter-spacing: 2px;
            font-weight: 500;
        }

        .card-preview-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .card-preview-label {
            font-size: 9px;
            text-transform: uppercase;
            opacity: 0.7;
            margin-bottom: 2px;
            letter-spacing: 1px;
        }

        .card-preview-value {
            font-size: 13px;
            font-weight: 600;
        }

        .card-preview-expires-box {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 8px 12px;
            text-align: center;
        }

        /* Form Fields */
        .form-group {
            margin-bottom: 16px;
        }

        .form-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #333;
            margin-bottom: 6px;
        }

        .form-input {
            width: 100%;
            padding: 12px 14px;
            border-radius: 12px;
            border: 2px solid #E8DCC8;
            font-size: 14px;
            font-family: "Josefin Sans", sans-serif;
            outline: none;
            transition: all 0.25s ease;
            background: #FFFFFF;
            color: #333;
        }

        .form-input::placeholder {
            color: #9CA3AF;
        }

        .form-input:focus {
            border-color: #FF7F7F;
            box-shadow: 0 0 0 3px rgba(255, 127, 127, 0.1);
        }

        .form-input-with-icon {
            position: relative;
        }

        .form-input-icon {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            color: #FF7F7F;
        }

        .form-row {
            display: flex;
            gap: 12px;
        }

        .form-row .form-group {
            flex: 1;
        }

        .card-type-badge {
            font-size: 11px;
            color: #FF7F7F;
            margin-top: 4px;
            font-weight: 600;
        }

        /* Save Card Section */
        .save-card-section {
            margin: 16px 0;
            padding: 14px;
            background: rgba(255, 127, 127, 0.05);
            border-radius: 12px;
            border: 1px solid rgba(255, 127, 127, 0.1);
        }

        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        }

        .checkbox-input {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #FF7F7F;
        }

        .checkbox-label {
            font-size: 13px;
            color: #333;
            font-weight: 600;
            cursor: pointer;
        }

        .checkbox-description {
            font-size: 11px;
            color: #6B7280;
            margin-top: 4px;
            margin-left: 28px;
        }

        /* Payment Button */
        .payment-btn {
            width: 100%;
            background: linear-gradient(135deg, #FF7F7F, #fa9595ff);
            color: white;
            border: none;
            border-radius: 16px;
            padding: 14px;
            font-size: 16px;
            font-weight: 700;
            font-family: "Josefin Sans", sans-serif;
            cursor: pointer;
            transition: all 0.25s ease;
            box-shadow: 0 4px 16px rgba(255, 127, 127, 0.35);
            margin-top: 8px;
        }

        .payment-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 127, 127, 0.45);
        }

        .payment-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: #9CA3AF;
            box-shadow: none;
        }

        .cancel-btn {
            width: 100%;
            background: none;
            border: none;
            color: #6B7280;
            padding: 12px;
            font-size: 14px;
            font-weight: 600;
            font-family: "Josefin Sans", sans-serif;
            cursor: pointer;
            margin-top: 8px;
            transition: color 0.2s ease;
        }

        .cancel-btn:hover {
            color: #FF7F7F;
        }

        /* Verify Gate Modal */
        .verify-modal {
            text-align: center;
        }

        .verify-modal .popup-title {
            font-size: 20px;
            line-height: 1.4;
        }

        .verify-btn {
            background: linear-gradient(135deg, #FF7F7F, #fa9595ff);
            color: white;
            border: none;
            border-radius: 20px;
            padding: 14px 32px;
            font-size: 16px;
            font-weight: 700;
            font-family: "Josefin Sans", sans-serif;
            cursor: pointer;
            transition: all 0.25s ease;
            box-shadow: 0 4px 16px rgba(255, 127, 127, 0.35);
            margin-top: 16px;
        }

        .verify-btn:hover:not(:disabled) {
            transform: scale(1.02);
        }

        .verify-btn:disabled {
            opacity: 0.7;
        }

        .close-modal-btn {
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            font-size: 24px;
            color: #9CA3AF;
            cursor: pointer;
            line-height: 1;
        }

        .close-modal-btn:hover {
            color: #FF7F7F;
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
            .premium-container {
                padding: 0 14px 170px 14px;
            }

            .price-option {
                padding: 14px 10px;
            }

            .price-amount {
                font-size: 18px;
            }

            .popup-overlay {
                padding: 0;
                align-items: flex-end;
            }

            .payment-form-content {
                border-radius: 24px 24px 0 0;
                max-height: 85vh;
            }
        }
    `;

    return (
        <>
            <style>{styles}</style>

            <div className="premium-page">
                <div className="premium-container">
                    {/* Header */}
                    <header className="premium-header">
                        <h1 className="header-title">
                            <span className="crown-icon-wrapper">
                                <FaCrown className="crown-icon" />
                            </span>
                            Premium
                        </h1>
                    </header>

                    {/* Pricing Card */}
                    <div className="premium-card">
                        <div className="card-header">Choose Your Plan</div>
                        <div className="card-body">
                            <div className="pricing-grid">
                                {pricingPlans.map((plan) => (
                                    <div
                                        key={plan.period}
                                        className={`price-option ${selectedCard === plan.period ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                                        onClick={() => handleCardSelect(plan.period)}
                                    >
                                        {plan.popular && <div className="popular-badge">MOST POPULAR</div>}
                                        {selectedCard === plan.period && (
                                            <div className="selected-check">
                                                <Check size={12} />
                                            </div>
                                        )}
                                        <div className="period-label">{plan.period}</div>
                                        <div className="price-amount">
                                            <span className="currency">RM</span> {plan.price}
                                        </div>
                                        {plan.perWeek && <div className="per-week">RM {plan.perWeek}/WK</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Privileges Card - Scrollable for iOS PWA */}
                    <div className="privileges-scroll-container">
                        <div className="premium-card">
                            <div className="card-header">Premium Privileges</div>
                            <div className="card-body">
                                {privileges.map((privilege, index) => (
                                    <div key={index} className="privilege-item">
                                        <div className={`privilege-icon-wrapper ${privilege.colorClass}`}>
                                            <privilege.icon />
                                        </div>
                                        <div className="privilege-content">
                                            <div className="privilege-title">{privilege.title}</div>
                                            {privilege.description && (
                                                <div className="privilege-description">{privilege.description}</div>
                                            )}
                                        </div>
                                        <ChevronRight size={18} className="privilege-chevron" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="premium-footer">
                    <button className="cta-button" onClick={handleContinue}>
                        UNLOCK & MATCH
                    </button>
                    <button className="back-button-footer" onClick={handleClose}>
                        BACK
                    </button>
                    <div className="footer-text">Auto-renewal. Cancel at any time.</div>
                    <div className="footer-terms">
                        By purchasing, you agree to our <a href="#">Privacy Policy</a> and <a href="#">Terms of Service</a>.
                        Subscription charged to AppStore. Auto-renews unless cancelled 24 hours before period ends.
                    </div>
                </div>
            </div>

            {/* Success Popup */}
            {showSuccessPopup && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <div className="popup-crown"><FaCrown /></div>
                        <h2 className="popup-title">Subscription Successful!</h2>
                        <p className="popup-message">Time to connect with your AURAs</p>
                    </div>
                </div>
            )}

            {/* Payment Form Modal */}
            {showPaymentForm && (
                <div className="popup-overlay">
                    <div className="popup-content payment-form-content">
                        <div className="payment-form-header">
                            <h2 className="payment-form-title">Complete Payment</h2>
                            <p className="payment-form-subtitle">Secure checkout - Test mode enabled</p>
                        </div>

                        <div className="card-preview">
                            <div className="card-preview-header">
                                <div className="card-preview-type">
                                    {cardType?.name || 'AURA PREMIUM'}
                                </div>
                                <div className="card-preview-chip"></div>
                            </div>
                            <div className="card-preview-number">
                                {cardNumber || '•••• •••• •••• ••••'}
                            </div>
                            <div className="card-preview-footer">
                                <div>
                                    <div className="card-preview-label">Card Holder</div>
                                    <div className="card-preview-value">{cardName || 'YOUR NAME'}</div>
                                </div>
                                <div className="card-preview-expires-box">
                                    <div className="card-preview-label">Expires</div>
                                    <div className="card-preview-value">{expiry || 'MM/YY'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Card Number</label>
                            <div className="form-input-with-icon">
                                <input
                                    type="text"
                                    value={cardNumber}
                                    onChange={handleCardNumberChange}
                                    placeholder="1234 5678 9012 3456"
                                    className="form-input"
                                    style={{ paddingRight: '45px' }}
                                />
                                <div className="form-input-icon">
                                    {getCardIcon()}
                                </div>
                            </div>
                            {cardType && (
                                <div className="card-type-badge">{cardType.name} detected</div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Cardholder Name</label>
                            <input
                                type="text"
                                value={cardName}
                                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                placeholder="JOHN DOE"
                                className="form-input"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Expiry Date</label>
                                <input
                                    type="text"
                                    value={expiry}
                                    onChange={handleExpiryChange}
                                    placeholder="MM/YY"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">CVC</label>
                                <input
                                    type="text"
                                    value={cvc}
                                    onChange={handleCvcChange}
                                    placeholder={cardType?.type === 'amex' ? '1234' : '123'}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="save-card-section">
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={saveCard}
                                    onChange={(e) => setSaveCard(e.target.checked)}
                                    className="checkbox-input"
                                />
                                <span className="checkbox-label">Save card for future payments</span>
                            </label>
                            <div className="checkbox-description">
                                Your card details will be securely stored for faster checkout next time.
                            </div>
                        </div>

                        <button
                            onClick={handleMockPaymentSubmit}
                            disabled={paymentProcessing || !cardNumber || !expiry || !cvc || !cardName}
                            className="payment-btn"
                        >
                            {paymentProcessing ? 'Processing...' : 'Pay Now'}
                        </button>

                        <button
                            onClick={() => {
                                setShowPaymentForm(false);
                                setCardNumber('');
                                setExpiry('');
                                setCvc('');
                                setCardName('');
                                setCardType(null);
                                setSaveCard(false);
                            }}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Verify Gate Modal */}
            {showVerifyGate && (
                <div className="popup-overlay" onClick={() => setShowVerifyGate(false)}>
                    <div className="popup-content verify-modal" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                        <button className="close-modal-btn" onClick={() => setShowVerifyGate(false)}>×</button>
                        <div className="popup-crown"><FaCrown /></div>
                        <h2 className="popup-title">You need to be verified first to become a premium user</h2>
                        <button
                            className="verify-btn"
                            onClick={handleVerifyAndContinue}
                            disabled={verifying}
                        >
                            {verifying ? 'Verifying...' : 'Verify Now'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default PremiumPayNew;
