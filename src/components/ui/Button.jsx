import React from 'react';

/**
 * Universal Button component with built-in loading spinner,
 * double-click prevention, and accessibility states.
 */
export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  type = 'button', 
  onClick, 
  disabled = false,
  isLoading = false,
  loading = false,
  loadingText,
  className = '',
  icon: Icon,
  style = {}
}) {
  const isBusy = Boolean(disabled || isLoading || loading);
  const sizeClass = size === 'sm' ? 'btn-sm' : '';
  const spinnerSize = size === 'sm' ? 13 : 15;

  const handleClick = (e) => {
    if (isBusy) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <style>{`
        @keyframes buttonSpinnerRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <button
        type={type}
        className={`btn btn-${variant} ${sizeClass} ${className}`}
        onClick={handleClick}
        disabled={isBusy}
        aria-busy={isBusy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          opacity: isBusy ? 0.72 : 1,
          pointerEvents: isBusy ? 'none' : 'auto',
          userSelect: 'none',
          transition: 'all 0.15s ease',
          ...style
        }}
      >
        {(isLoading || loading) ? (
          <>
            <span
              style={{
                width: `${spinnerSize}px`,
                height: `${spinnerSize}px`,
                border: '2px solid currentColor',
                borderRightColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'buttonSpinnerRotate 0.65s linear infinite',
                flexShrink: 0
              }}
              aria-hidden="true"
            />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {Icon && <Icon size={size === 'sm' ? 14 : 16} style={{ flexShrink: 0 }} />}
            <span>{children}</span>
          </>
        )}
      </button>
    </>
  );
}
