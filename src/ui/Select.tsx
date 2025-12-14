import React from 'react';
import { ChevronRight } from '../icons';

type Option = { label: string; value: any };
type Props = {
  label?: string;
  value?: any;
  onChange?: (e: any) => void;
  options?: Option[];
  className?: string;
};

export const Select: React.FC<Props> = ({ label, value, onChange, options = [], className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <div className="relative">
      <select
        className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
        value={value}
        onChange={onChange}
      >
        {options.map(opt => <option key={String(opt.value)} value={opt.value}>{opt.label}</option>)}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
        <ChevronRight className="h-4 w-4 rotate-90" />
      </div>
    </div>
  </div>
);

export default Select;
