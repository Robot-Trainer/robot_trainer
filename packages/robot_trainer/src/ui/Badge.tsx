import React from 'react';
import { Chip, type ChipProps, type SxProps, type Theme } from '@mui/material';

interface BadgeProps {
  children?: React.ReactNode;
  label?: React.ReactNode;
  color?: 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'gray';
  variant?: ChipProps['variant'];
  size?: ChipProps['size'];
  sx?: SxProps<Theme>;
  uppercase?: boolean;
  tooltip?: string;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  label,
  color = 'gray',
  variant = 'outlined',
  size = 'small',
  sx,
  uppercase = false,
  tooltip,
  className = '',
}) => {
  const colorMap: Record<string, ChipProps['color']> = {
    green: 'success',
    blue: 'primary',
    red: 'error',
    yellow: 'warning',
    purple: 'secondary',
    gray: 'default',
  };

  const badgeLabel = label ?? children;

  return (
    <Chip
      label={badgeLabel}
      color={colorMap[color] || 'default'}
      size={size}
      variant={variant}
      title={tooltip}
      className={className}
      sx={{
        textTransform: uppercase ? 'uppercase' : 'none',
        ...(sx || {}),
      }}
    />
  );
};

export default Badge;
