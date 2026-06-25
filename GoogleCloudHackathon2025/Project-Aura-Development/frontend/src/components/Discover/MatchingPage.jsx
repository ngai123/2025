import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';
import { FiRotateCcw } from 'react-icons/fi';
import { X, Heart, Star, ChevronLeft, MoreHorizontal, MapPin } from 'lucide-react';

// Theme-aligned swipe card with action bar
const styles = `
  .matching-root {
    font-family: 'Josefin Sans', sans-serif;
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    display: flex;
    flex-direction: column;
    padding: 0 8px;
    max-width: 393px;
    margin: 0 auto;
    padding-bottom: 64px; /* bottom nav height from MainPage */
  }

  .matching-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--color-bg-primary);
    padding: 16px 0 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Center the card + actions area within available viewport */
  .matching-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    /* subtract approximate header + bottom nav space */
    min-height: calc(100dvh - 140px);
  }
  .matching-title {
    font-weight: 700;
    font-size: 1.125rem;
  }

  .icon-btn {
    background: var(--color-bg-secondary);
    border: 1px solid #e5e7eb;
    color: var(--color-text-primary);
    border-radius: 12px;
    padding: 6px 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .card-shell {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    background: var(--color-bg-secondary);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1);
  }

  .card-media {
    width: 100%;
    aspect-ratio: 3/4; /* portrait */
    object-fit: cover;
    display: block;
  }

  .card-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.1));
  }

  .card-info {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 16px;
    color: var(--color-text-tertiary);
  }
  .info-primary { font-size: 1.125rem; font-weight: 700; }
  .info-secondary { font-size: 0.875rem; opacity: 0.85; }

  .overlay-badge {
    position: absolute;
    top: 16px;
    left: 16px;
    font-weight: 700;
    letter-spacing: 0.04em;
    border-radius: 12px;
    padding: 6px 12px;
    transform: rotate(-12deg);
    border: 3px solid currentColor;
    background: rgba(0,0,0,0.2);
    color: var(--color-text-tertiary);
    opacity: 0;
    pointer-events: none;
  }
  .overlay-like { color: var(--color-accent); }
  .overlay-nope { color: var(--color-accent-red); }

  .action-bar {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    justify-items: center;
    align-items: end;
    padding: 16px 0 8px;
  }

  .action {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    transition: transform 120ms ease;
  }
  .action:active { transform: scale(0.95); }
  .action.like { color: var(--color-accent); }
  .action.nope { color: var(--color-accent-red); }
  .action.super { color: var(--color-text-primary); }

  /* Details modal */
  .details-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }
  .details-modal {
    width: min(430px, 92vw);
    max-height: 85vh;
    border-radius: 16px;
    overflow: hidden;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    display: flex;
    flex-direction: column;
  }
  .details-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    background: var(--color-bg-primary);
    position: sticky;
    top: 0;
    z-index: 2;
  }
  .details-title { font-weight: 700; }
  .details-scroll { padding: 12px 16px; overflow-y: auto; }
  .banner-img { width: 100%; border-radius: 12px; aspect-ratio: 3/2; object-fit: cover; }
  .section-title { font-weight: 600; margin: 12px 0 6px; }
  .details-tags { display: flex; flex-wrap: wrap; gap: 8px; }
  .details-chip {
    padding: 6px 10px;
    border-radius: 9999px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border: 1px solid #e5e7eb;
    font-size: 0.9rem;
  }
  .prompt-display { background: var(--color-bg-secondary); border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; }
  .prompt-q { color: var(--color-text-secondary); font-size: 0.9rem; margin-bottom: 6px; }
  .prompt-a { color: var(--color-text-primary); }

  /* Swipeable photo carousel */
  .carousel {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    padding-bottom: 4px;
  }
  .carousel::-webkit-scrollbar { display: none; }
  .carousel-item {
    flex: 0 0 100%;
    scroll-snap-align: center;
    position: relative;
  }
  .carousel-img {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border-radius: 12px;
    background: var(--color-bg-secondary);
  }
  .carousel-dots { display: flex; gap: 6px; justify-content: center; margin-top: 8px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #d1d5db; }
  .dot.active { background: var(--color-accent); }
`;

const profiles = [
  {
    id: 1,
    name: 'Samantha',
    age: 26,
    // Use a placeholder banner that respects card gradient; real image can be wired later
    image: 'https://images.unsplash.com/photo-1549068106-b024baf5062d?auto=format&fit=crop&w=1200&q=80',
    bio: 'Type some description here. Write about yourself here',
    location: 'Kuala Lumpur, MY',
    photos: [
      'https://images.unsplash.com/photo-1549068106-b024baf5062d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545992333-13d1d2b5a8f2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80',
    ],
    basics: { comeFrom: 'Kuala Lumpur', speaking: 'English', height: '175 cm', zodiac: 'Sagittarius' },
    workEducation: { degree: 'Undergraduate', school: 'University Malaysia', industry: 'Engineering' },
    interests: ['Reading', 'TV', 'YouTube', 'Cars', 'Healthy lifestyle'],
    prompts: [
      { question: "A life goal of mine is...", answer: "To travel to every continent." },
      { question: "I'm competitive about...", answer: "Winning at Monopoly." }
    ],
  },
  {
    id: 2,
    name: 'Alex',
    age: 29,
    image: 'https://images.unsplash.com/photo-1519340241574-2f2b52f3e9a0?auto=format&fit=crop&w=1200&q=80',
    bio: 'Coffee, city lights, and live music.',
    location: 'George Town, MY',
    photos: [
      'https://images.unsplash.com/photo-1519340241574-2f2b52f3e9a0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519085369425-ffb5118c3c10?auto=format&fit=crop&w=1200&q=80',
    ],
    basics: { comeFrom: 'Penang', speaking: 'English', height: '170 cm', zodiac: 'Leo' },
    workEducation: { degree: 'Bachelor\'s', school: 'USM', industry: 'Design' },
    interests: ['Art', 'Writing', 'Movies', 'Coffee', 'Nature'],
    prompts: [
      { question: "The best way to spend a Sunday is...", answer: "Cafes and sketching at the park." }
    ],
  }
];

const SwipeCard = ({ profile, x, rotate, likeOpacity, nopeOpacity, onTap }) => (
  <motion.div
    className="card-shell"
    style={{ x, rotate }}
    drag="x"
    dragConstraints={{ left: 0, right: 0 }}
    dragElastic={0.8}
    onTap={onTap}
  >
    <img className="card-media" src={profile.image} alt="profile" />
    <span className="card-gradient" />
    <motion.div className="overlay-badge overlay-like" style={{ opacity: likeOpacity }}>LIKE</motion.div>
    <motion.div className="overlay-badge overlay-nope" style={{ opacity: nopeOpacity }}>NOPE</motion.div>
    <div className="card-info">
      <div className="info-primary">{profile.name}, {profile.age}</div>
      <div className="info-secondary">{profile.bio}</div>
    </div>
  </motion.div>
);

const MatchingPage = () => {
  const [index, setIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const carouselRef = useRef(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [40, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-40, -100], [0, 1]);

  const current = useMemo(() => profiles[index % profiles.length], [index]);

  // Track active slide in the photo carousel while details modal is open
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const handler = () => {
      const w = el.clientWidth;
      const i = Math.round(el.scrollLeft / (w + 8));
      setActivePhoto(Math.max(0, i));
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [showDetails]);

  const flyOff = (exitX) => {
    animate(x, exitX, {
      type: 'tween',
      duration: 0.28,
      onComplete: () => { setIndex((i) => i + 1); x.set(0); }
    });
  };

  const onDragEnd = (_e, info) => {
    const v = info.velocity.x;
    const o = info.offset.x;
    const threshold = 140;
    if (v > 300 || o > threshold) return flyOff(420);
    if (v < -300 || o < -threshold) return flyOff(-420);
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 50 });
  };

  const onAction = (type) => {
    if (type === 'like') return flyOff(420);
    if (type === 'nope') return flyOff(-420);
    if (type === 'super') return flyOff(420);
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 50 });
  };

  return (
    <div className="matching-root">
      <style>{styles}</style>

      <header className="matching-header">
        <div className="matching-title">Discover</div>
      </header>

      <div className="matching-center">
        <motion.div onDragEnd={onDragEnd} style={{ x, rotate }}>
          <SwipeCard
            profile={current}
            x={x}
            rotate={rotate}
            likeOpacity={likeOpacity}
            nopeOpacity={nopeOpacity}
            onTap={() => setShowDetails(true)}
          />
        </motion.div>

        <div className="action-bar">
          <button className="action nope" aria-label="Nope" onClick={() => onAction('nope')}>
            <X className="icon" />
          </button>
          <button className="action like" aria-label="Like" onClick={() => onAction('like')}>
            <Heart className="icon" />
          </button>
          <button className="action super" aria-label="Super Like" onClick={() => onAction('super')}>
            <Star className="icon" />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}>
          <button
            className="action"
            aria-label="Reset demo"
            style={{ width: 44, height: 44 }}
            onClick={() => setIndex(0)}
          >
            <FiRotateCcw size={20} />
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="details-backdrop" onClick={() => setShowDetails(false)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="details-header">
              <button className="icon-btn" aria-label="Close" onClick={() => setShowDetails(false)}>
                <ChevronLeft size={18} />
              </button>
              <div className="details-title">{current.name}, {current.age}</div>
              <button className="icon-btn" aria-label="Options">
                <MoreHorizontal size={18} />
              </button>
            </div>
            <div className="details-scroll">
              <div className="details-section">
                <div className="section-title">Photos</div>
                <div className="carousel" ref={carouselRef}>
                  {(current.photos && current.photos.length ? current.photos.slice(0,5) : [current.image]).map((src, i) => (
                    <div className="carousel-item" key={i}>
                      <img className="carousel-img" src={src} alt={`photo-${i+1}`} />
                    </div>
                  ))}
                </div>
                <div className="carousel-dots">
                  {(current.photos && current.photos.length ? current.photos.slice(0,5) : [current.image]).map((_, i) => (
                    <span className={`dot ${i === activePhoto ? 'active' : ''}`} key={`dot-${i}`} />
                  ))}
                </div>
              </div>
              {current.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--color-text-secondary)' }}>
                  <MapPin size={16} />
                  <span>{current.location}</span>
                </div>
              )}

              {current.bio && (
                <div className="details-section">
                  <div className="section-title">About</div>
                  <div className="info-secondary" style={{ color: 'var(--color-text-secondary)' }}>{current.bio}</div>
                </div>
              )}

              <div className="details-section">
                <div className="section-title">The Basics</div>
                <div className="details-tags">
                  {Object.values(current.basics || {}).map((val) => (
                    <span className="details-chip" key={val}>{val}</span>
                  ))}
                </div>
              </div>

              <div className="details-section">
                <div className="section-title">Work & Education</div>
                <div className="details-tags">
                  {Object.values(current.workEducation || {}).map((val) => (
                    <span className="details-chip" key={val}>{val}</span>
                  ))}
                </div>
              </div>

              {(current.interests && current.interests.length > 0) && (
                <div className="details-section">
                  <div className="section-title">My Vibe</div>
                  <div className="details-tags">
                    {current.interests.map((tag) => (
                      <span className="details-chip" key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {(current.prompts && current.prompts.length > 0) && (
                <div className="details-section">
                  <div className="section-title">Prompts</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {current.prompts.map((p, i) => (
                      <div className="prompt-display" key={i}>
                        <div className="prompt-q">{p.question}</div>
                        <div className="prompt-a">{p.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingPage;