"use client"

import React from 'react'

export default function Logo({ size = 120 }: { size?: number }) {
  return (
    <div className="enhanced-logo" style={{ width: size }} aria-hidden="false">
      <svg viewBox="0 0 240 80" width="100%" height="auto" role="img" aria-label="Unsent logo">
        <defs>
          <linearGradient id="logoGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#FFB6C1" />
            <stop offset="100%" stopColor="#FFD27F" />
          </linearGradient>
          <filter id="logoShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#224" floodOpacity="0.06" />
          </filter>
        </defs>

        {/* icon: stylized folded paper / leaf */}
        <g transform="translate(12,10)" filter="url(#logoShadow)">
          <path d="M18 4 L62 4 C66 4 70 8 70 12 L70 44 C70 48 66 52 62 52 L18 52 C14 52 10 48 10 44 L10 12 C10 8 14 4 18 4 Z" fill="url(#logoGrad)" />
          <path d="M18 4 L42 28 L62 12" fill="#fff" opacity="0.12" />
        </g>

        {/* wordmark */}
        <g transform="translate(96,54)">
          <text x="0" y="-6" fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto" fontSize="20" fill="#21323A">Unsent</text>
        </g>
      </svg>

      <style>{`
        .enhanced-logo { display: inline-block; }
        .enhanced-logo svg { display: block; }
      `}</style>
    </div>
  )
}
