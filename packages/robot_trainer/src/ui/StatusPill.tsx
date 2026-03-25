import React from 'react';
import Badge from './Badge';

export const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
  const colorMap: Record<string, 'green' | 'blue' | 'red' | 'gray' | 'yellow'> = {
    ready: 'green',
    active: 'green',
    busy: 'blue',
    error: 'red',
    offline: 'gray',
    warning: 'yellow'
  };

  const color = colorMap[status || ''] || 'gray';

  return (
    <Badge
      label={status || 'unknown'}
      color={color}
      uppercase
      sx={{
        height: '20px',
        fontSize: '0.75rem',
        fontWeight: 600
      }}
    />
  );
};

export default StatusPill;
