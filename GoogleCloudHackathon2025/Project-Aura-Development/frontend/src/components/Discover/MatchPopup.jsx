import { motion, AnimatePresence } from "framer-motion";

import './MatchPopup.css';
import {BASE_URL} from "./../../api/axios";

const MatchPopup = ({ show, userMatchInfo, onClose }) => {
    if (!userMatchInfo) return null;

    // Determine the matched user's name for the subtitle
    const matchedUserName = userMatchInfo.user2?.username || "your match";

    const handleMessage = () => {
        // matchId now maps to the server's 'session_id'
        if (userMatchInfo.session_id) {
            // Redirect to the chat room using the session ID
            window.location.href = `/chat/${userMatchInfo.session_id}`; 
        } else {
            console.warn("No session_id provided in userMatchInfo");
        }
    };

    return (
        <>
            <AnimatePresence>
                {show && (
                    <motion.div
                        className="match-popup-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="match-popup-content"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        >
                            <h2 className="match-title">It’s a Match!</h2>
                            <p className="match-subtitle">
                                You and <b>{matchedUserName}</b> liked each other.
                            </p>
                            <div className="match-images">
                                <motion.img
                                    // Use user1 (liker) image_url
                                    src={userMatchInfo.user1?.image_url} 
                                    alt="You"
                                    className="match-photo"
                                    initial={{ x: -50, opacity: 0, rotate: -20 }}
                                    animate={{ x: 0, opacity: 1, rotate: 0 }}
                                    transition={{ delay: 0.1 }}
                                />
                                <motion.img
                                    // Use user2 (liked/matched) image_url
                                    src={userMatchInfo.user2?.image_url} 
                                    alt="Match"
                                    className="match-photo"
                                    initial={{ x: 50, opacity: 0, rotate: 20 }}
                                    animate={{ x: 0, opacity: 1, rotate: 0 }}
                                    transition={{ delay: 0.1 }}
                                />
                            </div>

                            <div className="match-buttons">
                                <button className="btn-message" onClick={handleMessage}>
                                    Send Message
                                </button>
                                <button className="btn-keep" onClick={onClose}>
                                    Keep Swiping
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default MatchPopup;
