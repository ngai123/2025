import React from 'react';
import { Hearts } from 'react-loader-spinner';

const HeartLoader = ({ overlay = false, size = 80, color = '#FF7F7F', label }) => {
  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px'
    }}>
      <Hearts
        height={size}
        width={size}
        color={color}
        ariaLabel="hearts-loading"
      />
      {label && (
        <div style={{ fontSize: '14px', color: '#6B7280' }}>{label}</div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(249, 244, 226, 0.85)',
        zIndex: 9999
      }}>
        {content}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%'
    }}>
      {content}
    </div>
  );
};

export default HeartLoader;