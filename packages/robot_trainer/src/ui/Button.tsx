import React from 'react';
import { Button as MuiButton, ButtonProps, Box } from '@mui/material';
import { keyframes } from '@mui/system';

type Props = {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** When true, runs the pulse animation: once every 3s, 5 times (1s pulse, 2s idle) */
  pulse?: boolean;
};

const pulseKeyframe = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(18); opacity: 0; }
`;

export const Button: React.FC<Props> = ({ children, variant = 'primary', className = '', onClick, disabled, pulse = false }) => {
  let muiVariant: ButtonProps['variant'] = 'contained';
  let muiColor: ButtonProps['color'] = 'primary';

  switch (variant) {
    case 'primary':
      muiVariant = 'contained';
      muiColor = 'primary';
      break;
    case 'secondary':
      muiVariant = 'outlined';
      muiColor = 'inherit'; // Closest to gray border
      break;
    case 'danger':
      muiVariant = 'outlined';
      muiColor = 'error';
      break;
    case 'ghost':
      muiVariant = 'text';
      muiColor = 'inherit';
      break;
  }

  return (
    <MuiButton
      variant={muiVariant}
      color={muiColor}
      onClick={onClick}
      disabled={disabled}
      className={className}
      sx={{
        position: 'relative',
        overflow: 'hidden', // Ensure pulse stays inside? Original was visible.
        // Original: overflow-visible. But pulse was mostly decorative.
        // If we want the original exact pulse behavior (expanding huge), we might need overflow-visible. 
        // But MUI button has internal ripple which assumes overflow hidden usually.
        // Let's try to keep it simple.
        ...(variant === 'secondary' && { borderColor: 'rgba(0, 0, 0, 0.23)', color: 'rgba(0, 0, 0, 0.87)' }),
        ...(variant === 'ghost' && { color: 'rgba(0, 0, 0, 0.6)' }),
      }}
    >
      {children}
      {pulse && (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '12px',
            height: '12px',
            borderRadius: '9999px',
            background: 'rgba(255,255,255,0.4)',
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            animation: `${pulseKeyframe} 3s ease-out 0s 5 forwards`,
          }}
          aria-hidden="true"
        />
      )}
    </MuiButton>
  );
};


export default Button;
