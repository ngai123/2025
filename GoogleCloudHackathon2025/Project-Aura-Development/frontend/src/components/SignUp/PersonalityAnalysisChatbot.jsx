import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import api from '../../api/axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { AgentResponseRenderer } from './AgentResponseDisplay';

// Lazy load SpiderChart - only loaded when data is ready
const SpiderChart = lazy(() => import('./SpiderChart'));

// --- Cache Helpers (shared with EditProfile for instant load) ---
const PROFILE_CACHE_KEY = 'editProfile_cachedData';
const ANALYSIS_CACHE_KEY = 'personalityAnalysis_cachedData';
const ANALYSIS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache validity

const getCurrentUserId = () => {
    return localStorage.getItem('current_user_id') || localStorage.getItem('userId') || null;
};

// Try to get analysis from EditProfile's cache first (instant load)
// Validates that cache belongs to current user to prevent data leakage
const getCachedAnalysis = () => {
    try {
        const currentUserId = getCurrentUserId();

        // First, check dedicated analysis cache
        const analysisCache = localStorage.getItem(ANALYSIS_CACHE_KEY);
        if (analysisCache) {
            const { data, timestamp, userId } = JSON.parse(analysisCache);

            // Validate cache belongs to current user
            if (userId && currentUserId && String(userId) !== String(currentUserId)) {
                localStorage.removeItem(ANALYSIS_CACHE_KEY);
            } else {
                const isStale = Date.now() - timestamp > ANALYSIS_CACHE_TTL;
                if (data) return { data, isStale };
            }
        }

        // Fallback: Try EditProfile's cache
        const profileCache = localStorage.getItem(PROFILE_CACHE_KEY);
        if (profileCache) {
            const { data, timestamp, userId } = JSON.parse(profileCache);

            // Validate cache belongs to current user
            if (userId && currentUserId && String(userId) !== String(currentUserId)) {
                localStorage.removeItem(PROFILE_CACHE_KEY);
                return null;
            }

            const isStale = Date.now() - timestamp > ANALYSIS_CACHE_TTL;
            if (data?.analysis) {
                return {
                    data: data.analysis,
                    isStale
                };
            }
        }
        return null;
    } catch {
        return null;
    }
};

const setCachedAnalysis = (data) => {
    try {
        const userId = getCurrentUserId();
        localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now(),
            userId // Store user ID with cache to validate on retrieval
        }));
    } catch {
        // Ignore cache errors
    }
};

// Skeleton Components for loading states
const SkeletonPulse = ({ style }) => (
    <div
        style={{
            background: 'linear-gradient(90deg, #E8DCC8 25%, #F0E6D6 50%, #E8DCC8 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px',
            ...style
        }}
    />
);

const ChartSkeleton = () => (
    <div style={{ padding: '20px' }}>
        <SkeletonPulse style={{ width: '60%', height: '20px', margin: '0 auto 20px' }} />
        <div style={{
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            margin: '0 auto',
            background: 'linear-gradient(90deg, #E8DCC8 25%, #F0E6D6 50%, #E8DCC8 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
        }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '20px' }}>
            {[...Array(6)].map((_, i) => (
                <SkeletonPulse key={i} style={{ height: '50px' }} />
            ))}
        </div>
    </div>
);

const TextSkeleton = () => (
    <div style={{ padding: '20px' }}>
        <SkeletonPulse style={{ width: '100%', height: '16px', marginBottom: '12px' }} />
        <SkeletonPulse style={{ width: '95%', height: '16px', marginBottom: '12px' }} />
        <SkeletonPulse style={{ width: '88%', height: '16px', marginBottom: '12px' }} />
        <SkeletonPulse style={{ width: '92%', height: '16px', marginBottom: '12px' }} />
        <SkeletonPulse style={{ width: '70%', height: '16px' }} />
    </div>
);

const PersonalityAnalysisChatbot = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get the previous page from navigation state, default to /discover
    const fromPage = location.state?.from || '/discover';

    const [analysis, setAnalysis] = useState('');
    const [traitScores, setTraitScores] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [error, setError] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Populate state from analysis data
    const populateFromData = (data) => {
        const analysisText = data.characteristic_json || '';
        const scores = data.trait_scores || null;

        setAnalysis(analysisText);
        setTraitScores(scores);
        setMessages([{
            role: 'assistant',
            content: analysisText,
            showChart: true
        }]);
    };

    // Fetch analysis with stale-while-revalidate pattern
    const fetchAnalysis = async (showRefreshing = false) => {
        const storedId = localStorage.getItem('current_user_id') || localStorage.getItem('userId');
        const userId = storedId ? String(storedId) : null;

        if (!userId) {
            console.error('No user ID found');
            navigate('/login');
            return;
        }

        setError(null);
        if (showRefreshing) setIsRefreshing(true);

        // Try to show cached data immediately for instant UI
        const cached = getCachedAnalysis();
        if (cached?.data) {
            populateFromData(cached.data);
            // If cache is fresh, skip network fetch
            if (!cached.isStale) {
                setIsLoading(false);
                if (showRefreshing) setIsRefreshing(false);
                return;
            }
            // Cache is stale - show cached data but continue to revalidate
            setIsLoading(false);
        }

        try {
            const response = await api.get(`/users/${userId}/analysis`);
            const freshData = response.data;

            populateFromData(freshData);
            setCachedAnalysis(freshData);
        } catch (err) {
            console.error('Error fetching analysis:', err);
            // Only show error if we don't have cached data
            if (!cached?.data) {
                setError('Failed to load your personality analysis. Please try again.');
            }
        } finally {
            setIsLoading(false);
            if (showRefreshing) setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalysis();
    }, [navigate]);

    const handleSend = async () => {
        if (!currentMessage.trim() || isSending) return;

        const userMessage = currentMessage.trim();
        setCurrentMessage('');

        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsSending(true);

        try {
            const storedId = localStorage.getItem('current_user_id') || localStorage.getItem('userId');
            const userId = storedId ? String(storedId) : null;

            // Call the backend to get AI response
            const response = await api.post('/profile-analysis/chat', {
                user_id: userId,
                message: userMessage,
                analysis_context: analysis
            });

            // Add AI response to chat with agent data
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.response,
                agentType: response.data.agent_type,
                agentData: response.data.data
            }]);
        } catch (err) {
            console.error('Error sending message:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'I apologize, but I encountered an error. Please try again.'
            }]);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleEmailFullAnalysis = async () => {
        const storedId = localStorage.getItem('current_user_id') || localStorage.getItem('userId');
        const userId = storedId ? String(storedId) : null;

        if (!userId) {
            alert('User not found');
            return;
        }

        setIsSendingEmail(true);

        try {
            const response = await api.post(`/users/${userId}/analysis/email`);
            setEmailSent(true);
            alert(response.data.message || 'Full analysis sent to your email!');
        } catch (err) {
            console.error('Error sending email:', err);
            alert('Failed to send email. Please try again.');
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleRetry = () => {
        setIsLoading(true);
        setError(null);
        fetchAnalysis();
    };

    // Error State
    if (error && !analysis) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Josefin Sans', sans-serif",
                background: '#F9F4E2',
                color: '#333333',
                height: '100vh',
                width: '100vw',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '0',
                    textAlign: 'center',
                    maxWidth: '400px',
                    width: '90%',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #fd7474ff, #fa9595ff)',
                        padding: '16px',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 700,
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase'
                    }}>
                        Something Went Wrong
                    </div>
                    <div style={{ padding: '24px', background: '#F9F4E2' }}>
                        <AlertCircle size={48} color="#FF7F7F" style={{ marginBottom: '16px' }} />
                        <p style={{ color: '#6B7280', marginBottom: '24px', lineHeight: '1.6' }}>
                            {error}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleRetry}
                                style={{
                                    padding: '12px 24px',
                                    background: '#FF7F7F',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    fontFamily: "'Josefin Sans', sans-serif",
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <RefreshCw size={18} />
                                Try Again
                            </button>
                            <button
                                onClick={() => navigate(fromPage)}
                                style={{
                                    padding: '12px 24px',
                                    background: '#F9F4E2',
                                    color: '#333333',
                                    border: '1px solid #9CA3AF',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    fontFamily: "'Josefin Sans', sans-serif"
                                }}
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Josefin Sans', sans-serif",
            background: '#F9F4E2',
            color: '#333333',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden'
        }}>
            {/* Header - Matching Settings Page style */}
            <div style={{
                padding: '8px 12px',
                background: '#F9F4E2',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => navigate(fromPage)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ArrowLeft size={22} color="#333333" />
                    </button>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        margin: 0,
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '22px', marginTop: '-5px' }}>
                            psychology
                        </span>
                        Personality Insights
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isRefreshing && (
                        <RefreshCw
                            size={18}
                            color="#FF7F7F"
                            style={{ animation: 'spin 1s linear infinite' }}
                        />
                    )}
                    <button
                        onClick={() => navigate('/discover')}
                        style={{
                            padding: '10px 20px',
                            background: '#FF7F7F',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            fontFamily: "'Josefin Sans', sans-serif"
                        }}
                    >
                        Continue
                    </button>
                </div>
            </div>

            {/* Chat Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                {isLoading ? (
                    // Skeleton Loading State with Settings Card Style
                    <div style={{ maxWidth: '450px', margin: '0 auto', width: '100%', padding: '0 4px' }}>
                        {/* Chart Card Skeleton */}
                        <div style={{
                            marginBottom: '8px',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}>
                            <div style={{
                                background: 'linear-gradient(135deg, #fd7474ff, #fa9595ff)',
                                padding: '6px 16px',
                                textAlign: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 700,
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase'
                            }}>
                                RELATIONSHIP PROFILE
                            </div>
                            <div style={{ background: '#F9F4E2', borderRadius: '0 0 24px 24px' }}>
                                <ChartSkeleton />
                            </div>
                        </div>

                        {/* Insights Card Skeleton */}
                        <div style={{
                            marginBottom: '8px',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}>
                            <div style={{
                                background: 'linear-gradient(135deg, #fd7474ff, #fa9595ff)',
                                padding: '6px 16px',
                                textAlign: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 700,
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase'
                            }}>
                                AI INSIGHTS
                            </div>
                            <div style={{ background: '#F9F4E2', borderRadius: '0 0 24px 24px' }}>
                                <TextSkeleton />
                            </div>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            animation: 'fadeIn 0.5s ease',
                            maxWidth: '450px',
                            margin: msg.role === 'user' ? '0 0 0 auto' : '0 auto',
                            width: '100%',
                            padding: '0 4px'
                        }}>
                            {/* Spider Chart Card for first assistant message */}
                            {msg.showChart && traitScores && (
                                <div style={{
                                    width: '100%',
                                    marginBottom: '8px',
                                    borderRadius: '20px',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)'
                                }}>
                                    {/* Card Header */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, #fd7474ff, #fa9595ff)',
                                        padding: '6px 16px',
                                        textAlign: 'center',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        letterSpacing: '1.5px',
                                        textTransform: 'uppercase',
                                        borderBottom: '1px solid #F9F4E2'
                                    }}>
                                        RELATIONSHIP PROFILE
                                    </div>
                                    {/* Card Body */}
                                    <div style={{
                                        background: '#F9F4E2',
                                        borderRadius: '0 0 24px 24px',
                                        padding: '20px'
                                    }}>
                                        <Suspense fallback={<ChartSkeleton />}>
                                            <SpiderChart scores={traitScores} size={280} />
                                        </Suspense>
                                    </div>
                                </div>
                            )}

                            {/* Insights Card for assistant messages */}
                            {msg.role === 'assistant' && (
                                <div style={{
                                    width: '100%',
                                    marginBottom: '8px',
                                    borderRadius: '20px',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)'
                                }}>
                                    {/* Card Header */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, #fd7474ff, #fa9595ff)',
                                        padding: '6px 16px',
                                        textAlign: 'center',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        letterSpacing: '1.5px',
                                        textTransform: 'uppercase',
                                        borderBottom: '1px solid #F9F4E2'
                                    }}>
                                        {msg.showChart ? 'AI INSIGHTS' : 'AURA AI'}
                                    </div>
                                    {/* Card Body */}
                                    <div style={{
                                        background: '#F9F4E2',
                                        borderRadius: '0 0 24px 24px',
                                        padding: '20px'
                                    }}>
                                        {msg.showChart && (
                                            <div style={{
                                                padding: '12px 16px',
                                                marginBottom: '16px',
                                                background: 'rgba(255, 127, 127, 0.1)',
                                                borderLeft: '4px solid #FF7F7F',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                color: '#6B7280',
                                                fontStyle: 'italic',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '8px'
                                            }}>
                                                <span style={{ fontSize: '18px' }}>💡</span>
                                                <span>This is a brief summary. Click below to receive the complete analysis via email.</span>
                                            </div>
                                        )}
                                        <div
                                            style={{
                                                color: '#333333',
                                                whiteSpace: 'pre-wrap',
                                                lineHeight: '1.8',
                                                fontSize: '15px'
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: msg.content
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FF7F7F; font-weight: 700;">$1</strong>')
                                                    .replace(/\n\n/g, '<br/><br/>')
                                            }}
                                        />

                                        {/* Render specialized agent responses */}
                                        {msg.agentType && (
                                            <AgentResponseRenderer
                                                agentType={msg.agentType}
                                                agentData={msg.agentData}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* User message bubble */}
                            {msg.role === 'user' && (
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '14px 18px',
                                    borderRadius: '20px',
                                    background: '#FF7F7F',
                                    color: 'white',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                    fontSize: '15px',
                                    lineHeight: '1.6'
                                }}>
                                    {msg.content}
                                </div>
                            )}

                            {/* Email button for first assistant message */}
                            {msg.showChart && (
                                <button
                                    onClick={handleEmailFullAnalysis}
                                    disabled={isSendingEmail || emailSent}
                                    style={{
                                        width: '100%',
                                        marginTop: '12px',
                                        padding: '10px',
                                        borderRadius: '20px',
                                        border: 'none',
                                        background: emailSent
                                            ? '#2ecc71'
                                            : '#FF5757',
                                        color: '#FFFFFF',
                                        fontSize: '0.875rem',
                                        fontWeight: '700',
                                        fontFamily: "'Josefin Sans', sans-serif",
                                        cursor: isSendingEmail || emailSent ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        boxShadow: emailSent
                                            ? '0 4px 12px rgba(46, 204, 113, 0.3)'
                                            : '0 4px 12px rgba(255, 87, 87, 0.3)',
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        lineHeight: 1,
                                        boxSizing: 'border-box'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSendingEmail && !emailSent) {
                                            e.currentTarget.style.backgroundColor = '#E63946';
                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(230, 57, 70, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSendingEmail && !emailSent) {
                                            e.currentTarget.style.backgroundColor = '#FF5757';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 87, 87, 0.3)';
                                        }
                                    }}
                                >
                                    {isSendingEmail ? (
                                        <>
                                            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                            Sending...
                                        </>
                                    ) : emailSent ? (
                                        <>
                                            <CheckCircle size={16} />
                                            Email Sent!
                                        </>
                                    ) : (
                                        <>
                                            <Mail size={16} />
                                            Email Me Full Analysis
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Matching Settings Page styling */}
            <div style={{
                padding: '12px 16px 16px',
                background: '#F9F4E2',
                borderTop: '1px solid rgba(0, 0, 0, 0.05)'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    maxWidth: '450px',
                    margin: '0 auto',
                    alignItems: 'flex-end'
                }}>
                    <textarea
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask about your personality, get shopping lists..."
                        disabled={isSending || isLoading}
                        rows={1}
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            borderRadius: '20px',
                            border: '1px solid #9CA3AF',
                            background: '#F9F4E2',
                            fontSize: '15px',
                            fontFamily: "'Josefin Sans', sans-serif",
                            color: '#333333',
                            resize: 'none',
                            minHeight: '48px',
                            maxHeight: '120px',
                            outline: 'none',
                            transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#FF7F7F'}
                        onBlur={(e) => e.target.style.borderColor = '#9CA3AF'}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!currentMessage.trim() || isSending || isLoading}
                        style={{
                            padding: '12px',
                            borderRadius: '50%',
                            border: 'none',
                            background: currentMessage.trim() && !isSending && !isLoading
                                ? '#FF7F7F'
                                : '#9CA3AF',
                            color: 'white',
                            cursor: currentMessage.trim() && !isSending && !isLoading ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '48px',
                            height: '48px',
                            flexShrink: 0,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isSending ? (
                            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Send size={20} />
                        )}
                    </button>
                </div>
                <p style={{
                    textAlign: 'center',
                    marginTop: '10px',
                    marginBottom: 0,
                    fontSize: '12px',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    flexWrap: 'wrap'
                }}>
                    <span>💬 Insights</span>
                    <span>•</span>
                    <span>🛒 Lists</span>
                    <span>•</span>
                    <span>📍 Dates</span>
                    <span>•</span>
                    <span>📅 Events</span>
                </p>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default PersonalityAnalysisChatbot;
