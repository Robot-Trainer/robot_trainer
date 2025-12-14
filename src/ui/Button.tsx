import React from 'react';

type Props = {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export const Button: React.FC<Props> = ({ children, variant = 'primary', className = '', onClick, disabled }) => {
  const baseStyle = "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2";
  const variants: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger: "bg-white border border-gray-300 text-red-600 hover:bg-red-50",
    ghost: "text-gray-600 hover:bg-gray-100"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

export default Button;
