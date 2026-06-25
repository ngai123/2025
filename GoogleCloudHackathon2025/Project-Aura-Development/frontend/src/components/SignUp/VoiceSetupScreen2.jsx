import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, ChevronRight, AlertCircle } from 'lucide-react';
import owlMascotBoy from '../../image/owl-mascot-boy.png';

// --- iOS PWA Height Fix ---
const useAppHeight = () => {
    useEffect(() => {
        const setAppHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        };

        setAppHeight();
        window.addEventListener('resize', setAppHeight);
        window.addEventListener('orientationchange', setAppHeight);

        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setAppHeight();
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('resize', setAppHeight);
            window.removeEventListener('orientationchange', setAppHeight);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);
};

// --- Configuration matching Settings page ---
const CONFIG = {
    COLORS: {
        '--color-bg-primary': '#F9F4E2',
        '--color-bg-secondary': '#FFFFFF',
        '--color-text-primary': '#333333',
        '--color-text-secondary': '#6B7280',
        '--color-accent-red': '#FF7F7F',
        '--color-accent-pink': '#FFBEBE',
        '--color-icon-muted': '#9CA3AF',
        '--font-primary': "'Josefin Sans', sans-serif",
    }
};

// --- Main Component ---
const VoiceSetupScreen2 = () => {
    const navigate = useNavigate();
    const location = useLocation();
    useAppHeight();

    // Get the previous page from navigation state, default to /id-verification
    const fromPage = location.state?.from || '/id-verification';

    const [questionIndex, setQuestionIndex] = useState(0);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [answers, setAnswers] = useState({});
    const [isComplete, setIsComplete] = useState(false);
    const [personality, setPersonality] = useState('');
    const [isAnalyzed, setIsAnalyzed] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [speechStatus, setSpeechStatus] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [synthesis, setSynthesis] = useState(null);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [isStarted, setIsStarted] = useState(false);
    const [user, setUser] = useState(null);
    const [showBackModal, setShowBackModal] = useState(false);

    // Fetch user data on component mount
    useEffect(() => {
        const storedId = localStorage.getItem('current_user_id') || localStorage.getItem('userId');
        const userId = storedId ? String(storedId) : null;

        if (userId) {
            const fetchUser = async () => {
                try {
                    const response = await api.get(`/users/${userId}`);
                    setUser(response.data);
                } catch (error) {
                    const detail = error?.response?.data?.detail || error.message || 'Unknown error';
                    console.error("Error fetching user data:", detail);
                }
            };
            fetchUser();
        }
    }, []);

    const questions = [
        { title: "Let's get started!", question: "Describe a recent disagreement with someone you care about. How did you react in the moment, and what did you do after?" },
        { title: "That's insightful.", question: "Think about a time when someone you loved needed space. How did that make you feel, and how did you respond?" },
        { title: "Let's go deeper.", question: "Tell me about a moment when you felt emotionally exposed with someone. Was it comfortable or uncomfortable, and why?" },
        { title: "Understanding your roots.", question: "What was love like in your family growing up? How did your parents or caregivers show affection?" },
        { title: "Great self-awareness.", question: "What's a pattern you've noticed you repeat in relationships that you wish you could change?" },
        { title: "Let's talk about support.", question: "When you're overwhelmed or stressed, what do you need from a partner? And what do you tend to do on your own?" },
        { title: "Knowing your values.", question: "What's something you absolutely couldn't accept in a relationship, even if you loved the person deeply? Why is that so important to you?" },
        { title: "Almost there!", question: "How do you know when you're truly loved? What makes you feel most cared for?" },
        { title: "Understanding patterns.", question: "Looking back at your past relationships, what role did you usually play? Were you the pursuer, the pursued, the caretaker, or something else?" },
        { title: "Last one!", question: "Imagine your ideal relationship five years from now. What does a typical evening look like? What are you doing together, and what are you doing apart?" }
    ];

    // Initialize speech synthesis
    useEffect(() => {
        if ('speechSynthesis' in window) {
            setSynthesis(window.speechSynthesis);
            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
                setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);
            };
            if (window.speechSynthesis.getVoices().length !== 0) {
                loadVoices();
            }
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    // Speak the current question when it changes
    useEffect(() => {
        if (synthesis && !isComplete && isStarted) {
            synthesis.cancel();
            const timer = setTimeout(() => {
                speakText(currentQuestion.question);
            }, 400);
            return () => {
                clearTimeout(timer);
                if (synthesis) synthesis.cancel();
            };
        }
    }, [questionIndex, synthesis, isStarted]);

    // Speak the personality analysis when complete
    useEffect(() => {
        if (synthesis && isAnalyzed && personality) {
            synthesis.cancel();
            setTimeout(() => {
                speakText(`Personality Analysis Complete! ${personality}`);
            }, 300);
        }
    }, [isAnalyzed, personality, synthesis]);

    const speakText = (text) => {
        if (!synthesis) return;
        synthesis.cancel();
        setTimeout(() => {
            if (!synthesis) return;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            utterance.volume = 1.0;

            let selectedVoice = availableVoices.find(voice => voice.name === "Google UK English Female");
            if (!selectedVoice) selectedVoice = availableVoices.find(voice => voice.lang === 'en-GB');
            if (!selectedVoice) selectedVoice = availableVoices.find(voice => voice.lang.startsWith('en'));
            if (!selectedVoice && availableVoices.length > 0) selectedVoice = availableVoices[0];
            if (selectedVoice) utterance.voice = selectedVoice;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            synthesis.speak(utterance);
        }, 50);
    };

    // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'en-US';

            recognitionInstance.onstart = () => {
                setIsRecording(true);
                setSpeechStatus('Listening... Speak clearly!');
            };

            recognitionInstance.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    setCurrentAnswer(prev => prev + finalTranscript);
                }
            };

            recognitionInstance.onerror = (event) => {
                setIsRecording(false);
                switch (event.error) {
                    case 'not-allowed':
                    case 'service-not-allowed':
                        alert('Microphone access denied. Please allow microphone access.');
                        break;
                    case 'network':
                        alert('Network error. Please check your connection.');
                        break;
                    case 'audio-capture':
                        alert('No microphone found.');
                        break;
                    default:
                        break;
                }
            };

            recognitionInstance.onend = () => setIsRecording(false);
            recognitionInstance.onspeechstart = () => setSpeechStatus('Processing speech...');
            recognitionInstance.onspeechend = () => setSpeechStatus('Processing...');
            setRecognition(recognitionInstance);

            return () => recognitionInstance?.stop();
        }
    }, []);

    const toggleRecording = async () => {
        if (!recognition) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (synthesis && isSpeaking) {
            synthesis.cancel();
            setIsSpeaking(false);
        }

        if (isRecording) {
            recognition.stop();
            setIsRecording(false);
            setSpeechStatus('');
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                setSpeechStatus('Starting...');
                recognition.start();
            } catch (error) {
                alert(`Microphone access error: ${error.message}`);
            }
        }
    };

    const handleNextQuestion = () => {
        if (isRecording && recognition) {
            recognition.stop();
            setIsRecording(false);
        }
        if (synthesis) {
            synthesis.cancel();
            setIsSpeaking(false);
        }

        const questionText = questions[questionIndex].question;
        const updatedAnswers = { ...answers, [questionText]: currentAnswer };
        setAnswers(updatedAnswers);
        setCurrentAnswer('');

        if (questionIndex < questions.length - 1) {
            setQuestionIndex(questionIndex + 1);
        } else {
            setIsComplete(true);
            handleFinish(updatedAnswers);
        }
    };

    const retryWithBackoff = async (fn, retries = 3, delay = 2000) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                const isLastAttempt = attempt === retries;
                const isNetworkError = error.code === 'ECONNABORTED' || error.message?.includes('timeout') || !error.response;
                if (isLastAttempt || !isNetworkError) throw error;
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    };

    const handleFinish = async (finalAnswers) => {
        const storedId = localStorage.getItem('current_user_id') || localStorage.getItem('userId');
        const userId = storedId ? String(storedId) : null;

        if (!userId) {
            alert('You are not logged in. Please log in to complete voice onboarding.');
            return;
        }

        try {
            await api.post(`/users/${userId}/analysis`, { answers: finalAnswers }, { timeout: 30000 });
            await retryWithBackoff(async () => {
                return await api.post(`/users/${userId}/analysis/analyse`, { answers: finalAnswers }, { timeout: 120000 });
            }, 3, 3000);

            const analysisResult = await retryWithBackoff(async () => {
                return await api.get(`/users/${userId}/analysis`, { timeout: 30000 });
            }, 2, 2000);

            if (analysisResult.data?.characteristic_json) {
                setPersonality(analysisResult.data.characteristic_json);
                setIsAnalyzed(true);
            } else {
                throw new Error("Analysis result is missing the personality field.");
            }
        } catch (error) {
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
            const isNetworkError = error.message?.includes('Network Error') || !error.response;
            let userMessage = isTimeout
                ? 'The analysis is taking longer than expected. Please try again.'
                : isNetworkError
                    ? 'Network connection issue. Please check your internet.'
                    : `Voice onboarding failed: ${error?.response?.data?.detail || error.message}`;
            alert(userMessage);
        }
    };

    const progress = isComplete ? 100 : ((questionIndex) / questions.length) * 100;
    const currentQuestion = questions[questionIndex];

    const styleSheet = `
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        :root {
            --vh: 1vh;
            --app-height: 100vh;
            --safe-area-top: env(safe-area-inset-top, 0px);
            --safe-area-bottom: env(safe-area-inset-bottom, 0px);
            --color-bg-primary: ${CONFIG.COLORS['--color-bg-primary']};
            --color-bg-secondary: ${CONFIG.COLORS['--color-bg-secondary']};
            --color-text-primary: ${CONFIG.COLORS['--color-text-primary']};
            --color-text-secondary: ${CONFIG.COLORS['--color-text-secondary']};
            --color-accent-red: ${CONFIG.COLORS['--color-accent-red']};
            --color-accent-pink: ${CONFIG.COLORS['--color-accent-pink']};
            --color-icon-muted: ${CONFIG.COLORS['--color-icon-muted']};
            --font-primary: ${CONFIG.COLORS['--font-primary']};
        }

        .voice-setup-page {
            font-family: var(--font-primary);
            background-color: var(--color-bg-primary);
            color: var(--color-text-primary);
            min-height: var(--app-height, 100vh);
            min-height: -webkit-fill-available;
            max-width: 450px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            padding: 0 8px;
            padding-top: var(--safe-area-top);
            padding-bottom: var(--safe-area-bottom);
            box-sizing: border-box;
            overflow: hidden;
        }

        .voice-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background-color: var(--color-bg-primary);
            position: sticky;
            top: 0;
            z-index: 20;
        }

        .voice-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .voice-back-button {
            background: none;
            border: none;
            padding: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
        }

        .voice-back-button:hover {
            background-color: rgba(255, 127, 127, 0.1);
        }

        .voice-header-title {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .voice-header-title .material-symbols-outlined {
            font-size: 22px;
            margin-top: -5px;
        }

        .voice-progress-badge {
            background: linear-gradient(135deg, rgba(255, 127, 127, 0.15), rgba(255, 190, 190, 0.2));
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            color: var(--color-accent-red);
        }

        .voice-main-content {
            flex: 1;
            overflow-y: auto;
            padding: 0 4px 160px; /* Increased bottom padding to clear fixed footer */
            -webkit-overflow-scrolling: touch;
        }

        .voice-card {
            margin-bottom: 12px;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .voice-card-header {
            background: linear-gradient(135deg, #fd7474ff, #fa9595ff);
            padding: 10px 16px;
            text-align: center;
            color: white;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            border-bottom: 1px solid var(--color-bg-primary);
        }

        .voice-card-body {
            background-color: var(--color-bg-primary);
            border-radius: 0 0 24px 24px;
            padding: 20px;
        }

        .voice-progress-container {
            margin-bottom: 20px;
        }

        .voice-progress-bar {
            height: 8px;
            background-color: rgba(0, 0, 0, 0.08);
            border-radius: 10px;
            overflow: hidden;
        }

        .voice-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #FF7F7F, #FFA0A0);
            border-radius: 10px;
            transition: width 0.5s ease;
        }

        .voice-owl-section {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 20px;
        }

        .voice-owl-image {
            width: 80px;
            height: auto;
            flex-shrink: 0;
            animation: owlTalk 1.2s ease-in-out infinite;
        }

        .voice-owl-image.speaking {
            animation: owlTalk 0.6s ease-in-out infinite;
        }

        @keyframes owlTalk {
            0% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-5px) rotate(2deg); }
            100% { transform: translateY(0) rotate(-2deg); }
        }

        .voice-speech-bubble {
            flex: 1;
            background: white;
            border-radius: 16px;
            padding: 16px;
            position: relative;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .voice-speech-bubble::before {
            content: '';
            position: absolute;
            left: -8px;
            top: 20px;
            border-width: 8px;
            border-style: solid;
            border-color: transparent white transparent transparent;
        }

        .voice-question-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--color-accent-red);
            margin: 0 0 8px 0;
        }

        .voice-question-text {
            font-size: 15px;
            color: var(--color-text-secondary);
            line-height: 1.6;
            margin: 0;
        }

        .voice-textarea-container {
            position: relative;
            margin-bottom: 16px;
        }

        .voice-textarea {
            width: 100%;
            min-height: 120px;
            padding: 16px;
            padding-right: 60px;
            border: 1px solid var(--color-icon-muted);
            border-radius: 16px;
            font-family: var(--font-primary);
            font-size: 16px;
            color: var(--color-text-primary);
            background-color: white;
            resize: vertical;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            box-sizing: border-box;
        }

        .voice-textarea:focus {
            border-color: var(--color-accent-red);
            box-shadow: 0 0 0 3px rgba(255, 127, 127, 0.1);
        }

        .voice-textarea::placeholder {
            color: var(--color-icon-muted);
            font-style: italic;
        }

        .voice-mic-button {
            position: absolute;
            right: 12px;
            top: 12px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #FF7F7F, #FFA0A0);
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(255, 127, 127, 0.3);
            transition: all 0.2s;
        }

        .voice-mic-button:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(255, 127, 127, 0.4);
        }

        .voice-mic-button.recording {
            background: linear-gradient(135deg, #FF4444, #FF6666);
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3); }
            50% { transform: scale(1.08); box-shadow: 0 6px 20px rgba(255, 68, 68, 0.5); }
        }

        .voice-status-text {
            font-size: 13px;
            color: var(--color-accent-red);
            text-align: center;
            margin-top: 8px;
            font-weight: 500;
        }

        .voice-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 16px;
            background-color: var(--color-bg-primary);
            border-top: 1px solid rgba(0, 0, 0, 0.05);
            z-index: 10;
        }

        .voice-footer-inner {
            max-width: 450px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .voice-primary-button {
            width: 100%;
            padding: 14px;
            border-radius: 20px;
            border: none;
            background: linear-gradient(135deg, #FF7F7F, #FFA0A0);
            color: white;
            font-family: var(--font-primary);
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(255, 127, 127, 0.3);
            transition: all 0.2s;
        }

        .voice-primary-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(255, 127, 127, 0.4);
        }

        .voice-primary-button:disabled {
            background: linear-gradient(135deg, #ccc, #ddd);
            cursor: not-allowed;
            box-shadow: none;
        }

        .voice-secondary-button {
            width: 100%;
            padding: 14px;
            border-radius: 20px;
            border: 2px solid var(--color-accent-red);
            background: transparent;
            color: var(--color-accent-red);
            font-family: var(--font-primary);
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .voice-secondary-button:hover {
            background-color: rgba(255, 127, 127, 0.1);
        }

        /* Welcome Overlay */
        .voice-welcome-overlay {
            position: fixed;
            inset: 0;
            background: rgba(249, 244, 226, 0.95);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
            text-align: center;
        }

        .voice-welcome-title {
            font-size: 32px;
            font-weight: 700;
            color: var(--color-accent-red);
            margin-bottom: 12px;
        }

        .voice-welcome-text {
            font-size: 16px;
            color: var(--color-text-secondary);
            margin-bottom: 30px;
            max-width: 300px;
        }

        /* Analysis Result Card - make content scrollable */
        .voice-analysis-card {
            margin-bottom: 20px;
        }

        .voice-analysis-card .voice-card-body {
            max-height: 400px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }

        .voice-analysis-content {
            color: var(--color-text-primary);
            font-size: 15px;
            line-height: 1.8;
        }

        .voice-analysis-loading {
            text-align: center;
            padding: 20px;
        }

        .voice-loading-dots {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 20px;
        }

        .voice-loading-dot {
            width: 10px;
            height: 10px;
            background: var(--color-accent-red);
            border-radius: 50%;
            animation: bounce 1.4s ease-in-out infinite;
        }

        .voice-loading-dot:nth-child(1) { animation-delay: 0s; }
        .voice-loading-dot:nth-child(2) { animation-delay: 0.2s; }
        .voice-loading-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40% { transform: scale(1.2); opacity: 1; }
        }

        /* Modal Styles */
        .voice-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .voice-modal-content {
            background: white;
            border-radius: 24px;
            padding: 0;
            margin: 20px;
            max-width: 400px;
            width: 90%;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .voice-modal-header {
            background: linear-gradient(135deg, #fd7474ff, #fa9595ff);
            padding: 16px;
            text-align: center;
            color: white;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
        }

        .voice-modal-body {
            padding: 24px;
            background-color: var(--color-bg-primary);
            text-align: center;
        }

        .voice-modal-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .voice-modal-text {
            font-size: 15px;
            color: var(--color-text-secondary);
            line-height: 1.6;
            margin-bottom: 24px;
        }

        .voice-modal-actions {
            display: flex;
            gap: 12px;
        }

        .voice-modal-actions button {
            flex: 1;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;

    // Welcome overlay before starting
    if (!isStarted) {
        return (
            <div className="voice-setup-page">
                <style dangerouslySetInnerHTML={{ __html: styleSheet }} />
                <div className="voice-welcome-overlay">
                    <h1 className="voice-welcome-title">
                        {user ? `Hi ${user.full_name?.split(' ')[0] || 'there'}!` : 'Welcome!'}
                    </h1>
                    <p className="voice-welcome-text">
                        I'm ready to help you uncover your unique Aura through a series of thoughtful questions.
                    </p>
                    <button
                        className="voice-primary-button"
                        onClick={() => setIsStarted(true)}
                        style={{ maxWidth: '200px' }}
                    >
                        Let's Begin
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="voice-setup-page">
            <style dangerouslySetInnerHTML={{ __html: styleSheet }} />

            {/* Header - Matching Settings Page */}
            <div className="voice-header">
                <div className="voice-header-left">
                    <h1 className="voice-header-title">
                        <span className="material-symbols-outlined">mic</span>
                        Voice Setup
                    </h1>
                </div>
                <div className="voice-progress-badge">
                    {isComplete ? questions.length : questionIndex + 1} of {questions.length}
                </div>
            </div>

            {/* Main Content */}
            <div className="voice-main-content">
                {/* Progress Card */}
                <div className="voice-card">
                    <div className="voice-card-header">PROGRESS</div>
                    <div className="voice-card-body">
                        <div className="voice-progress-container">
                            <div className="voice-progress-bar">
                                <div
                                    className="voice-progress-fill"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Owl and Speech Bubble */}
                        <div className="voice-owl-section">
                            <img
                                src={owlMascotBoy}
                                alt="Aura Owl"
                                className={`voice-owl-image ${isSpeaking ? 'speaking' : ''}`}
                            />
                            <div className="voice-speech-bubble">
                                {isComplete ? (
                                    isAnalyzed ? (
                                        <>
                                            <h3 className="voice-question-title">✨ Analysis Complete!</h3>
                                            <p className="voice-question-text">
                                                Your personality insights are ready. View them now!
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="voice-question-title">Analyzing...</h3>
                                            <p className="voice-question-text">
                                                Thanks for sharing! I'm processing your responses.
                                            </p>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <h3 className="voice-question-title">{currentQuestion.title}</h3>
                                        <p className="voice-question-text">{currentQuestion.question}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Answer Card */}
                {!isComplete && (
                    <div className="voice-card">
                        <div className="voice-card-header">YOUR ANSWER</div>
                        <div className="voice-card-body">
                            <div className="voice-textarea-container">
                                <textarea
                                    className="voice-textarea"
                                    value={currentAnswer}
                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                    placeholder="Type your answer here or use the microphone..."
                                />
                                <button
                                    className={`voice-mic-button ${isRecording ? 'recording' : ''}`}
                                    onClick={toggleRecording}
                                    title={isRecording ? 'Stop recording' : 'Start recording'}
                                >
                                    {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                                </button>
                            </div>
                            {speechStatus && (
                                <p className="voice-status-text">{speechStatus}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Analysis Result Card */}
                {isComplete && isAnalyzed && (
                    <div className="voice-card voice-analysis-card">
                        <div className="voice-card-header">AI INSIGHTS</div>
                        <div className="voice-card-body">
                            <div
                                className="voice-analysis-content"
                                dangerouslySetInnerHTML={{
                                    __html: personality
                                        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FF7F7F;">$1</strong>')
                                        .replace(/\n\n/g, '<br/><br/>')
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isComplete && !isAnalyzed && (
                    <div className="voice-card">
                        <div className="voice-card-header">ANALYZING</div>
                        <div className="voice-card-body">
                            <div className="voice-analysis-loading">
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                                    Creating your personalized profile...
                                </p>
                                <div className="voice-loading-dots">
                                    <div className="voice-loading-dot"></div>
                                    <div className="voice-loading-dot"></div>
                                    <div className="voice-loading-dot"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="voice-footer">
                <div className="voice-footer-inner">
                    {isComplete ? (
                        isAnalyzed && (
                            <button
                                className="voice-primary-button"
                                onClick={() => {
                                    if (synthesis) synthesis.cancel();
                                    navigate('/personality-analysis', { state: { from: '/voice-setup' } });
                                }}
                            >
                                View Your Analysis
                                <ChevronRight size={20} />
                            </button>
                        )
                    ) : (
                        <button
                            className="voice-primary-button"
                            onClick={handleNextQuestion}
                            disabled={!currentAnswer.trim()}
                        >
                            {questionIndex === questions.length - 1 ? '🎉 Finish' : 'Next'}
                            <ChevronRight size={20} />
                        </button>
                    )}
                    <button
                        className="voice-secondary-button"
                        onClick={() => setShowBackModal(true)}
                    >
                        ← Back
                    </button>
                </div>
            </div>

            {/* Back Confirmation Modal */}
            {showBackModal && (
                <div className="voice-modal-overlay" onClick={() => setShowBackModal(false)}>
                    <div className="voice-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="voice-modal-header">Go Back?</div>
                        <div className="voice-modal-body">
                            <div className="voice-modal-icon">
                                <AlertCircle size={48} color="#FF7F7F" />
                            </div>
                            <p className="voice-modal-text">
                                If you go back now, all your voice onboarding progress will be lost and your answers will NOT be saved.
                            </p>
                            <div className="voice-modal-actions">
                                <button
                                    className="voice-secondary-button"
                                    onClick={() => setShowBackModal(false)}
                                >
                                    Stay Here
                                </button>
                                <button
                                    className="voice-primary-button"
                                    onClick={() => {
                                        if (synthesis) synthesis.cancel();
                                        if (recognition) recognition.stop();
                                        navigate(fromPage);
                                    }}
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceSetupScreen2;
