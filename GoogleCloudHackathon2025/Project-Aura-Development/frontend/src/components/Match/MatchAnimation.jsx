import { useNavigate } from 'react-router-dom';
import './match-animation.css';

const MatchAnimation = ({ user1, user2, onFirstMove, onClose }) => {
  const navigate = useNavigate();
  if (!user1 || !user2) return null;

  return (
    <div className="match-overlay" role="dialog" aria-modal="true">
      <button className="match-close" onClick={onClose}>X</button>

      <div className="match-content">
        <div className="profiles">
          <div className="profile left">
            <div className="avatar">
              {user1.avatar ? (
                <img src={user1.avatar} alt={user1.name} />
              ) : (
                <span>{(user1.name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="name">{user1.name}</div>
          </div>
          <div className="profile right">
            <div className="avatar">
              {user2.avatar ? (
                <img src={user2.avatar} alt={user2.name} />
              ) : (
                <span>{(user2.name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="name">{user2.name}</div>
          </div>
          <div className="pulse" />
        </div>

        <div className="titles">
          <div className="title">AURAs Connected</div>
          <div className="subtitle">Quickly start chatting in the chats</div>
        </div>

        <div className="actions">
          <button className="primary" onClick={onFirstMove}>First Move</button>
          <button className="secondary" onClick={() => navigate('/my-likes')}>Go to My Like</button>
        </div>
      </div>
    </div>
  );
};

export default MatchAnimation;