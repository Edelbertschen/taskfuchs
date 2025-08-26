import React from 'react';

interface MaterialIconProps {
  name: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function MaterialIcon({ name, className = '', size, style }: MaterialIconProps) {
  const iconStyle = {
    fontSize: size ? `${size}px` : undefined,
    ...style
  };

  return (
    <span 
      className={`material-icons ${className}`}
      style={iconStyle}
    >
      {name}
    </span>
  );
} 