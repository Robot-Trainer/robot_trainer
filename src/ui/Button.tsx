import React, { useEffect, useState } from 'react';

type Props = {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** When true, runs the pulse animation: once every 3s, 5 times (1s pulse, 2s idle) */
  pulse?: boolean;
};

export const Button: React.FC<Props> = ({ children, variant = 'primary', className = '', onClick, disabled, pulse = false }) => {
  const baseStyle = "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2";
  const variants: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger: "bg-white border border-gray-300 text-red-600 hover:bg-red-50",
    ghost: "text-gray-600 hover:bg-gray-100"
  };
  // Use CSS-only animation driven by the `pulse` prop. The animation duration is 3s
  // with the actual expanding/fading happening in the first 1s (0-33%). We set
  // iteration-count to 5 so it runs five times.
  const pulseClass = pulse ? 'pulse-animate' : '';

  return (
    <button onClick={onClick} disabled={disabled} className={`relative overflow-visible ${baseStyle} ${variants[variant]} ${className}`}>
      <style>{`
        @keyframes pulseExpandComposite {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(18); opacity: 0; }
        }
        .pulse-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.4);
          pointer-events: none;
          transform: translate(-50%, -50%) scale(0.2);
          mix-blend-mode: screen;
          animation: pulseExpandComposite 3s ease-out 0s 5 forwards;
        }
      `}</style>

      {children}
      {pulse && <span key={String(pulse)} className={`pulse-circle`} aria-hidden />}
    </button>
  );
};

export default Button;
