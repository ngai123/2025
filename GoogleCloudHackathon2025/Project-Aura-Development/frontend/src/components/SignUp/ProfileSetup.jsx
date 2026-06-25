import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaUser,
    FaBirthdayCake,
    FaVenusMars,
    FaHeart,
    FaEye,
    FaInfoCircle,
    FaBullseye,
    FaGlobe,
    FaRuler,
    FaStar,
    FaCheckCircle,
    FaIdBadge,
} from "react-icons/fa";

const baseInputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "16px",
    border: "1px solid #d1d5db",
    fontFamily: "Josefin Sans, sans-serif", // ✅ consistent font
    fontSize: "16px",
    outline: "none",
    backgroundColor: "var(--color-bg-secondary)",
    color: "var(--color-text-primary)"
};

const baseButtonStyle = {
    width: "100%",
    maxWidth: "320px",
    height: "48px",
    border: "none",
    borderRadius: "24px",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(68, 66, 65, 0.3)",
    outline: "none",
    letterSpacing: "0.2px",
};

// Consistent row styling for icon + input combinations
const fieldRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
};

const iconColor = "var(--color-text-secondary)";

function ProfileSetup() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dob, setDob] = useState("");
    const [gender, setGender] = useState("");
    const [interestedIn, setInterestedIn] = useState("");
    const [profileVisibility, setProfileVisibility] = useState("public");
    const [aboutMe, setAboutMe] = useState("");
    const [myGoalId, setMyGoalId] = useState("");
    const [comeFrom, setComeFrom] = useState("");
    const [heightCm, setHeightCm] = useState("");
    const [zodiac, setZodiac] = useState("");
    const [verifiedStatus] = useState("Unverified");

    const nameOk = Boolean(fullName) || (Boolean(firstName) && Boolean(lastName));
    const isFormValid = nameOk && dob && gender && interestedIn;

    const handleSubmit = () => {
        if (!fullName || !dob || !gender || !interestedIn) {
            alert("Please fill out all fields.");
            return;
        }
        navigate("/profile-picture"); // navigate to profile picture upload
    };

    const goBack = () => {
        navigate("/account-info");
    };

    // 🔹 Button styles for gender & interest
    const optionButtonStyle = (selected, color) => ({
        flex: 1,
        padding: "12px 0",
        borderRadius: "16px",
        border: "none",
        fontWeight: "600",
        fontFamily: "Josefin Sans, sans-serif",
        cursor: "pointer",
        transition: "all 0.2s ease",
        background: selected
            ? color === "blue"
                ? "linear-gradient(135deg, #3B82F6, #60A5FA)"
                : "linear-gradient(135deg, #EC4899, #F9A8D4)"
            : color === "blue"
                ? "#9de8ff"
                : "#FFA0A0",
        color: selected ? "white" : color === "blue" ? "#000000" : "#000000",
        boxShadow: selected ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
    });

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
                minHeight: "100vh",
                padding: "2rem",
                backgroundColor: "var(--color-bg-primary)",
            }}
        >
            <style>{`
                .theme-placeholder::placeholder { color: var(--color-text-primary); opacity: 0.7; }
                .theme-placeholder::-webkit-input-placeholder { color: var(--color-text-primary); opacity: 0.7; }
                .theme-placeholder::-moz-placeholder { color: var(--color-text-primary); opacity: 0.7; }
                .theme-placeholder:-ms-input-placeholder { color: var(--color-text-primary); opacity: 0.7; }
            `}</style>
            {/* 🔹 Main Content */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "20px",
                    width: "100%",
                    maxWidth: "360px",
                    // Reserve space so bottom fixed buttons never overlap content
                    paddingBottom: "calc(50px + env(safe-area-inset-bottom))",
                    // Remove extra bottom padding since bar is no longer fixed
                }}
            >
                <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "12px", color: "var(--color-text-primary)" }}>
                    Set Up Your Profile
                </h1>

                {/* Full Name (optional if first+last provided) */}
                <div style={fieldRowStyle}>
                    <FaUser size={20} color={iconColor} />
                    <input
                        type="text"
                        className="theme-placeholder"
                        placeholder="Nick Name (optional)"
                        style={{ ...baseInputStyle}}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                </div>

                {/* First Name / Last Name */}
                <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px" }}>
                        <FaIdBadge size={20} color={iconColor} />
                        <input
                            type="text"
                            className="theme-placeholder"
                            placeholder="First Name"
                            style={baseInputStyle}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px" }}>
                        <FaIdBadge size={20} color={iconColor} />
                        <input
                            type="text"
                            className="theme-placeholder"
                            placeholder="Last Name"
                            style={baseInputStyle}
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                </div>

                {/* DOB */}
                <div style={fieldRowStyle}>
                    <FaBirthdayCake size={20} color={iconColor} />
                    <input
                        type="date"
                        className="theme-placeholder"
                        style={baseInputStyle}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                    />
                </div>

                {/* Gender */}
                <div style={{ width: "100%" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontFamily: "Josefin Sans, sans-serif", color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        <FaVenusMars size={18} color={iconColor} /> Gender
                    </label>
                    <div style={{ display: "flex", gap: "16px" }}>
                        <button
                            type="button"
                            style={optionButtonStyle(gender === "Male", "blue")}
                            onClick={() => setGender("Male")}
                        >
                            Male
                        </button>
                        <button
                            type="button"
                            style={optionButtonStyle(gender === "Female", "pink")}
                            onClick={() => setGender("Female")}
                        >
                            Female
                        </button>
                    </div>
                </div>

                {/* Interested In */}
                <div style={{ width: "100%" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontFamily: "Josefin Sans, sans-serif", color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        <FaHeart size={18} color={iconColor} /> Interested In
                    </label>
                    <div style={{ display: "flex", gap: "16px" }}>
                        <button
                            type="button"
                            style={optionButtonStyle(interestedIn === "Men", "blue")}
                            onClick={() => setInterestedIn("Men")}
                        >
                            Men
                        </button>
                        <button
                            type="button"
                            style={optionButtonStyle(interestedIn === "Women", "pink")}
                            onClick={() => setInterestedIn("Women")}
                        >
                            Women
                        </button>
                    </div>
                </div>

                {/* Profile Visibility */}
                <div style={{ width: "100%" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontFamily: "Josefin Sans, sans-serif", color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        <FaEye size={18} color={iconColor} /> Profile Visibility
                    </label>
                    <select
                        style={{ ...baseInputStyle }}
                        value={profileVisibility}
                        onChange={(e) => setProfileVisibility(e.target.value)}
                    >
                        <option value="public">Public</option>
                        <option value="friends">Friends</option>
                        <option value="private">Private</option>
                    </select>
                </div>

                {/* About Me */}
                <div style={{ width: "100%" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontFamily: "Josefin Sans, sans-serif", color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        <FaInfoCircle size={18} color={iconColor} /> About Me
                    </label>
                    <textarea
                        className="theme-placeholder"
                        placeholder="Tell us about yourself"
                        style={{ ...baseInputStyle, minHeight: "96px", resize: "vertical" }}
                        value={aboutMe}
                        onChange={(e) => setAboutMe(e.target.value)}
                    />
                </div>

                {/* My Goal */}
                <div style={{ width: "100%" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontFamily: "Josefin Sans, sans-serif", color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        <FaBullseye size={18} color={iconColor} /> My Goal
                    </label>
                    <select
                        style={{ ...baseInputStyle }}
                        value={myGoalId}
                        onChange={(e) => setMyGoalId(e.target.value)}
                    >
                        <option value="">Select a goal</option>
                        <option value="dating">Dating</option>
                        <option value="friendship">Friendship</option>
                        <option value="networking">Networking</option>
                    </select>
                </div>

                {/* Come From */}
                <div style={{ width: "100%" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontFamily: "Josefin Sans, sans-serif", color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        <FaGlobe size={18} color={iconColor} /> Come From
                    </label>
                    <input
                        type="text"
                        className="theme-placeholder"
                        placeholder="e.g., Malaysia"
                        style={baseInputStyle}
                        value={comeFrom}
                        onChange={(e) => setComeFrom(e.target.value)}
                    />
                </div>

                {/* Height (cm) */}
                <div style={{ width: "100%" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontFamily: "Josefin Sans, sans-serif", color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        <FaRuler size={18} color={iconColor} /> Height (cm)
                    </label>
                    <input
                        type="number"
                        className="theme-placeholder"
                        placeholder="e.g., 175"
                        min={100}
                        max={250}
                        style={baseInputStyle}
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                    />
                </div>

                {/* Zodiac */}
                <div style={{ width: "100%" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontFamily: "Josefin Sans, sans-serif", color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        <FaStar size={18} color={iconColor} /> Zodiac
                    </label>
                    <select
                        style={{ ...baseInputStyle }}
                        value={zodiac}
                        onChange={(e) => setZodiac(e.target.value)}
                    >
                        <option value="">Select zodiac</option>
                        <option value="Aries">Aries</option>
                        <option value="Taurus">Taurus</option>
                        <option value="Gemini">Gemini</option>
                        <option value="Cancer">Cancer</option>
                        <option value="Leo">Leo</option>
                        <option value="Virgo">Virgo</option>
                        <option value="Libra">Libra</option>
                        <option value="Scorpio">Scorpio</option>
                        <option value="Sagittarius">Sagittarius</option>
                        <option value="Capricorn">Capricorn</option>
                        <option value="Aquarius">Aquarius</option>
                        <option value="Pisces">Pisces</option>
                    </select>
                </div>

                {/* Verified Status (read-only) */}
                <div style={{ width: "100%" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontFamily: "Josefin Sans, sans-serif", color: "var(--color-text-primary)", marginBottom: "8px" }}>
                        <FaCheckCircle size={18} color={iconColor} /> Verified Status
                    </label>
                    <input
                        type="text"
                        style={{ ...baseInputStyle }}
                        value={verifiedStatus}
                        disabled
                    />
                </div>
            </div>

            {/* 🔹 Navigation Buttons (Bottom, non-fixed) */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%",
                    maxWidth: "320px",
                    marginTop: "10px",
                    marginBottom: "20px",
                }}
            >
                <button
                    style={{
                        ...baseButtonStyle,
                        background: "linear-gradient(135deg, #FF7F7F, #FFA0A0)",
                        opacity: isFormValid ? 1 : 0.7,
                        cursor: isFormValid ? "pointer" : "not-allowed",
                    }}
                    onClick={handleSubmit}
                    disabled={!isFormValid}
                >
                    Continue
                </button>

                <button
                    style={{
                        ...baseButtonStyle,
                        background: "linear-gradient(135deg, #6B7280, #9CA3AF)",
                    }}
                    onClick={goBack}
                >
                    Back
                </button>
            </div>
        </div>
    );
}

export default ProfileSetup;
