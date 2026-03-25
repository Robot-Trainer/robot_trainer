import React from 'react';
import { TextField, MenuItem } from '@mui/material';

type Option = { label: string; value: string | number };
type Props = {
  label?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options?: Option[];
  className?: string;
  /** Custom render function for each option */
  renderOption?: (option: Option) => React.ReactNode;
};

export const Select: React.FC<Props> = ({ label, value, onChange, options = [], className = '', renderOption }) => {
  const valueExists = options.some(opt => opt.value === value || String(opt.value) === String(value));

  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={onChange}
      className={`${className} mb-4`}
      variant="standard"
      fullWidth
    >
      {/* If the current value isn't present in options, render a disabled item so MUI doesn't warn */}
      {!valueExists && value !== '' && value != null && (
        <MenuItem key="__missing_value__" value={value} disabled sx={{ fontStyle: 'italic' }}>
          {`(Selected) ${String(value)}`}
        </MenuItem>
      )}

      {options.map((opt) => (
        <MenuItem key={String(opt.value)} value={opt.value}>
          {renderOption ? renderOption(opt) : opt.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default Select;
