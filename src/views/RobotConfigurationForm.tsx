import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { db } from '../db/db';
import { eq, and } from 'drizzle-orm';
import { configRobotsTable, configCamerasTable, configTeleoperatorsTable } from '../db/schema';
import { robotModelsResource, teleoperatorModelsResource, robotsResource, camerasResource } from '../db/resources';

import { RobotSelectionDropdown } from './RobotSelectionDropdown';
import { CameraSelectionDropdown } from './CameraSelectionDropdown';
import ConfigForm from './ConfigForm';
import RobotConfigSchema from '../python/RobotConfig.json';

interface RobotConfigurationFormProps {
  onCancel?: () => void;
  onSaved?: (config: any) => Promise<any> | void;
  initialData?: any;
}

export const RobotConfigurationForm: React.FC<RobotConfigurationFormProps> = ({ onCancel, onSaved, initialData }) => {
  const [selectedRobotId, setSelectedRobotId] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [configName, setConfigName] = useState('');
  const [leaderType, setLeaderType] = useState<'keyboard' | 'gamepad' | 'real' | 'phone'>('keyboard');
  const [leaderModel, setLeaderModel] = useState<string>('');
  const [leaderConfig, setLeaderConfig] = useState<any>(null);

  const [availableRobots, setAvailableRobots] = useState<{ label: string, value: string }[]>([]);
  const [availableTeleoperators, setAvailableTeleoperators] = useState<{ label: string, value: string }[]>([]);

  const [knownRobots, setKnownRobots] = useState<any[]>([]);
  const [serialPorts, setSerialPorts] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [cameraSlots, setCameraSlots] = useState<{ id: number | null, key: number }[]>([{ id: null, key: Date.now() }]);

  const fetchData = async () => {
    try {
      const robots = await robotModelsResource.list();
      const rOpts = robots.map((r: any) => ({ label: r.name, value: String(r.id) }));
      setAvailableRobots(rOpts);

      const teleops = await teleoperatorModelsResource.list();
      const tOpts = teleops.map((t: any) => ({ label: t.data?.name || t.id, value: t.id }));
      setAvailableTeleoperators(tOpts);

      const kRobots = await robotsResource.list();
      setKnownRobots(kRobots);

      const kCameras = await camerasResource.list();
      setAvailableCameras(kCameras);

      if (tOpts.length > 0 && !leaderModel) {
        setLeaderModel(tOpts[0].value);
      }

      scanPorts();
    } catch (e) {
      console.error('Error initializing models:', e);
    }
  };

  // Initialize defaults
  useEffect(() => {
    console.log('RobotConfigurationForm mounted');
    fetchData();
  }, []);

  // If opened for editing, populate simple top-level fields from the initial data
  useEffect(() => {
    if (!initialData) return;

    const hydrate = async () => {
      try {
        setConfigName(initialData.name || '');

        if (!initialData.id) return;

        // Fetch Config Robots
        const robotRows = await db.select().from(configRobotsTable).where(eq(configRobotsTable.configurationId, initialData.id));
        if (robotRows.length > 0) {
          const r = robotRows[0];
          setSelectedRobotId(r.robotId);
          const snap = r.snapshot as any;
          if (snap) {
            if (snap.leaderType) setLeaderType(snap.leaderType);
            if (snap.leaderConfig) setLeaderConfig(snap.leaderConfig);
          }
        }

        // Fetch Config Cameras
        const cameraRows = await db.select().from(configCamerasTable).where(eq(configCamerasTable.configurationId, initialData.id));
        if (cameraRows.length > 0) {
          setCameraSlots(cameraRows.map((c, i) => ({ id: c.cameraId, key: Date.now() + i })));
        }

        // Fetch Config Teleoperators
        const teleopRows = await db.select().from(configTeleoperatorsTable).where(eq(configTeleoperatorsTable.configurationId, initialData.id));
        if (teleopRows.length > 0) {
          setLeaderModel(teleopRows[0].teleoperatorId.toString());
        }

      } catch (e) {
        console.warn('Failed to hydrate initialData into RobotConfigurationForm', e);
      }
    };

    hydrate();
  }, [initialData]);

  const scanPorts = async () => {
    setScanning(true);
    try {
      const ports = await (window as any).electronAPI.scanSerialPorts();
      setSerialPorts(ports || []);
    } catch (e) {
      console.error("Failed to scan ports", e);
    } finally {
      setScanning(false);
    }
  };

  const handleRobotChange = (id: number | null) => {
    setSelectedRobotId(id);
    const robot = knownRobots.find(r => r.id === id);
    if (!robot) return;

    if (robot.modality === 'real') {
      scanPorts();
    }
  };

  const refreshCameras = async () => {
    try {
      const cams = await camerasResource.list();
      setAvailableCameras(cams);
    } catch (e) {
      console.error("Failed to load cameras", e);
    }
  };

  const addCameraSlot = () => {
    setCameraSlots([...cameraSlots, { id: null, key: Date.now() }]);
  };

  const removeCameraSlot = (index: number) => {
    const newSlots = [...cameraSlots];
    newSlots.splice(index, 1);
    setCameraSlots(newSlots);
  };

  const updateCameraSlot = (index: number, cameraId: number) => {
    const newSlots = [...cameraSlots];
    newSlots[index].id = cameraId;
    setCameraSlots(newSlots);
  };

  const getDeviceLabel = (port: any) => {
    const known = knownRobots.find(r => r.serialNumber === port.serialNumber);
    if (known) {
      return `${known.name} - (SN: ${port.serialNumber})`;
    }
    return `${port.manufacturer || 'Device'} (${port.path})`;
  };

  // Used for Leader selection if needed
  const getDeviceOptions = () => {
    return serialPorts.map(p => ({
      label: getDeviceLabel(p),
      value: p.path,
      original: p
    }));
  };

  const handleLeaderPortSelect = (path: string) => {
    const port = serialPorts.find(p => p.path === path);
    setLeaderConfig(port);
  };

  const saveConfiguration = async () => {
    if (!configName) {
      alert("Please enter a configuration name.");
      return;
    }

    if (!selectedRobotId) {
      alert("Please select a follower robot.");
      return;
    }

    const selectedCameraIds = cameraSlots
      .map((s) => s.id)
      .filter((id): id is number => id !== null);


    // Try to find current port info if connected
    let currentConfig = selectedRobot.data?.config;
    if (selectedRobot.modality === 'real' && selectedRobot.serialNumber) {
      const port = serialPorts.find(p => p.serialNumber === selectedRobot.serialNumber);
      if (port) {
        currentConfig = port;
      }
    }

    // 1. Create Parent via ResourceManager's onSaved
    if (!onSaved) {
      alert("No save handler provided.");
      return;
    }

    try {
      const parentResult: any = await onSaved({
        name: configName,
      });

      if (!parentResult || !parentResult.id) {
        // If onSaved failed or didn't return ID (should handle void case just in case, but we patched it)
        // If we really can't get ID, we can't save children.
        // Assuming my patch works.
        console.error("No ID returned from save");
        return;
      }

      const configurationId = parentResult.id;

      // 2. Save Follower (Upsert / Replace)
      const existingRobots = await db.select().from(configRobotsTable).where(eq(configRobotsTable.configurationId, configurationId));
      const existingRobot = existingRobots[0]; // Assuming 1 to 1 for this wizard

      const newRobotSnapshot = {
        ...selectedRobot,
        targetConfig: currentConfig,
        leaderType,
        leaderConfig
      };

      if (existingRobot) {
        if (existingRobot.robotId !== selectedRobot.id) {
          // ID changed: Remove old, add new
          await db.delete(configRobotsTable).where(and(
            eq(configRobotsTable.configurationId, configurationId),
            eq(configRobotsTable.robotId, existingRobot.robotId)
          ));
          await db.insert(configRobotsTable).values({
            configurationId,
            robotId: selectedRobot.id,
            snapshot: newRobotSnapshot
          });
        } else {
          // ID same: Update snapshot
          await db.update(configRobotsTable).set({
            snapshot: newRobotSnapshot
          }).where(and(
            eq(configRobotsTable.configurationId, configurationId),
            eq(configRobotsTable.robotId, selectedRobot.id)
          ));
        }
      } else {
        // No existing: Insert
        await db.insert(configRobotsTable).values({
          configurationId,
          robotId: selectedRobot.id,
          snapshot: newRobotSnapshot
        });
      }

      // 3. Save Cameras (Diff & Upsert)
      const existingCameras = await db.select().from(configCamerasTable).where(eq(configCamerasTable.configurationId, configurationId));
      const existingCamIds = new Set(existingCameras.map(c => c.cameraId));
      const newCamIds = new Set(selectedCameraIds);

      // Remove deleted cameras
      for (const oldId of existingCamIds) {
        if (!newCamIds.has(oldId)) {
          await db.delete(configCamerasTable).where(and(
            eq(configCamerasTable.configurationId, configurationId),
            eq(configCamerasTable.cameraId, oldId)
          ));
        }
      }

      // Insert or Update active cameras
      for (const newId of newCamIds) {
        const cam = availableCameras.find(c => c.id === newId);
        if (!cam) continue;

        if (existingCamIds.has(newId)) {
          await db.update(configCamerasTable).set({
            snapshot: cam
          }).where(and(
            eq(configCamerasTable.configurationId, configurationId),
            eq(configCamerasTable.cameraId, newId)
          ));
        } else {
          await db.insert(configCamerasTable).values({
            configurationId,
            cameraId: newId,
            snapshot: cam
          });
        }
      }

      // 4. Save Teleoperator (Diff & Upsert)
      const existingTeleops = await db.select().from(configTeleoperatorsTable).where(eq(configTeleoperatorsTable.configurationId, configurationId));
      const existingTeleop = existingTeleops[0];

      let desiredTeleopId: number | null = null;
      if (leaderType === 'real' && leaderModel) {
        const parsed = parseInt(leaderModel, 10);
        if (!isNaN(parsed)) desiredTeleopId = parsed;
      }

      if (existingTeleop) {
        if (desiredTeleopId === null) {
          // Was present, now removed
          await db.delete(configTeleoperatorsTable).where(and(
            eq(configTeleoperatorsTable.configurationId, configurationId),
            eq(configTeleoperatorsTable.teleoperatorId, existingTeleop.teleoperatorId)
          ));
        } else if (existingTeleop.teleoperatorId !== desiredTeleopId) {
          // Changed model: Delete old, Insert new
          await db.delete(configTeleoperatorsTable).where(and(
            eq(configTeleoperatorsTable.configurationId, configurationId),
            eq(configTeleoperatorsTable.teleoperatorId, existingTeleop.teleoperatorId)
          ));
          await db.insert(configTeleoperatorsTable).values({
            configurationId,
            teleoperatorId: desiredTeleopId,
            snapshot: { config: leaderConfig, type: leaderType }
          });
        } else {
          // Same model: Update snapshot
          await db.update(configTeleoperatorsTable).set({
            snapshot: { config: leaderConfig, type: leaderType }
          }).where(and(
            eq(configTeleoperatorsTable.configurationId, configurationId),
            eq(configTeleoperatorsTable.teleoperatorId, desiredTeleopId)
          ));
        }
      } else {
        // No existing, but have desired
        if (desiredTeleopId !== null) {
          await db.insert(configTeleoperatorsTable).values({
            configurationId,
            teleoperatorId: desiredTeleopId,
            snapshot: { config: leaderConfig, type: leaderType }
          });
        }
      }

    } catch (e) {
      console.error(e);
      alert('Failed to save configuration details');
    }
  };

  const deviceOptions = getDeviceOptions();
  const selectedRobot = knownRobots.find(r => r.id === selectedRobotId);

  if (showAdvanced) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Button onClick={() => setShowAdvanced(false)} variant="secondary">
            &larr; Back to Basic Config
          </Button>
        </div>
        <ConfigForm schema={RobotConfigSchema as any} title="Advanced Robot Configuration" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center relative">
        {onCancel && (
          <Button variant="ghost" className="absolute left-0 top-0" onClick={onCancel}>
            &larr; Back
          </Button>
        )}
        <h2 className="text-2xl font-semibold text-gray-900">Robot Setup</h2>
        <p className="text-gray-500 mt-1">
          Configure your leader/follower arms and cameras
        </p>
      </div>

      <Card className="p-8 space-y-8">
        <section>
          <Input
            label="Configuration Name"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="e.g. Training Station 1"
          />
        </section>
        <hr />
        {/* Follower Configuration */}
        <section>
          <RobotSelectionDropdown
            label="Follower Robot"
            robots={knownRobots}
            connectedDevices={serialPorts}
            availableModels={availableRobots}
            selectedRobotId={selectedRobotId}
            onSelect={handleRobotChange}
            onRobotsChanged={fetchData}
          />
          <div className="mt-1 flex justify-end">
            <Button variant="ghost" className="text-xs text-gray-500" onClick={scanPorts} disabled={scanning}>
              {scanning ? 'Scanning...' : 'Refresh Devices'}
            </Button>
          </div>
        </section>
        <hr />
        {/* Camera Configuration */}
        <section>
          <h3 className="text-lg font-medium mb-4">Camera(s)</h3>
          <div className="space-y-4">
            {cameraSlots.map((slot, idx) => (
              <CameraSelectionDropdown
                key={slot.key}
                label={`Camera ${idx + 1}`}
                cameras={availableCameras}
                selectedCameraId={slot.id}
                onSelect={(id) => updateCameraSlot(idx, id)}
                onCamerasChanged={refreshCameras}
                onRemove={cameraSlots.length > 1 ? () => removeCameraSlot(idx) : undefined}
              />
            ))}

            <div className="pt-2">
              <Button variant="secondary" onClick={addCameraSlot} className="text-sm">
                + Add Another Camera
              </Button>
            </div>
          </div>
        </section>

        <hr />

        {/* Leader Configuration */}
        <section>
          <h3 className="text-lg font-medium mb-4">Leader Arm (Teleoperator)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                label="Type"
                value={leaderType}
                onChange={(e) => setLeaderType(e.target.value as any)}
                options={[
                  { label: 'Keyboard', value: 'keyboard' },
                  { label: 'Gamepad', value: 'gamepad' },
                  { label: 'Real Robot Teleoperation', value: 'real' },
                  { label: 'Phone', value: 'phone' },
                ]}
              />
            </div>

            {leaderType === 'real' && (
              <>
                <div>
                  <Select
                    label="Teleoperator Model"
                    value={leaderModel}
                    onChange={(e) => setLeaderModel(e.target.value)}
                    options={availableTeleoperators}
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Connected Device</label>
                    <div className="flex items-center gap-2">
                      {scanning && <span className="text-xs text-gray-500">Scanning...</span>}
                      <Button
                        onClick={scanPorts}
                        variant="secondary"
                        disabled={scanning}
                        className="text-xs py-1 px-2 h-auto"
                      >
                        Refresh Ports
                      </Button>
                    </div>
                  </div>
                  {serialPorts.length === 0 ? (
                    <div className="text-sm text-gray-500 italic p-2 border rounded bg-gray-50">No devices found. Connect via USB.</div>
                  ) : (
                    <Select
                      value={leaderConfig?.path || ''}
                      onChange={(e) => handleLeaderPortSelect(e.target.value)}
                      options={[
                        { label: 'Select a device...', value: '' },
                        ...deviceOptions
                      ]}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        <hr />


        <div className="flex justify-between pt-4">
          <Button onClick={() => setShowAdvanced(true)} variant="secondary">Advanced Mode</Button>
          <div className="flex gap-2">
            {onCancel && <Button onClick={onCancel} variant="secondary">Cancel</Button>}
            <Button onClick={saveConfiguration} variant="primary">Save Configuration</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RobotConfigurationForm;
