import React from 'react';

type Props = {
  children?: React.ReactNode;
  className?: string;
};

export const Card: React.FC<Props> = ({ children, className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
);

export default Card;
