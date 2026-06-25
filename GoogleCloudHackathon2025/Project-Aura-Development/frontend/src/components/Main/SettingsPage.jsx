import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import BottomNav from './BottomNav';
import { UserMinus } from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import emergencyContactService from '../../api/services/emergencyContactService';

// --- CONFIGURATION ---
const CONFIG = {
    COLORS: {
        // Light Mode
        '--color-bg-primary-light': '#F9F4E2', 
        '--color-bg-secondary-light': '#FFFFFF',
        '--color-text-primary-light': '#333333',
        '--color-text-secondary-light': '#6B7280',
        '--color-accent-red': '#FF7F7F',
        '--color-accent-pink': '#FFBEBE',
        '--color-progress-track-light': '#E2DDB4',
        '--color-icon-muted': '#9CA3AF',
        
        // Typography
        '--font-primary': "'Josefin Sans', sans-serif",
        '--font-size-base': '1rem',
        '--font-size-title': '1.5rem',
    }
};

// Privacy Policy Modal Component
const PrivacyPolicyModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="legal-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    Privacy Policy
                </div>
                <div className="legal-modal-body">
                    <p className="legal-effective-date">Effective Date: January 1, 2025</p>

                    <section className="legal-section">
                        <h3>1. Introduction</h3>
                        <p>Welcome to AURA ("we," "our," or "us"). We are committed to protecting your privacy and ensuring a safe dating experience. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.</p>
                    </section>

                    <section className="legal-section">
                        <h3>2. Information We Collect</h3>
                        <h4>2.1 Personal Information</h4>
                        <ul>
                            <li><strong>Account Information:</strong> Name, email address, date of birth, gender, and phone number</li>
                            <li><strong>Profile Information:</strong> Photos, bio, interests, relationship preferences, and location</li>
                            <li><strong>Verification Data:</strong> ID verification documents and voice recordings for authenticity</li>
                            <li><strong>Emergency Contacts:</strong> Names and phone numbers of your designated emergency contacts</li>
                        </ul>
                        <h4>2.2 Usage Information</h4>
                        <ul>
                            <li>Device information (model, OS, unique identifiers)</li>
                            <li>App interactions (swipes, matches, messages)</li>
                            <li>Log data and analytics</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h3>3. How We Use Your Information</h3>
                        <ul>
                            <li>To create and manage your account</li>
                            <li>To provide personalized match recommendations using our AI compatibility algorithm</li>
                            <li>To enable communication between matched users</li>
                            <li>To verify user authenticity and prevent fraud</li>
                            <li>To contact emergency contacts when safety features are activated</li>
                            <li>To improve our services and user experience</li>
                            <li>To send important notifications about your account</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h3>4. Information Sharing</h3>
                        <p>We do not sell your personal information. We may share your data with:</p>
                        <ul>
                            <li><strong>Other Users:</strong> Your profile information is visible to potential matches</li>
                            <li><strong>Service Providers:</strong> Third-party vendors who help operate our services (hosting, analytics, AI processing)</li>
                            <li><strong>Emergency Services:</strong> When you activate safety features or SOS alerts</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h3>5. Data Security</h3>
                        <p>We implement industry-standard security measures including:</p>
                        <ul>
                            <li>End-to-end encryption for messages</li>
                            <li>Secure data storage on Google Cloud Platform</li>
                            <li>Regular security audits and monitoring</li>
                            <li>Two-factor authentication options</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h3>6. Your Rights</h3>
                        <p>You have the right to:</p>
                        <ul>
                            <li>Access and download your personal data</li>
                            <li>Correct inaccurate information</li>
                            <li>Delete your account and associated data</li>
                            <li>Opt-out of marketing communications</li>
                            <li>Control your visibility and matching preferences</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h3>7. Data Retention</h3>
                        <p>We retain your data for as long as your account is active. Upon account deletion, we will remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes.</p>
                    </section>

                    <section className="legal-section">
                        <h3>8. Children's Privacy</h3>
                        <p>AURA is intended for users 18 years and older. We do not knowingly collect information from anyone under 18. If we discover such data has been collected, we will delete it immediately.</p>
                    </section>

                    <section className="legal-section">
                        <h3>9. Contact Us</h3>
                        <p>For privacy-related inquiries:</p>
                        <p>Email: privacy@aura-dating.com</p>
                        <p>Address: Kuala Lumpur, Malaysia</p>
                    </section>

                    <section className="legal-section">
                        <h3>10. Changes to This Policy</h3>
                        <p>We may update this Privacy Policy periodically. We will notify you of significant changes through the app or via email. Continued use of AURA after changes constitutes acceptance of the updated policy.</p>
                    </section>
                </div>
                <div className="legal-modal-footer">
                    <button className="modal-button save" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Terms of Service Modal Component
const TermsOfServiceModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="legal-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    Terms of Service
                </div>
                <div className="legal-modal-body">
                    <p className="legal-effective-date">Effective Date: January 1, 2025</p>

                    <section className="legal-section">
                        <h3>1. Acceptance of Terms</h3>
                        <p>By creating an account or using AURA, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
                    </section>

                    <section className="legal-section">
                        <h3>2. Eligibility</h3>
                        <p>To use AURA, you must:</p>
                        <ul>
                            <li>Be at least 18 years of age</li>
                            <li>Be legally able to enter into a binding contract</li>
                            <li>Not be prohibited from using the service under applicable laws</li>
                            <li>Not have been previously banned from AURA</li>
                            <li>Complete the verification process honestly and accurately</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h3>3. Account Registration</h3>
                        <p>When creating an account, you agree to:</p>
                        <ul>
                            <li>Provide accurate, current, and complete information</li>
                            <li>Use only your own photos that accurately represent you</li>
                            <li>Complete identity verification as required</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Notify us immediately of any unauthorized access</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h3>4. Community Guidelines</h3>
                        <p>You agree NOT to:</p>
                        <ul>
                            <li>Harass, bully, or intimidate other users</li>
                            <li>Post offensive, inappropriate, or explicit content</li>
                            <li>Impersonate any person or entity</li>
                            <li>Use the service for commercial purposes or solicitation</li>
                            <li>Share personal contact information publicly</li>
                            <li>Engage in any illegal activities</li>
                            <li>Use automated systems or bots</li>
                            <li>Attempt to circumvent safety features</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h3>5. Safety Features</h3>
                        <p>AURA provides safety features including:</p>
                        <ul>
                            <li><strong>Emergency Contacts:</strong> Designated contacts who can be notified in emergencies</li>
                            <li><strong>SOS Feature:</strong> Quick alert system for unsafe situations</li>
                            <li><strong>Report & Block:</strong> Tools to report inappropriate behavior</li>
                        </ul>
                        <p>While we provide these tools, you acknowledge that meeting people involves inherent risks, and you are responsible for your own safety decisions.</p>
                    </section>

                    <section className="legal-section">
                        <h3>6. Premium Features</h3>
                        <p>AURA offers premium subscription features. By subscribing:</p>
                        <ul>
                            <li>Payment will be charged to your chosen payment method</li>
                            <li>Subscriptions auto-renew unless cancelled 24 hours before renewal</li>
                            <li>Refunds are handled according to applicable app store policies</li>
                            <li>Premium features may change with reasonable notice</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h3>7. Intellectual Property</h3>
                        <p>AURA and its content are protected by copyright and trademark laws. You may not copy, modify, distribute, or create derivative works from our content without permission. You retain ownership of content you post but grant us a license to use it for operating the service.</p>
                    </section>

                    <section className="legal-section">
                        <h3>8. Disclaimer of Warranties</h3>
                        <p>AURA is provided "as is" without warranties of any kind. We do not guarantee:</p>
                        <ul>
                            <li>That you will find a compatible match</li>
                            <li>The accuracy of other users' profiles</li>
                            <li>Uninterrupted or error-free service</li>
                            <li>The conduct of other users</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h3>9. Limitation of Liability</h3>
                        <p>To the maximum extent permitted by law, AURA shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, including damages from interactions with other users.</p>
                    </section>

                    <section className="legal-section">
                        <h3>10. Account Termination</h3>
                        <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time through the app settings. Upon termination, your right to use the service ceases immediately.</p>
                    </section>

                    <section className="legal-section">
                        <h3>11. Governing Law</h3>
                        <p>These Terms shall be governed by the laws of Malaysia. Any disputes shall be resolved in the courts of Kuala Lumpur, Malaysia.</p>
                    </section>

                    <section className="legal-section">
                        <h3>12. Contact Information</h3>
                        <p>For questions about these Terms:</p>
                        <p>Email: legal@aura-dating.com</p>
                        <p>Address: Kuala Lumpur, Malaysia</p>
                    </section>

                    <section className="legal-section">
                        <h3>13. Changes to Terms</h3>
                        <p>We may modify these Terms at any time. Material changes will be communicated through the app. Continued use after changes constitutes acceptance of the new terms.</p>
                    </section>
                </div>
                <div className="legal-modal-footer">
                    <button className="modal-button save" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Emergency Contact Modal Component
const EmergencyContactModal = ({ isOpen, contactDetails, onClose, onSave, loading, error }) => {
    const [localContactDetails, setLocalContactDetails] = useState(contactDetails);

    // Update local state when contactDetails changes (from parent)
    useEffect(() => {
        setLocalContactDetails(contactDetails);
    }, [contactDetails]);

    const handleSaveContactLocal = () => {
        // Pass the local contact details directly to onSave
        onSave(localContactDetails);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    Emergency Contacts
                </div>
                <div className="modal-body">
                    <p className="modal-description">
                        Add up to 2 emergency contacts. We'll notify them if something happens. At least one contact is required.
                    </p>

                {/* Contact 1 */}
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #E0E0E0' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
                        Primary Contact <span style={{ color: '#FF7F7F' }}>*</span>
                    </h4>

                    <div className="input-group">
                        <label className="input-label" htmlFor="contact1-name">Contact Name</label>
                        <input
                            id="contact1-name"
                            className="text-input"
                            type="text"
                            placeholder="e.g., Jane Doe"
                            value={localContactDetails.contact1?.name || ''}
                            onChange={(e) => setLocalContactDetails(prev => ({
                                ...prev,
                                contact1: { ...prev.contact1, name: e.target.value }
                            }))}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="contact1-phone">Phone Number</label>
                        <div className="phone-input-wrapper">
                            <PhoneInput
                                country={'my'}
                                value={localContactDetails.contact1?.phone || ''}
                                onChange={(phone) => setLocalContactDetails(prev => ({
                                    ...prev,
                                    contact1: { ...prev.contact1, phone }
                                }))}
                                placeholder="0123456789"
                                inputProps={{
                                    name: 'contact1-phone',
                                    required: true,
                                    autoFocus: false
                                }}
                                containerStyle={{
                                    width: '100%'
                                }}
                                inputStyle={{
                                    width: '100%',
                                    height: '40px',
                                    fontSize: '16px',
                                    fontFamily: 'var(--font-primary)',
                                    backgroundColor: 'var(--color-bg-primary)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-icon-muted)',
                                    borderRadius: '8px'
                                }}
                                buttonStyle={{
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    border: '1px solid var(--color-icon-muted)',
                                    borderRadius: '8px 0 0 8px'
                                }}
                                dropdownStyle={{
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-icon-muted)'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Contact 2 */}
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
                        Secondary Contact <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>(Optional)</span>
                    </h4>

                    <div className="input-group">
                        <label className="input-label" htmlFor="contact2-name">Contact Name</label>
                        <input
                            id="contact2-name"
                            className="text-input"
                            type="text"
                            placeholder="e.g., John Smith"
                            value={localContactDetails.contact2?.name || ''}
                            onChange={(e) => setLocalContactDetails(prev => ({
                                ...prev,
                                contact2: { ...prev.contact2, name: e.target.value }
                            }))}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="contact2-phone">Phone Number</label>
                        <div className="phone-input-wrapper">
                            <PhoneInput
                                country={'my'}
                                value={localContactDetails.contact2?.phone || ''}
                                onChange={(phone) => setLocalContactDetails(prev => ({
                                    ...prev,
                                    contact2: { ...prev.contact2, phone }
                                }))}
                                placeholder="0198765432"
                                inputProps={{
                                    name: 'contact2-phone',
                                    autoFocus: false
                                }}
                                containerStyle={{
                                    width: '100%'
                                }}
                                inputStyle={{
                                    width: '100%',
                                    height: '40px',
                                    fontSize: '16px',
                                    fontFamily: 'var(--font-primary)',
                                    backgroundColor: 'var(--color-bg-primary)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-icon-muted)',
                                    borderRadius: '8px'
                                }}
                                buttonStyle={{
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    border: '1px solid var(--color-icon-muted)',
                                    borderRadius: '8px 0 0 8px'
                                }}
                                dropdownStyle={{
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-icon-muted)'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{
                        padding: '12px',
                        marginTop: '12px',
                        backgroundColor: '#FFE6E6',
                        border: '1px solid #FF7F7F',
                        borderRadius: '8px',
                        color: '#DC3545',
                        fontSize: '14px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <div className="modal-actions">
                    <button className="modal-button cancel" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button
                        className="modal-button save"
                        onClick={handleSaveContactLocal}
                        disabled={!localContactDetails.contact1?.name || !localContactDetails.contact1?.phone || loading}
                    >
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>
                </div>
            </div>
        </div>
    );
};

// Main Settings Page Component
export default function Settingpage() {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
    const [isTermsOfServiceOpen, setIsTermsOfServiceOpen] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [contactDetails, setContactDetails] = useState({
        contact1: { id: null, name: '', phone: '' },
        contact2: { id: null, name: '', phone: '' }
    });

    // Fetch existing emergency contacts on component mount
    useEffect(() => {
        const fetchEmergencyContacts = async () => {
            try {
                const contacts = await emergencyContactService.getEmergencyContacts();
                const newContactDetails = {
                    contact1: { id: null, name: '', phone: '' },
                    contact2: { id: null, name: '', phone: '' }
                };

                if (contacts && contacts.length > 0) {
                    // Load first contact
                    newContactDetails.contact1 = {
                        id: contacts[0].id,
                        name: contacts[0].contact_name || '',
                        phone: contacts[0].contact_phone || ''
                    };

                    // Load second contact if it exists
                    if (contacts.length > 1) {
                        newContactDetails.contact2 = {
                            id: contacts[1].id,
                            name: contacts[1].contact_name || '',
                            phone: contacts[1].contact_phone || ''
                        };
                    }
                }

                setContactDetails(newContactDetails);
            } catch (err) {
                console.error('Error fetching emergency contacts:', err);
                // Silently fail - user might not have contacts yet
            }
        };

        fetchEmergencyContacts();
    }, []);

    const handleSaveContact = async (updatedContactDetails) => {
        setLoading(true);
        setError(null);

        try {
            const savePromises = [];

            // Validate phone number (must have more than just country code)
            const isValidPhone = (phone) => {
                if (!phone) return false;
                // Remove common formatting characters
                const cleaned = phone.replace(/[\s\-()]/g, '');
                // Must have at least country code + some digits (e.g., +60123456789)
                return cleaned.length > 3; // More than just +60 or similar
            };

            // Save/update Contact 1 (required - at least one contact must be provided)
            if (updatedContactDetails.contact1.name && isValidPhone(updatedContactDetails.contact1.phone)) {
                const contact1Data = {
                    contact_name: updatedContactDetails.contact1.name,
                    contact_phone: updatedContactDetails.contact1.phone.startsWith('+')
                        ? updatedContactDetails.contact1.phone
                        : `+${updatedContactDetails.contact1.phone}`
                };

                if (updatedContactDetails.contact1.id) {
                    // Update existing contact - use upsert which handles updates
                    savePromises.push(emergencyContactService.upsertEmergencyContact(contact1Data));
                } else {
                    // Add new contact
                    savePromises.push(emergencyContactService.addEmergencyContact(contact1Data));
                }
            } else {
                setError('Please provide a valid name and complete phone number for the primary contact');
                setLoading(false);
                return;
            }

            // Save/update Contact 2 (optional - but if provided, must be complete)
            if (updatedContactDetails.contact2.name || updatedContactDetails.contact2.phone) {
                // Check if user started filling contact 2 but didn't complete it
                if (!updatedContactDetails.contact2.name || !isValidPhone(updatedContactDetails.contact2.phone)) {
                    setError('Please complete the secondary contact details or leave it empty');
                    setLoading(false);
                    return;
                }

                const contact2Data = {
                    contact_name: updatedContactDetails.contact2.name,
                    contact_phone: updatedContactDetails.contact2.phone.startsWith('+')
                        ? updatedContactDetails.contact2.phone
                        : `+${updatedContactDetails.contact2.phone}`
                };

                if (updatedContactDetails.contact2.id) {
                    // For second contact, we need a different approach since upsert only handles first contact
                    // We'll use the add endpoint which will update if exists
                    savePromises.push(emergencyContactService.addEmergencyContact(contact2Data));
                } else {
                    savePromises.push(emergencyContactService.addEmergencyContact(contact2Data));
                }
            } else if (updatedContactDetails.contact2.id) {
                // User cleared contact 2 - delete it
                savePromises.push(emergencyContactService.deleteEmergencyContact(updatedContactDetails.contact2.id));
            }

            // Execute all save operations
            await Promise.all(savePromises);

            setIsModalOpen(false);
            setShowSuccessMessage(true);

            // Refresh contacts after save
            const contacts = await emergencyContactService.getEmergencyContacts();
            const newContactDetails = {
                contact1: { id: null, name: '', phone: '' },
                contact2: { id: null, name: '', phone: '' }
            };

            if (contacts && contacts.length > 0) {
                newContactDetails.contact1 = {
                    id: contacts[0].id,
                    name: contacts[0].contact_name || '',
                    phone: contacts[0].contact_phone || ''
                };

                if (contacts.length > 1) {
                    newContactDetails.contact2 = {
                        id: contacts[1].id,
                        name: contacts[1].contact_name || '',
                        phone: contacts[1].contact_phone || ''
                    };
                }
            }

            setContactDetails(newContactDetails);

            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                setShowSuccessMessage(false);
            }, 3000);
        } catch (err) {
            console.error('Error saving emergency contacts:', err);
            setError(err.response?.data?.detail || 'Failed to save emergency contacts. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Theme removed

    const handleEmergencyContactClick = () => {
        setIsModalOpen(true);
    };

    const handleLogout = () => {
        console.log('Logout clicked');

        // Clear all authentication tokens and user data from localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('current_user_id');
        localStorage.removeItem('user_email');
        localStorage.removeItem('isPremiumUser');
        localStorage.removeItem('token');

        // Clear all cached user data to prevent data leakage between accounts
        localStorage.removeItem('editProfile_cachedData');         // Profile cache
        localStorage.removeItem('inbox_chatListCache');            // Chat list cache
        localStorage.removeItem('personalityAnalysis_cachedData'); // Personality analysis cache
        localStorage.removeItem('my_likes_cache');                 // My likes cache
        localStorage.removeItem('likes_me_cache');                 // Likes me cache

        // Clear chat message caches (they're keyed by session ID, so clear all matching keys)
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('chat_messages_cache_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Redirect to Welcome page
        navigate('/');
    };

    const handleDeleteAccount = () => {
        console.log('Delete Account clicked');
        // TODO: Add delete account logic here
    };

    // Section Header Component (now part of card header)
    const SectionHeader = ({ title }) => (
        <div className="card-header">
            {title}
        </div>
    );

    // Settings Link Component
    const SettingsLink = ({ icon, text, description, onClick }) => (
        <div className="settings-link-container" onClick={onClick}>
            <div className="settings-link">
                <div className="icon-wrapper">
                    <span className="material-symbols-outlined link-icon">{icon}</span>
                </div>
                <div className="link-content">
                    <span className="link-text">{text}</span>
                    {description && <span className="link-description">{description}</span>}
                </div>
            </div>
            <span className="material-symbols-outlined chevron-icon">chevron_right</span>
        </div>
    );
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
    // Theme class removed

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

        .settings-page {
            font-family: var(--font-primary);
            background-color: #F9F4E2;
            color: var(--color-text-primary);
            min-height: 100dvh;
            padding: 0 8px 100px;
            max-width: 450px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
        }

        @media (max-height: 700px) {
            .settings-page {
                padding-bottom: 100px;
            }
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background-color: #F9F4E2;
            position: sticky;
            top: 0;
            z-index: 20;
        }

        .header-title {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            margin-top: 4px;
            text-align: left;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .header-title .material-symbols-outlined {
            font-size: 22px;
            margin-top: -5px;
        }

        .settings-card {
            margin-bottom: 8px;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .settings-card:first-of-type {
            margin-top: 2px;
        }

        .card-header {
            background: linear-gradient(135deg, #fd7474ff, #fa9595ff);
            padding: 6px 16px;
            text-align: center;
            color: white;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            border-bottom: 1px solid #F9F4E2;
        }

        .settings-group {
            background-color: #F9F4E2;
            border-radius: 0 0 24px 24px;
        }

        .settings-link-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 7px 10px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            cursor: pointer;
        }

        .settings-link-container::before {
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

        .settings-link-container:active::before {
            width: 300px;
            height: 300px;
        }

        .settings-link-container:hover {
            background-color: rgba(255, 127, 127, 0.04);
        }

        .settings-link-container:active {
            background-color: rgba(255, 127, 127, 0.08);
            transform: scale(0.98);
        }

        .settings-link-container:last-child {
            border-bottom: none;
        }

        .settings-link {
            display: flex;
            align-items: center;
            flex: 1;
            gap: 16px;
        }

        .icon-wrapper {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(255, 127, 127, 0.1), rgba(255, 190, 190, 0.15));
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.25s ease;
        }

        .settings-link-container:hover .icon-wrapper {
            background: linear-gradient(135deg, rgba(255, 127, 127, 0.18), rgba(255, 190, 190, 0.22));
            transform: scale(1.05);
        }

        .link-icon {
            font-size: 24px;
            color: var(--color-accent-red);
            font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
        }

        .link-content {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .link-text {
            font-size: 14px;
            font-weight: 600;
            line-height: 1.3;
        }

        .link-description {
            font-size: 12px;
            font-weight: 400;
            color: var(--color-text-secondary);
            line-height: 1.2;
        }

        .chevron-icon {
            font-size: 18px;
            color: var(--color-icon-muted);
            transition: transform 0.2s ease;
        }

        .settings-link-container:hover .chevron-icon {
            transform: translateX(4px);
            color: var(--color-accent-red);
        }

        main {
            overflow-y: auto;
            padding: 0 4px;
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
        .action-button-group {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            margin-top: 2px;
            margin-bottom: 6px;
            padding: 0;
            gap: 6px;
        }

        .action-button-class {
            width: 100%;
            padding: 10px;
            font-family: var(--font-primary);
            font-size: 0.875rem;
            font-weight: 700;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            line-height: 1;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
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

        .action-button-icon {
            font-size: 16px;
            margin-right: 10px;
            position: relative;
            z-index: 1;
        }

        .logout-button {
            background-color: transparent;
            color: #FF7F7F;
            border: 2px solid #FF7F7F !important;
            border-radius: 20px !important;
            box-shadow: none;
        }

        .logout-button:hover {
            background-color: rgba(255, 127, 127, 0.1);
            border-color: #FF6B6B !important;
            color: #FF6B6B;
            box-shadow: 0 2px 8px rgba(255, 127, 127, 0.2);
        }

        .logout-button:active {
            background-color: rgba(255, 127, 127, 0.15);
            box-shadow: none;
            transform: scale(0.98);
        }

        .settings-delete-button {
            background-color: #FF5757;
            color: #FFFFFF;
            border: none;
            border-radius: 20px;
            box-shadow: 0 4px 12px rgba(255, 87, 87, 0.3);
        }

        .settings-delete-button:hover {
            background-color: #E63946;
            box-shadow: 0 6px 16px rgba(230, 57, 70, 0.4);
        }

        .settings-delete-button:active {
            filter: brightness(0.95);
            box-shadow: none;
            transform: scale(0.98);
        }

        @media (max-height: 740px) {
            .section-header {
                margin-top: 12px;
                margin-bottom: 6px;
            }
            .settings-link-container {
                padding: 8px 12px;
            }
            .icon-wrapper {
                width: 40px;
                height: 40px;
            }
            .link-icon {
                font-size: 20px;
            }
            .link-text {
                font-size: 14px;
            }
            .link-description {
                font-size: 12px;
            }
            .action-button-group {
                margin-top: 4px;
                gap: 8px;
            }
            .action-button {
                padding: 11px;
            }
        }

        @media (max-width: 360px) {
            .settings-page {
                padding: 0 12px 80px;
            }
            .action-button {
                font-size: 0.875rem;
            }
            .action-button-icon {
                font-size: 16px;
            }
        }

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .modal-content {
            background-color: white;
            padding: 0;
            margin: 20px;
            border-radius: 24px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            animation: slideUp 0.3s ease-out;
            overflow: hidden;
        }

        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
            background: linear-gradient(135deg, #fd7474ff, #fa9595ff);
            padding: 16px;
            text-align: center;
            color: white;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            border-bottom: 1px solid #F9F4E2;
        }

        .modal-body {
            padding: 24px;
            background-color: #F9F4E2;
            border-radius: 0 0 24px 24px;
        }

        .modal-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--color-text-primary);
            margin: 0 0 8px 0;
        }

        .modal-description {
            font-size: 0.9rem;
            color: var(--color-text-secondary);
            margin-bottom: 20px;
        }

        .input-group {
            margin-bottom: 15px;
        }

        .input-label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 5px;
            color: var(--color-text-secondary);
        }

        .text-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--color-icon-muted);
            border-radius: 8px;
            font-family: var(--font-primary);
            font-size: 1rem;
            background-color: var(--color-bg-primary);
            color: var(--color-text-primary);
            transition: border-color 0.2s;
            box-sizing: border-box;
        }

        .text-input::placeholder {
            color: var(--color-icon-muted);
            opacity: 0.7;
            font-style: italic;
        }

        .text-input:focus {
            outline: none;
            border-color: var(--color-accent-red);
        }

        .phone-input-wrapper .react-tel-input .form-control {
            width: 100% !important;
            height: 40px !important;
            font-size: 16px !important;
            font-family: var(--font-primary) !important;
            background-color: var(--color-bg-primary) !important;
            color: var(--color-text-primary) !important;
            border: 1px solid var(--color-icon-muted) !important;
            border-radius: 8px !important;
        }

        .phone-input-wrapper .react-tel-input .form-control:focus {
            border-color: var(--color-accent-red) !important;
            box-shadow: none !important;
        }

        .phone-input-wrapper .react-tel-input .form-control::placeholder {
            color: var(--color-icon-muted) !important;
            opacity: 0.7 !important;
            font-style: italic !important;
        }

        .phone-input-wrapper .react-tel-input .flag-dropdown {
            background-color: var(--color-bg-secondary) !important;
            border: 1px solid var(--color-icon-muted) !important;
            border-radius: 8px 0 0 8px !important;
        }

        .phone-input-wrapper .react-tel-input .flag-dropdown:hover {
            background-color: var(--color-bg-primary) !important;
        }

        .phone-input-wrapper .react-tel-input .country-list {
            background-color: var(--color-bg-secondary) !important;
            border: 1px solid var(--color-icon-muted) !important;
            border-radius: 8px !important;
            max-height: 200px !important;
        }

        .phone-input-wrapper .react-tel-input .country-list .country {
            background-color: var(--color-bg-secondary) !important;
            color: var(--color-text-primary) !important;
            padding: 8px 12px !important;
        }

        .phone-input-wrapper .react-tel-input .country-list .country:hover {
            background-color: var(--color-bg-primary) !important;
        }

        .phone-input-wrapper .react-tel-input .country-list .country.highlight {
            background-color: var(--color-accent-red) !important;
            color: white !important;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 25px;
        }

        .modal-button {
            padding: 10px 15px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-family: var(--font-primary);
            font-weight: 600;
            transition: background-color 0.2s;
        }

        .modal-button.cancel {
            background-color: var(--color-bg-primary);
            color: var(--color-text-primary);
            border: 1px solid var(--color-icon-muted);
        }

        .modal-button.cancel:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }

        .modal-button.save {
            background-color: var(--color-accent-red);
            color: white;
        }

        .modal-button.save:disabled {
            background-color: var(--color-icon-muted);
            cursor: not-allowed;
        }

        .modal-button.save:hover:not(:disabled) {
            filter: brightness(0.9);
        }

        /* Legal Modal Styles */
        .legal-modal-content {
            background-color: white;
            padding: 0;
            margin: 20px;
            border-radius: 24px;
            width: 90%;
            max-width: 500px;
            max-height: 85vh;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            animation: slideUp 0.3s ease-out;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .legal-modal-body {
            padding: 24px;
            background-color: #F9F4E2;
            overflow-y: auto;
            flex: 1;
            -webkit-overflow-scrolling: touch;
        }

        .legal-modal-footer {
            padding: 16px 24px;
            background-color: #F9F4E2;
            border-top: 1px solid rgba(0, 0, 0, 0.05);
            display: flex;
            justify-content: center;
        }

        .legal-effective-date {
            font-size: 0.85rem;
            color: var(--color-text-secondary);
            font-style: italic;
            margin-bottom: 20px;
            text-align: center;
        }

        .legal-section {
            margin-bottom: 20px;
        }

        .legal-section h3 {
            font-size: 1rem;
            font-weight: 700;
            color: var(--color-accent-red);
            margin-bottom: 8px;
        }

        .legal-section h4 {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--color-text-primary);
            margin: 12px 0 6px 0;
        }

        .legal-section p {
            font-size: 0.85rem;
            color: var(--color-text-secondary);
            line-height: 1.6;
            margin-bottom: 8px;
        }

        .legal-section ul {
            margin: 8px 0;
            padding-left: 20px;
        }

        .legal-section li {
            font-size: 0.85rem;
            color: var(--color-text-secondary);
            line-height: 1.6;
            margin-bottom: 6px;
        }

        .legal-section li strong {
            color: var(--color-text-primary);
        }
    `;

    return (
        <div className={`settings-page`}>
            <style dangerouslySetInnerHTML={{ __html: styleSheet }} />
            
            {/* Header */}
            <div className="header">
                <h1 className="header-title">
                    <span className="material-symbols-outlined">settings</span>
                    Settings
                </h1>
            </div>

            <main>
                {/* Group 1: Account */}
                <div className="settings-card">
                    <SectionHeader title="ACCOUNT" />
                    <div className="settings-group">
                        <SettingsLink
                            icon="person"
                            text="Account Information"
                            description="Manage your account information and credentials"
                            onClick={() => navigate('/account-info-modification')}
                        />
                        <SettingsLink
                            icon="contact_emergency"
                            text="Emergency Contact"
                            description="Set your trusted contact person"
                            onClick={handleEmergencyContactClick}
                        />
                        <SettingsLink
                            icon="group_add"
                            text="Invite Friends"
                            description="Share the app with friends"
                            onClick={() => console.log('Invite Friends Clicked')}
                        />
                    </div>
                </div>

                {/* Group 2: Support */}
                <div className="settings-card">
                    <SectionHeader title="SUPPORT" />
                    <div className="settings-group">
                        <SettingsLink
                            icon="headphones"
                            text="Customer Service"
                            description="Get help and support"
                            onClick={() => navigate('/helpdesk')}
                        />
                        <SettingsLink
                            icon="cloud_download"
                            text="App Version/Updates"
                            description="Check for latest updates"
                            onClick={() => console.log('App Version Clicked')}
                        />
                    </div>
                </div>

                {/* Group 3: Legal */}
                <div className="settings-card">
                    <SectionHeader title="LEGAL" />
                    <div className="settings-group">
                        <SettingsLink
                            icon="lock"
                            text="Privacy Policy"
                            description="How we protect your data"
                            onClick={() => setIsPrivacyPolicyOpen(true)}
                        />
                        <SettingsLink
                            icon="description"
                            text="Terms of Service"
                            description="User agreement and terms"
                            onClick={() => setIsTermsOfServiceOpen(true)}
                        />
                    </div>
                </div>
            </main>

            {/* Action Buttons */}
            <div className="action-button-group">
                <button className="action-button-class logout-button" onClick={handleLogout}>
                    <span className="material-symbols-outlined action-button-icon">logout</span>
                    Log Out
                </button>
                <button className="action-button-class settings-delete-button" onClick={handleDeleteAccount} aria-label="Delete Account">
                    <UserMinus className="action-button-icon" size={20} color="#FFFFFF" aria-hidden="true" />
                    Delete Account
                </button>
            </div>

            {/* Emergency Contact Modal */}
{isModalOpen && (
    <EmergencyContactModal
        isOpen={isModalOpen}
        contactDetails={contactDetails}
        onClose={() => {
            setIsModalOpen(false);
            setError(null);
        }}
        onSave={handleSaveContact}
        loading={loading}
        error={error}
    />
)}

{/* Success Message */}
<SuccessMessage
    show={showSuccessMessage}
    message="Emergency contact updated successfully!"
/>

{/* Privacy Policy Modal */}
<PrivacyPolicyModal
    isOpen={isPrivacyPolicyOpen}
    onClose={() => setIsPrivacyPolicyOpen(false)}
/>

{/* Terms of Service Modal */}
<TermsOfServiceModal
    isOpen={isTermsOfServiceOpen}
    onClose={() => setIsTermsOfServiceOpen(false)}
/>

            {/* Bottom Navigation */}
            <BottomNav />

        </div>
    );
}


