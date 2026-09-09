import React from 'react';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  type = 'button', 
  onClick, 
  disabled = false,
  className = '',
  icon: Icon
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : '';

  return (
    <button
      type={type}
      className={`btn btn-${variant} ${sizeClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      <span>{children}</span>
    </button>
  );
}
