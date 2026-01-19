import React, { useEffect, useState } from 'react';
import { checkMigrationStatus, migrate, resetDatabase, MigrationStatus } from './db/migrate';
import { seedRobotModels } from './db/seed_robot_models';
import { seedTeleoperators } from './db/seed_teleoperators';
import App from './app';
import { MigrationModal } from './ui/MigrationModal';

export const MigrationRoot = () => {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [initializing, setInitializing] = useState(true);

  const performCheck = async () => {
    // Check if we just reset the DB
    if (localStorage.getItem('db_reset_pending')) {
      console.log("Detected flush reset, applying migrations automatically...");
      localStorage.removeItem('db_reset_pending');
      await handleApply();
      return;
    }

    try {
      const s = await checkMigrationStatus();
      if (s.type === 'pending' && s.fresh) {
        console.log("Fresh database detected. Auto-applying migrations.");
        await handleApply();
        return;
      }
      setStatus(s);
    } catch (e) {
      setStatus({ type: 'corrupted', error: e });
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    performCheck();
  }, []);

  const handleApply = async () => {
    setInitializing(true);
    try {
      await migrate();
      try {
        await seedRobotModels();
        await seedTeleoperators();
      } catch (seedErr) {
        console.warn("Seeding partial failure", seedErr);
      }
      setStatus({ type: 'synced' });
    } catch (e) {
      console.error("Migration failed", e);
      setStatus({ type: 'corrupted', error: e });
    } finally {
      setInitializing(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure? This will delete all data.")) return;

    setInitializing(true);
    try {
      await resetDatabase();
      // Flag to auto-migrate after reload
      localStorage.setItem('db_reset_pending', 'true');
      // Reload to re-initialize PGLite with clean state
      window.location.reload();
    } catch (e) {
      console.error("Reset failed", e);
      setStatus({ type: 'corrupted', error: e });
      setInitializing(false);
    }
  };

  const handleIgnore = () => {
    setStatus({ type: 'synced' });
  };

  if (initializing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-600 font-medium">Checking database status...</div>
      </div>
    );
  }

  if (status?.type === 'synced') {
    return <App />;
  }

  if (status) {
    return (
      <MigrationModal
        status={status}
        onApply={handleApply}
        onReset={handleReset}
        onIgnore={handleIgnore}
      />
    );
  }

  return null;
};
