import React, { useEffect, useState, useRef } from 'react';
import { checkMigrationStatus, migrate, resetDatabase, MigrationStatus } from './db/migrate';
import { seedRobotModels } from './db/seed_robot_models';
import { seedTeleoperators } from './db/seed_teleoperators';
import App from './app';
import { MigrationModal } from './ui/MigrationModal';

let hasChecked = false;

export const MigrationRoot = () => {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const isApplying = useRef(false);

  const performCheck = async () => {
    // Check if we just reset the DB
    if (localStorage.getItem('db_reset_pending')) {
      console.log("Detected flush reset, applying migrations automatically...");
      localStorage.removeItem('db_reset_pending');
      await handleApply();
      return;
    }

    setChecking(true);
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
      if (typeof window !== 'undefined') (window as any).__appIdle = true; // Unblock loading
      setChecking(false);
    }
  };

  useEffect(() => {
    if (hasChecked) return;
    hasChecked = true;
    performCheck();
  }, []);

  const handleApply = async () => {
    if (isApplying.current) return;
    isApplying.current = true;
    setChecking(true);
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
      setChecking(false);
      isApplying.current = false;
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure? This will delete all data.")) return;

    setChecking(true);
    try {
      await resetDatabase();
      // Flag to auto-migrate after reload
      localStorage.setItem('db_reset_pending', 'true');
      // Reload to re-initialize PGLite with clean state
      window.location.reload();
    } catch (e) {
      console.error("Reset failed", e);
      setStatus({ type: 'corrupted', error: e });
      setChecking(false);
    }
  };

  const handleIgnore = () => {
    setStatus({ type: 'synced' });
  };

  return (
    <>
      <App externalLoading={checking} />
      {status && status.type !== 'synced' && (
        <MigrationModal
          status={status}
          onApply={handleApply}
          onReset={handleReset}
          onIgnore={handleIgnore}
        />
      )}
    </>
  );
};
