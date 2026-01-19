import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { MigrationStatus } from '../db/migrate';

interface MigrationModalProps {
  status: MigrationStatus;
  onApply: () => void;
  onReset: () => void;
  onIgnore: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ status, onApply, onReset, onIgnore }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (status.type === 'synced') return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl p-6 bg-white shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          {status.type === 'corrupted' ? 'Database Maintenance Required' : 'Database Update Required'}
        </h2>

        <div className="mb-6 text-gray-700">
          {status.type === 'corrupted' ? (
            <p>The database seems to be in an invalid state. You may need to reset it to continue.</p>
          ) : (
            <p>The application database schema has changed. There are <strong>{status.pending.length}</strong> pending migrations.</p>
          )}
        </div>

        {status.type === 'pending' && (
          <div className="mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 underline text-sm mb-2"
            >
              {showDetails ? 'Hide Details' : 'Show Pending Changes'}
            </button>

            {showDetails && (
              <div className="bg-gray-100 p-4 rounded text-xs font-mono max-h-60 overflow-y-auto">
                {status.pending.map((m, i) => (
                  <div key={i} className="mb-4 border-b border-gray-300 pb-2 last:border-0">
                    <div className="font-bold text-gray-500">// Migration {i + 1}</div>
                    {m.sql.map((s, j) => (
                      <div key={j} className="whitespace-pre-wrap">{s}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {status.type === 'corrupted' && (
          <div className="bg-red-50 p-4 rounded text-red-800 text-sm font-mono mb-6 overflow-x-auto">
            {String(status.error)}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onIgnore}>
            Ignore & Continue (Risky)
          </Button>
          <Button variant="danger" onClick={onReset}>
            Wipe & Recreate DB
          </Button>
          {status.type === 'pending' && (
            <Button variant="primary" onClick={onApply}>
              Apply Updates
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
