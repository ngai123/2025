import React, { useState, useEffect } from 'react';
import "@fontsource/josefin-sans";

// --- IMPORTANT -- -
// Make sure you have both owl images in your assets folder
import owlMascot from '../assets/owl-mascot.png';
import owlMascotBoy from '../assets/owl-mascot-boy.png';

// --- Reusable SVG Icons (No changes here) ---
const MicrophoneIcon = ({ color = '#8A2BE2', size = '24' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm0 14a5 5 0 0 1-5-5H5a7 7 0 0 0 6 6.92V21h-2v2h6v-2h-2v-2.08A7 7 0 0 0 19 10h-2a5 5 0 0 1-5 5z" fill={color} />
    </svg>
);

const ArrowRightIcon = ({ color = '#F9F4E2', size = '4vw' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);


// --- Main Screen Component ---
const VoiceSetupScreen = () => {
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);

    useEffect(() => {
        const getVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
            setSelectedVoice(availableVoices[0]);
        };
        getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = getVoices;
        }
    }, []);

    const handlePlay = (text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        window.speechSynthesis.speak(utterance);
    };

    const handleVoiceChange = () => {
        const currentIndex = voices.findIndex(voice => voice.name === selectedVoice.name);
        const nextIndex = (currentIndex + 1) % voices.length;
        setSelectedVoice(voices[nextIndex]);
    };

    const styles = {
        //background 
        screen: {
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Josefin Sans", sans-serif',
            backgroundColor: '#F9F4E2',
            color: '#FF7F7F ',
            height: '100vh',
            width: '90vw', // Use full viewport width for flexibility
            maxWidth: '100%', // Remove fixed maxWidth to adapt to screen
            margin: '0 auto',
            border: '0.5vw solid #E2DDB4', // Relative border
            boxSizing: 'border-box',
            overflow: 'hidden',
            touchAction: 'manipulation',
        },
        header: {
            padding: '4vw',
            flexShrink: 0,
        },
        headerText: {
            display: 'flex',
            justifyContent: 'space-between',
            color: '#7B7A6B',
            fontSize: 'clamp(3vw, 3.5vw, 3.5vw)', // Flexible font
            fontWeight: '600',
            marginBottom: '2vw',
        },
        progressBarContainer: {
            backgroundColor: '#E2DDB4',
            borderRadius: '2vw',
            height: '2vw',
            overflow: 'hidden',
        },
        progressBar: {
            width: '66.67%',
            height: '100%',
            background: 'linear-gradient(to right, #FF7F7F, #FFA0A0)',
            borderRadius: '2vw',
        },
        mainContent: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '4vw',
            overflowY: 'auto',
            justifyContent: 'flex-start', // Align to top for better scrolling access
            WebkitOverflowScrolling: 'touch', // Improve iOS scrolling smoothness
        },
        // --- Original Container (Girl) ---
        conversationContainer: {
            alignSelf: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            maxWidth: '90%',
            paddingBottom: '4vw',
        },
        owlImage: {
            width: 'min(45vw, 45%)', // Relative to viewport or parent
            height: 'auto',
            zIndex: 2,
            marginRight: '-5vw',
            marginBottom: '-2.5vw',
        },
        speechBubble: {
            marginTop: '7.5vw',
            position: 'relative',
            background: '#FFFFFF',
            borderRadius: '3vw',
            padding: '4vw',
            width: 'min(80vw, 75%)',
            textAlign: 'left',
            boxShadow: '0 1vw 2.5vw rgba(0, 0, 0, 0.1)',
            border: '0.5vw solid #E2DDB4',
            zIndex: 1,
            marginBottom: '2.5vw',
        },
        speechBubblePointer: {
            content: '""',
            position: 'absolute',
            right: '6.25vw',
            bottom: '-3vw',
            width: '0',
            height: '0',
            borderLeft: '2.5vw solid transparent',
            borderRight: '2.5vw solid transparent',
            borderTop: '3vw solid #FFFFFF',
        },
        speechBubblePointerBorder: {
            content: '""',
            position: 'absolute',
            right: '5.75vw',
            bottom: '-3.75vw',
            width: '0',
            height: '0',
            borderLeft: '3vw solid transparent',
            borderRight: '3vw solid transparent',
            borderTop: '3.5vw solid #E2DDB4',
        },
        // --- Styles for the second (boy) container ---
        conversationContainerBoy: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            alignSelf: 'center',
            maxWidth: '90%',
            marginBottom: '2vw',
        },
        owlImageBoy: {
            width: 'min(45vw, 45%)',
            height: 'auto',
            zIndex: 2,
            marginLeft: '-5vw',
            marginBottom: '-2.5vw',
        },
        speechBubbleBoy: {
            position: 'relative',
            background: '#FFFFFF',
            borderRadius: '3vw',
            padding: '4vw',
            width: 'min(80vw, 75%)',
            textAlign: 'left',
            boxShadow: '0 1vw 2.5vw rgba(0, 0, 0, 0.1)',
            border: '0.5vw solid #E2DDB4',
            zIndex: 1,
            marginBottom: '2.5vw',
        },
        speechBubblePointerBoy: {
            content: '""',
            position: 'absolute',
            left: '6.25vw',
            bottom: '-3vw',
            width: '0',
            height: '0',
            borderLeft: '2.5vw solid transparent',
            borderRight: '2.5vw solid transparent',
            borderTop: '3vw solid #FFFFFF',
        },
        speechBubblePointerBorderBoy: {
            content: '""',
            position: 'absolute',
            left: '5.75vw',
            bottom: '-3.75vw',
            width: '0',
            height: '0',
            borderLeft: '3vw solid transparent',
            borderRight: '3vw solid transparent',
            borderTop: '3.5vw solid #E2DDB4',
        },
        title: {
            fontSize: 'clamp(4vw, 4.5vw, 4.5vw)',
            fontWeight: '700',
            margin: '0 0 2vw 0',
            textShadow: '0 0 2.5vw rgba(255, 127, 127, 0.5)',
        },
        subtitle: {
            color: '#5C5B52',
            fontSize: 'clamp(3vw, 3.25vw, 3.25vw)',
            margin: '0 0 4vw 0',
            fontWeight: '400',
        },
        recordButton: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2vw',
            background: 'linear-gradient(90deg, #FF7F7F, #FFA0A0)',
            color: '#F9F4E2',
            border: 'none',
            borderRadius: '6.25vw',
            padding: '3vw 6vw',
            fontSize: 'clamp(3.5vw, 4vw, 4vw)',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: 'inset 0 0 1.25vw rgba(0,0,0,0.15), 0 1vw 2vw rgba(0, 0, 0, 0.1)',
            textShadow: '0 0 2vw rgba(249, 244, 226, 0.6)',
            width: 'fit-content',
            margin: '0 auto',
            minWidth: '50vw',
            minHeight: '12vw',
        },
        // --- NEW: Boy's record button style ---
        recordButtonBoy: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2vw',
            background: 'linear-gradient(90deg, #7F7FFF, #A0A0FF)', // Blue gradient
            color: '#F9F4E2',
            border: 'none',
            borderRadius: '6.25vw',
            padding: '3vw 6vw',
            fontSize: 'clamp(3.5vw, 4vw, 4vw)',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: 'inset 0 0 1.25vw rgba(0,0,0,0.15), 0 1vw 2vw rgba(0, 0, 0, 0.1)',
            textShadow: '0 0 2vw rgba(249, 244, 226, 0.6)',
            width: 'fit-content',
            margin: '0 auto',
            minWidth: '50vw',
            minHeight: '12vw',
        },
        infoText: {
            color: '#7B7A6B',
            fontSize: 'clamp(3vw, 3.5vw, 3.5vw)',
            lineHeight: '1.5',
            maxWidth: '90%',
            textAlign: 'center',
            alignSelf: 'center',
        },
        divider: {
            width: '100%',
            height: '0.25vw',
            backgroundColor: '#E2DDB4',
            marginBottom: '4vw',
        },
        footer: {
            padding: '0 4vw 4vw 4vw',
            flexShrink: 0,
        },
        continueButton: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2vw',
            width: '100%',
            background: 'linear-gradient(90deg, #FF7F7F, #FFA0A0)',
            color: '#F9F4E2',
            border: 'none',
            borderRadius: '2vw',
            padding: '4vw',
            fontSize: 'clamp(3.5vw, 4vw, 4vw)',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: 'inset 0 0 1.25vw rgba(0,0,0,0.15), 0 1vw 2vw rgba(0, 0, 0, 0.1)',
            textShadow: '0 0 2vw rgba(249, 244, 226, 0.6)',
            minHeight: '14vw',
        },
        backButton: {
            backgroundColor: 'transparent',
            border: 'none',
            color: '#7B7A6B',
            width: '100%',
            padding: '4vw 0',
            fontSize: 'clamp(3.5vw, 4vw, 4vw)',
            fontWeight: '600',
            cursor: 'pointer',
            textAlign: 'center',
            minHeight: '12vw',
        },
        ttsButton: {
            backgroundColor: '#7F7FFF',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            padding: '10px',
            cursor: 'pointer',
            marginTop: '10px',
        },
    };

    return (
        <div style={styles.screen}>
            {/* --- Header Section (Unchanged) --- */}
            <div style={styles.header}>
                <div style={styles.headerText}>
                    <span>AI Setup</span>
                    <span>2 of 3</span>
                </div>
                <div style={styles.progressBarContainer}>
                    <div style={styles.progressBar}></div>
                </div>
            </div>

            {/* --- Main Content Section (MODIFIED) --- */}
            <div style={styles.mainContent}>
                <p style={styles.infoText}>
                    Your recording will be shared on your profile to help create better connections.
                </p>

                {/* --- Mirrored Conversation Container --- */}
                <div style={styles.conversationContainerBoy}>
                    <div style={styles.speechBubbleBoy}>
                        <div style={styles.speechBubblePointerBorderBoy}></div>
                        <div style={styles.speechBubblePointerBoy}></div>
                        <h1 style={styles.title}>What makes you unique?</h1>
                        <p style={styles.subtitle}>Share a fun fact or a hobby that you're passionate about!</p>
                        {/* --- NEW: Button for the boy's conversation box --- */}
                        <button style={styles.recordButtonBoy}>
                            <MicrophoneIcon color="#F9F4E2" size="4.5vw" />
                            Start Recording (30s)
                        </button>
                        <button style={styles.ttsButton} onClick={() => handlePlay(document.querySelector('.conversationContainerBoy .title').textContent + ' ' + document.querySelector('.conversationContainerBoy .subtitle').textContent)}>Play</button>
                        <button style={styles.ttsButton} onClick={handleVoiceChange}>Change Voice</button>
                    </div>
                    <img src={owlMascotBoy} alt="Owl Mascot Boy" style={styles.owlImageBoy} />
                </div>

                {/* --- Original Conversation Container --- */}
                <div style={styles.conversationContainer}>
                    <div style={styles.speechBubble}>
                        <div style={styles.speechBubblePointerBorder}></div>
                        <div style={styles.speechBubblePointer}></div>
                        <h1 style={styles.title}>Let's record your voice!</h1>
                        <p style={styles.subtitle}>A voice intro helps others get a true sense of your personality.</p>
                        <button style={styles.recordButton}>
                            <MicrophoneIcon color="#F9F4E2" size="4.5vw" />
                            Start Recording (30s)
                        </button>
                        <button style={styles.ttsButton} onClick={() => handlePlay(document.querySelector('.conversationContainer .title').textContent + ' ' + document.querySelector('.conversationContainer .subtitle').textContent)}>Play</button>
                        <button style={styles.ttsButton} onClick={handleVoiceChange}>Change Voice</button>
                    </div>
                    <img src={owlMascot} alt="Owl Mascot" style={styles.owlImage} />
                </div>
            </div>

            {/* --- Footer/Navigation Section --- */}
            <div style={styles.footer}>
                <button style={styles.continueButton}>
                    Continue
                    <ArrowRightIcon color="#F9F4E2" size="4vw" />
                </button>
                <button style={styles.backButton}>Back</button>
            </div>
        </div>
    );
};

export default VoiceSetupScreen;