import React, { useEffect, useState } from 'react';

// Theme CSS variables injected at app root via document class
const ThemeStyles = () => (
  <style>{`
    :root {
      --color-bg-primary-light: #F9F4E2;
      --color-bg-secondary-light: #FFFFFF;

      --color-text-primary-light: #000000;
      --color-text-secondary-light: #6B7280;
      --color-text-tertiary-light: #FFFFFF;
      --color-text-quaternary-light: #000000;

      --color-accent-red: #FF7F7F;
      --color-accent-pink: #FFBEBE;

      --color-progress-track-light: #E2DDB4;
      --color-icon-muted: #9CA3AF;

      --color-bg-primary-dark: #121212;
      --color-bg-secondary-dark: #1E1E1E;

      --color-text-primary-dark: #FFFFFF;
      --color-text-secondary-dark: #9CA3AF;
      --color-text-tertiary-dark: #F9F4E2;
      --color-text-quaternary-dark: #000000;
    }

    /* Default theme aliases and backgrounds */
    body.theme-light {
      /* alias variables */
      --color-bg-primary: var(--color-bg-primary-light);
      --color-bg-secondary: var(--color-bg-secondary-light);
      --color-text-primary: var(--color-text-primary-light);
      --color-text-secondary: var(--color-text-secondary-light);
      --color-text-tertiary: var(--color-text-tertiary-light);
      --color-text-quaternary: var(--color-text-quaternary-light);
      --color-accent: var(--color-accent-red);

      background: var(--color-bg-primary);
      color: var(--color-text-primary);
    }
    body.theme-dark {
      /* alias variables */
      --color-bg-primary: var(--color-bg-primary-dark);
      --color-bg-secondary: var(--color-bg-secondary-dark);
      --color-text-primary: var(--color-text-primary-dark);
      --color-text-secondary: var(--color-text-secondary-dark);
      --color-text-tertiary: var(--color-text-tertiary-dark);
      --color-text-quaternary: var(--color-text-quaternary-dark);
      --color-accent: var(--color-accent-red);

      background: var(--color-bg-primary);
      color: var(--color-text-primary);
    }

    /* Utility classes for components to consume */
    .surface { background: var(--color-bg-secondary); }

    .muted { color: var(--color-text-secondary); }

    .accent { color: var(--color-accent); }
  `}</style>
);

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      borderRadius: '20px',
      border: '1px solid rgba(0,0,0,0.1)',
      padding: '8px 12px',
      cursor: 'pointer',
      background: 'var(--color-bg-secondary)',
      color: 'var(--color-text-primary)'
    }}
  >
    <span style={{ fontWeight: 600 }}>{checked ? 'Dark' : 'Light'}</span>
    <span
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        background: checked ? '#333' : '#ddd',
        position: 'relative'
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          left: checked ? '18px' : '2px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: checked ? '#fff' : '#333'
        }}
      />
    </span>
  </button>
);

const DisplayMode = () => {
  const [dark, setDark] = useState(() => { try { const stored = typeof window !== 'undefined' ? localStorage.getItem('aura-theme') : null; return stored === 'dark'; } catch { return false; } });

  // Default to light mode (no system preference check)
  // useEffect(() => {
  //   const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  //   setDark(prefersDark);
  // }, []);

  // Apply theme class to body
  useEffect(() => {
    const cls = dark ? 'theme-dark' : 'theme-light';
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(cls);
    try {
      localStorage.setItem('aura-theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <ThemeStyles />
      {/* <span className="muted">Display Mode</span> */}
      <Toggle checked={dark} onChange={setDark} />
    </div>
  );
};

export default DisplayMode;
