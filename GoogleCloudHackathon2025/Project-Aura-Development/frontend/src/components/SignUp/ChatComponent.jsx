// ChatInterface.jsx
import React from "react";
import "@fontsource/josefin-sans/400.css";
import "@fontsource/josefin-sans/700.css";

/**
 * Single-file chat UI component.
 * - All styles are in this file (inside the <style> tag)
 * - Uses your palette:
 *   #E2DDB4  #FF7F7F  #FFA0A0  #FFBEBE  #F9F4E2
 *
 * Usage:
 * <ChatInterface avatar="/assets/avatar.png" partnerName="Emma" />
 */

export default function ChatComponent({ avatar, partnerName = "Emma" }) {
  return (
    <div className="chat-shell josefin-sans-uni">
      <header className="topbar">
        <button className="back">‹</button>
        <div className="profile">
          <img
            className="avatar"
            src={avatar || "https://via.placeholder.com/48"}
            alt={`${partnerName} avatar`}
          />
          <div className="meta">
            <div className="name">{partnerName}</div>
            <div className="status">Active now</div>
          </div>
        </div>
        <div className="icons">
          <button className="icon">📞</button>
          <button className="icon">📷</button>
          <button className="icon">⋯</button>
        </div>
      </header>

      <div className="match-banner">💗 You matched with {partnerName}!</div>

      <main className="messages-area">
        <div className="message received">
          <p>Hey! I saw you love hiking too. Have you been to any good trails recently?</p>
          <time>4:20 PM</time>
        </div>

        <div className="message sent">
          <p>Yes! I just went to Mount Tamalpais last weekend. The views were incredible!</p>
          <time>4:21 PM</time>
        </div>

        <div className="message received">
          <p>
            That sounds amazing! I've been wanting to check that one out. Did you take the steep trail or the longer route?
          </p>
          <time>4:22 PM</time>
        </div>

        <div className="ai-box">
          <div className="ai-title">AI Suggestions</div>
          <div className="ai-suggestions">
            <button className="pill">That sounds like an adventure! ⛰️</button>
            <button className="pill">I'd love to hear more about that!</button>
          </div>
        </div>
      </main>

      <footer className="composer">
        <div className="quick-actions">
          <button className="qa">Ask about interests</button>
          <button className="qa">Plan a date</button>
          <button className="qa">Share a photo</button>
        </div>

        <div className="input-line">
          <input aria-label="Type a message" placeholder="Type a message..." />
          <button className="mic" title="Record">🎤</button>
        </div>
      </footer>

      <style>{`
        :root{
          --pale: #E2DDB4;
          --accent1: #FF7F7F;
          --accent2: #FFA0A0;
          --accent3: #FFBEBE;
          --cream: #F9F4E2;
          --bg: #fff;
          --text: #2b2b2b;
          --muted: #6b6b6b;
          --radius: 14px;
        }

        /* Your Josefin Sans utility classes (matching .josefin-sans-<uniquifier> idea) */
        .josefin-sans-uni { font-family: "Josefin Sans", sans-serif; font-style: normal; }
        .josefin-sans-regular { font-family: "Josefin Sans", sans-serif; font-weight: 400; }
        .josefin-sans-bold { font-family: "Josefin Sans", sans-serif; font-weight: 700; }

        /* Layout */
        .chat-shell{
          width: 380px;
          max-width: 96vw;
          height: 760px;
          margin: 18px auto;
          display: flex;
          flex-direction: column;
          border-radius: 18px;
          background: linear-gradient(180deg, var(--bg) 0%, #FEFEFE 100%);
          box-shadow: 0 8px 30px rgba(16,16,16,0.12);
          border: 2px solid rgba(226,221,180,0.12);
          overflow: hidden;
        }

        .topbar{
          display:flex;
          align-items:center;
          gap:12px;
          padding: 12px 14px;
          background: linear-gradient(90deg, rgba(242,239,221,0.4), rgba(255,255,255,0.2));
        }
        .back{
          background: transparent;
          border: none;
          font-size: 20px;
          padding: 6px 8px;
          cursor: pointer;
        }
        .profile{ display:flex; gap:10px; align-items:center; flex:1; }
        .avatar{
          width:48px; height:48px; border-radius: 50%; object-fit:cover;
          border: 2px solid var(--pale);
        }
        .meta .name{ font-weight:700; color:var(--text); }
        .meta .status{ font-size:12px; color:var(--muted); margin-top:2px;}

        .icons .icon{ background:transparent; border:none; font-size:18px; margin-left:6px; cursor:pointer; }

        .match-banner{
          margin: 14px;
          background: linear-gradient(90deg, rgba(255,190,190,0.25), rgba(255,160,160,0.12));
          border-radius: 22px;
          padding: 8px 12px;
          text-align:center;
          color: var(--accent1);
          font-weight:700;
          box-shadow: inset 0 -1px 0 rgba(255,255,255,0.6);
        }

        /* Messages area */
        .messages-area{
          padding: 12px;
          flex:1;
          display:flex;
          flex-direction:column;
          gap:10px;
          overflow:auto;
        }

        .message{
          max-width: 82%;
          padding: 12px 14px;
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(18,18,18,0.04);
          position: relative;
          font-size: 14px;
          line-height: 1.3;
          color: var(--text);
        }
        .message p{ margin:0 0 8px 0; white-space:pre-wrap; }

        .message time{
          font-size:11px; color: var(--muted); position: absolute; right: 10px; bottom: 6px;
        }

        .message.received{
          background: var(--cream);
          align-self: flex-start;
          border-top-left-radius: 6px;
          border-top-right-radius: 16px;
          border-bottom-right-radius: 16px;
        }

        .message.sent{
          background: linear-gradient(90deg, var(--accent1), var(--accent2));
          color: white;
          align-self: flex-end;
          border-top-right-radius: 6px;
          border-top-left-radius: 16px;
          border-bottom-left-radius: 16px;
        }

        /* AI box */
        .ai-box{
          margin-top: 6px;
          background: rgba(242,239,221,0.6);
          border-radius: 14px;
          padding: 10px;
          border: 1px solid rgba(226,221,180,0.4);
        }
        .ai-title{ font-weight:700; margin-bottom:8px; color:var(--text); }
        .ai-suggestions{ display:flex; gap:8px; flex-direction:column; }
        .ai-suggestions .pill{
          border:none; padding:10px 12px; border-radius:10px;
          background: white; box-shadow: 0 6px 12px rgba(16,16,16,0.06);
          cursor: pointer; font-weight:600;
        }

        /* Composer area */
        .composer{
          padding: 10px 12px 16px 12px;
          background: linear-gradient(180deg, rgba(249,244,226,0.8), rgba(255,255,255,0.6));
          border-top: 1px solid rgba(226,221,180,0.2);
        }

        .quick-actions{ display:flex; gap:8px; margin-bottom:8px; }
        .quick-actions .qa{
          flex:1;
          padding:8px 10px;
          border-radius:10px;
          background: linear-gradient(90deg, var(--accent3), rgba(255,190,190,0.6));
          border:none; font-weight:600; cursor:pointer;
          box-shadow: 0 6px 12px rgba(16,16,16,0.04);
        }

        .input-line{ display:flex; gap:8px; align-items:center; }
        .input-line input{
          flex:1;
          padding:10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.06);
          outline: none;
          font-size:14px;
          background: white;
          box-shadow: inset 0 -1px 0 rgba(0,0,0,0.02);
        }
        .input-line input::placeholder{ color: #bdbdbd; }

        .mic{
          background: linear-gradient(180deg, var(--accent1), var(--accent2));
          border:none;
          color:white;
          width:44px; height:44px; border-radius: 50%;
          display:inline-flex; align-items:center; justify-content:center;
          font-size:18px; cursor:pointer;
          box-shadow: 0 8px 18px rgba(255,127,127,0.18);
        }

        /* Responsive small screens */
        @media (max-width:420px){
          .chat-shell{ height: 92vh; width:100%; border-radius:12px; }
          .ai-suggestions .pill{ font-size: 13px; padding:9px; }
        }
      `}</style>
    </div>
  );
}
