import React from 'react';

export default function Badge({ variant = 'active', children }) {
  return (
    <span className={`badge badge-${variant}`}>
      {children}
    </span>
  );
}
