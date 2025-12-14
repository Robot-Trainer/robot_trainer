import React from 'react';

type Props = {
  label?: string;
  value?: any;
  onChange?: (e: any) => void;
  placeholder?: string;
  type?: string;
  className?: string;
};

export const Input: React.FC<Props> = ({ label, value, onChange, placeholder, type = 'text', className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <input
      type={type}
      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  </div>
);

export default Input;
