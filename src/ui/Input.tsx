import React from 'react';
import { TextField } from '@mui/material';

type Props = {
  label?: string;
  value?: any;
  onChange?: (e: any) => void;
  placeholder?: string;
  type?: string;
  className?: string;
};

export const Input: React.FC<Props> = ({ label, value, onChange, placeholder, type = 'text', className = '' }) => {
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      className={`${className} mb-4`} // Preserve original margin-bottom
      variant="outlined"
      size="small"
      fullWidth
      InputLabelProps={{ shrink: true }} // Optional: keep label up if placeholder exists
    />
  );
};

export default Input;
