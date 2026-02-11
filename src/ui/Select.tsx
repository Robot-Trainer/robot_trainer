import React from 'react';
import { TextField, MenuItem } from '@mui/material';

type Option = { label: string; value: any };
type Props = {
  label?: string;
  value?: any;
  onChange?: (e: any) => void;
  options?: Option[];
  className?: string;
};

export const Select: React.FC<Props> = ({ label, value, onChange, options = [], className = '' }) => {
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
      {options.map((opt) => (
        <MenuItem key={String(opt.value)} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default Select;
