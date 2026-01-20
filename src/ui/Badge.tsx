import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color: 'green' | 'blue' | 'red' | 'yellow';
  tooltip?: string;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, color, tooltip, className = '' }) => {
  const colors = {
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color]} mx-1 ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
