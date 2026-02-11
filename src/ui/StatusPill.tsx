import React from 'react';
import { Chip } from '@mui/material';

export const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
  const colorMap: Record<string, "success" | "primary" | "error" | "default" | "warning"> = {
    ready: "success",
    active: "success",
    busy: "primary",
    error: "error",
    offline: "default",
    warning: "warning"
  };

  const color = colorMap[status || ''] || "default";

  return (
    <Chip 
      label={status || 'unknown'} 
      color={color} 
      size="small" 
      sx={{ 
        height: '20px', 
        fontSize: '0.75rem', 
        textTransform: 'uppercase',
        fontWeight: 600
      }} 
    />
  );
};

export default StatusPill;
