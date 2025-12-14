import React from 'react';

export const StatusPill: React.FC<{ status?: string }>= ({ status }) => {
  const styles: Record<string, string> = {
    ready: "bg-green-100 text-green-700",
    busy: "bg-blue-100 text-blue-700",
    error: "bg-red-100 text-red-700",
    offline: "bg-gray-100 text-gray-600"
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${styles[status || ''] || styles.offline}`}>
      {status}
    </span>
  );
};

export default StatusPill;
