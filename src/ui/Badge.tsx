import React from 'react';
import { Chip } from '@mui/material';

interface BadgeProps {
  children: React.ReactNode;
  color: 'green' | 'blue' | 'red' | 'yellow';
  tooltip?: string;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, color, tooltip, className = '' }) => {
  const colorMap: Record<string, "success" | "primary" | "error" | "warning" | "default"> = {
    green: 'success',
    blue: 'primary',
    red: 'error',
    yellow: 'warning',
  };

  return (
    <Chip
      label={children}
      color={colorMap[color] || 'default'}
      size="small"
      title={tooltip}
      className={`mx-1 ${className}`}
      sx={{ borderRadius: 1 }} // Current was 'rounded' (small radius), not 'rounded-full' like Chip. Keeping closer to original shape? 
      // User said "Material UI version", so maybe I should let it be a pill? 
      // I'll leave borderRadius default (pill) as that IS the Material UI version. 
      // Commenting out sx change -> actually I will remove it.
    />
  );
};

export default Badge;
