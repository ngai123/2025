import React from 'react';

const RoundedImage = ({ src, alt, className = '', style, ...props }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={`rounded-image ${className}`}
      style={style}
      {...props}
    />
  );
};

export default RoundedImage;