import React from 'react';

/**
 * LoadingSpinner component
 * @param {'sm' | 'md' | 'lg' | 'xl'} size
 * @param {string} text - Optional label beneath or beside the spinner
 * @param {boolean} inline - Whether to render inline with text
 * @param {boolean} fullPage - Whether to render as a full page overlay
 * @param {string} color - CSS color
 */
export default function LoadingSpinner({
  size = 'md',
  text = '',
  inline = false,
  fullPage = false,
  color = 'var(--color-brand)',
  style = {}
}) {
  const pixelSizes = {
    sm: 16,
    md: 28,
    lg: 44,
    xl: 60,
  };

  const px = pixelSizes[size] || 28;
  const strokeWidth = size === 'sm' ? 3 : size === 'xl' ? 3.5 : 3.2;

  const spinnerSvg = (
    <svg
      width={px}
      height={px}
      viewBox="0 0 38 38"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: 'hygge-spin 0.8s linear infinite',
        flexShrink: 0
      }}
    >
      <defs>
        <linearGradient x1="8.042%" y1="0%" x2="65.682%" y2="23.865%" id="hygge-spin-grad">
          <stop stopColor={color} stopOpacity="0" offset="0%" />
          <stop stopColor={color} stopOpacity=".3" offset="63.146%" />
          <stop stopColor={color} offset="100%" />
        </linearGradient>
      </defs>
      <g fill="none" fillRule="evenodd">
        <g transform="translate(1 1)">
          <path
            d="M36 18c0-9.94-8.06-18-18-18"
            stroke="url(#hygge-spin-grad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <circle fill={color} cx="36" cy="18" r={strokeWidth / 2} />
        </g>
      </g>
    </svg>
  );

  if (inline) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          verticalAlign: 'middle',
          ...style
        }}
      >
        {spinnerSvg}
        {text && <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{text}</span>}
      </span>
    );
  }

  if (fullPage) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(248, 250, 252, 0.75)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          zIndex: 9999,
          ...style
        }}
      >
        {spinnerSvg}
        {text && (
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            {text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '36px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        textAlign: 'center',
        ...style
      }}
    >
      {spinnerSvg}
      {text && (
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          {text}
        </p>
      )}
    </div>
  );
}
