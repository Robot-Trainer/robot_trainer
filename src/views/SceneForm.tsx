import React, { useState, useEffect } from 'react';
import UiCard from '../ui/Card';
import UiButton from '../ui/Button';
import UiSelect from '../ui/Select';
import UiInput from '../ui/Input';
import { db } from '../db/db';
import { eq, and } from 'drizzle-orm';
import { sceneRobotsTable, sceneCamerasTable, sceneTeleoperatorsTable, datasetsTable } from '../db/schema';
import { robotModelsResource, teleoperatorModelsResource, robotsResource, camerasResource } from '../db/resources';
import { useToast } from '../ui/ToastContext';
import { parseMujocoCameras } from '../lib/mujoco_parser';
import DatasetFormView from './DatasetForm';
import { Dialog, DialogContent } from '@mui/material';

import { RobotSelectionDropdown } from './RobotSelectionDropdown';
import { CameraSelectionDropdown } from './CameraSelectionDropdown';

interface SceneFormProps {
  onCancel?: () => void;
  onSaved?: (config: Record<string, unknown>) => Promise<unknown> | void;
  initialData?: Record<string, unknown>;
}

export const SceneForm: React.FC<SceneFormProps> = ({ onCancel, onSaved, initialData }) => {
  const [selectedRobotId, setSelectedRobotId] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [sceneName, setSceneName] = useState('');
  const [sceneXmlPath, setSceneXmlPath] = useState('');
  const [xmlContent, setXmlContent] = useState('');

  const [leaderModel, setLeaderModel] = useState<string>('');
  const [leaderConfig, setLeaderConfig] = useState<Record<string, unknown> | null>(null);

  const [availableRobots, setAvailableRobots] = useState<{ label: string, value: string }[]>([]);
  const [robotModels, setRobotModels] = useState<Record<string, unknown>[]>([]);
  const [xmlCameras, setXmlCameras] = useState<Record<string, unknown>[]>([]);

  const [availableTeleoperators, setAvailableTeleoperators] = useState<{ label: string, value: string }[]>([]);

  const [knownRobots, setKnownRobots] = useState<Record<string, unknown>[]>([]);
  const [serialPorts, setSerialPorts] = useState<Record<string, unknown>[]>([]);
  const [scanning, setScanning] = useState(false);

  const [availableCameras, setAvailableCameras] = useState<Record<string, unknown>[]>([]);
  const [cameraSlots, setCameraSlots] = useState<{ id: number | null, key: number }[]>([{ id: null, key: Date.now() }]);

  const toast = useToast();
  const [openDatasetDialog, setOpenDatasetDialog] = useState(false);
  const [datasetInitialData, setDatasetInitialData] = useState<Record<string, unknown> | null>(null);

  const fetchData = async () => {
    try {
      const robots = await robotModelsResource.list();
      setRobotModels(robots);
      const rOpts = robots.map((r: Record<string, unknown>) => ({ label: r.name, value: String(r.id) }));
      setAvailableRobots(rOpts);

      const teleops = await teleoperatorModelsResource.list();
      const tOpts = teleops.map((t: Record<string, unknown> & { data?: Record<string, unknown> }) => ({ label: t.data?.name || t.id, value: t.id }));
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

  // Helper to generate stable negative IDs for XML cameras
  const getXmlCameraId = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0;
    }
    // Ensure negative and non-zero. Use 10000 offset to avoid small negative conflicts if any
    return -Math.abs(hash) - 10000;
  };

  // Initialize defaults
  useEffect(() => {
    console.log('SceneForm mounted');
    fetchData();
  }, []);

  // Update XML cameras list whenever XML content changes or selected Robot changes
  useEffect(() => {
    const parseXmlCameras = async () => {
      const newXmlCameras: Record<string, unknown>[] = [];
      const seenNames = new Set<string>();

      // 1. From Scene XML
      if (xmlContent) {
        try {
          const parsedCams = parseMujocoCameras(xmlContent);
          parsedCams.forEach(cam => {
            if (cam.name && !seenNames.has(cam.name)) {
              seenNames.add(cam.name);
              newXmlCameras.push({
                id: getXmlCameraId(cam.name),
                name: cam.name,
                isXml: true,
                modality: 'simulated',
                attributes: cam // Store full attributes for later DB saving
              });
            }
          });
        } catch (e) {
          console.error("Error parsing scene XML for cameras", e);
        }
      }

      // 2. From Robot Model XML
      if (selectedRobotId) {
        try {
          const robot = knownRobots.find(r => r.id === selectedRobotId);
          if (robot && robot.robotModelId) {
            const model = robotModels.find(m => m.id === robot.robotModelId);
            if (model && model.modelPath) {
              // Read model file to get metadata (cached by main process usually fast)
              const res = await window.electronAPI.readModelFile(model.modelPath);
              if (res && res.metadata && res.metadata.cameras) {
                res.metadata.cameras.forEach((name: string) => {
                  if (!seenNames.has(name)) {
                    seenNames.add(name);
                    newXmlCameras.push({
                      id: getXmlCameraId(name),
                      name: name,
                      isXml: true,
                      modality: 'simulated'
                    });
                  }
                });
              }
            }
          }
        } catch (e) {
          console.error("Error reading robot model XML for cameras", e);
        }
      }

      setXmlCameras(newXmlCameras);
    };

    parseXmlCameras();
  }, [xmlContent, selectedRobotId, knownRobots, robotModels]);


  // If opened for editing, populate simple top-level fields from the initial data
  useEffect(() => {
    if (!initialData) return;

    const hydrate = async () => {
      try {
        setSceneName(initialData.name || '');
        setSceneXmlPath(initialData.sceneXmlPath || '');

        if (initialData.sceneXmlPath) {
          try {
            const res = await window.electronAPI.readModelFile(initialData.sceneXmlPath);
            // Handle new object return type from readModelFile
            if (typeof res === 'object' && res.content !== undefined) {
              setXmlContent(res.content);
            } else {
              setXmlContent(res);
            }
          } catch (e) {
            console.error('Failed to read XML file:', e);
          }
        }

        if (!initialData.id) return;

        // Fetch Scene Robots
        const robotRows = await db.select().from(sceneRobotsTable).where(eq(sceneRobotsTable.sceneId, initialData.id));
        if (robotRows.length > 0) {
          const r = robotRows[0];
          setSelectedRobotId(r.robotId);
          const snap = r.snapshot as Record<string, unknown>;
          if (snap) {
            if (snap.leaderConfig) setLeaderConfig(snap.leaderConfig);
          }
        }

        // Fetch Scene Cameras
        const cameraRows = await db.select().from(sceneCamerasTable).where(eq(sceneCamerasTable.sceneId, initialData.id));
        if (cameraRows.length > 0) {
          setCameraSlots(cameraRows.map((c, i) => ({ id: c.cameraId, key: Date.now() + i })));
        }

        // Fetch Scene Teleoperators
        const teleopRows = await db.select().from(sceneTeleoperatorsTable).where(eq(sceneTeleoperatorsTable.sceneId, initialData.id));
        if (teleopRows.length > 0) {
          setLeaderModel(teleopRows[0].teleoperatorId.toString());
        }

      } catch (e) {
        console.warn('Failed to hydrate initialData into SceneForm', e);
      }
    };

    hydrate();
  }, [initialData]);

  const scanPorts = async () => {
    setScanning(true);
    try {
      const ports = await window.electronAPI.scanSerialPorts();
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

  const getDeviceLabel = (port: Record<string, unknown>) => {
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
    if (!sceneName) {
      alert("Please enter a scene name.");
      return;
    }

    if (!selectedRobotId) {
      alert("Please select a follower robot.");
      return;
    }

    // Save XML if in advanced mode or if content available and we have a path
    if (sceneXmlPath && xmlContent) {
      try {
        await window.electronAPI.saveSceneXml(sceneXmlPath, xmlContent);
      } catch (e) {
        console.error("Failed to save XML", e);
        // Continue anyway? Or stop? Let's log and continue but maybe warn user
        alert("Failed to save XML content to disk. Saving database record only.");
      }
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
      const parentResult: Record<string, unknown> = await onSaved({
        name: sceneName,
        sceneXmlPath
      });

      if (!parentResult || !parentResult.id) {
        console.error("No ID returned from save");
        return;
      }

      const sceneId = parentResult.id;

      // 2. Save Follower (Upsert / Replace)
      const existingRobots = await db.select().from(sceneRobotsTable).where(eq(sceneRobotsTable.sceneId, sceneId));
      const existingRobot = existingRobots[0]; // Assuming 1 to 1 for this wizard

      const newRobotSnapshot = {
        ...selectedRobot,
        targetConfig: currentConfig,
        leaderConfig
      };

      if (existingRobot) {
        if (existingRobot.robotId !== selectedRobot.id) {
          // ID changed: Remove old, add new
          await db.delete(sceneRobotsTable).where(and(
            eq(sceneRobotsTable.sceneId, sceneId),
            eq(sceneRobotsTable.robotId, existingRobot.robotId)
          ));
          await db.insert(sceneRobotsTable).values({
            sceneId,
            robotId: selectedRobot.id,
            snapshot: newRobotSnapshot
          });
        } else {
          // ID same: Update snapshot
          await db.update(sceneRobotsTable).set({
            snapshot: newRobotSnapshot
          }).where(and(
            eq(sceneRobotsTable.sceneId, sceneId),
            eq(sceneRobotsTable.robotId, selectedRobot.id)
          ));
        }
      } else {
        // No existing: Insert
        await db.insert(sceneRobotsTable).values({
          sceneId,
          robotId: selectedRobot.id,
          snapshot: newRobotSnapshot
        });
      }

      // 3. Save Cameras (Diff & Upsert)
      const existingCameras = await db.select().from(sceneCamerasTable).where(eq(sceneCamerasTable.sceneId, sceneId));
      const existingCamIds = new Set(existingCameras.map(c => c.cameraId));

      // Resolve IDs (handle XML cameras)
      const finalSelectedIds = new Set<number>();
      for (const id of selectedCameraIds) {
        if (id < 0) {
          // It's an XML camera. Check if we need to create a DB entry for it.
          const xmlCam = xmlCameras.find(c => c.id === id);
          if (xmlCam) {
            // Check if exists in DB by name and is simulated
            const existing = availableCameras.find((c: Record<string, unknown>) => c.name === xmlCam.name && c.modality === 'simulated');
            if (existing) {
              finalSelectedIds.add(existing.id);
            } else {
              // Create it
              try {
                const camAttrs = (xmlCam as Record<string, unknown>).attributes || {};
                // MJCF attributes
                const pos = camAttrs.pos || [0, 0, 0];
                const quat = camAttrs.quat || [1, 0, 0, 0];
                const xyaxes = camAttrs.xyaxes || [1, 0, 0, 0, 1, 0];

                const created = await camerasResource.create({
                  name: xmlCam.name,
                  modality: 'simulated',
                  
                  // Map MJCF properties
                  posX: pos[0],
                  posY: pos[1],
                  posZ: pos[2],

                  quatW: quat[0],
                  quatX: quat[1],
                  quatY: quat[2],
                  quatZ: quat[3],

                  xyaxesX1: xyaxes[0],
                  xyaxesY1: xyaxes[1],
                  xyaxesZ1: xyaxes[2],
                  xyaxesX2: xyaxes[3],
                  xyaxesY2: xyaxes[4],
                  xyaxesZ2: xyaxes[5],

                  data: {
                    source: 'xml',
                    readOnly: true,
                    mujoco: camAttrs
                  }
                });
                if (created && created.id) {
                  finalSelectedIds.add(created.id);
                  // Update available cameras locally so we don't recreate next time
                  // Note: check type compatibility
                  setAvailableCameras((prev: Record<string, unknown>[]) => [...prev, created]);
                }
              } catch (e) {
                console.error("Failed to create DB entry for XML camera", xmlCam.name, e);
              }
            }
          }
        } else {
          finalSelectedIds.add(id);
        }
      }

      // Remove deleted cameras
      for (const oldId of existingCamIds) {
        if (!finalSelectedIds.has(oldId)) {
          await db.delete(sceneCamerasTable).where(and(
            eq(sceneCamerasTable.sceneId, sceneId),
            eq(sceneCamerasTable.cameraId, oldId)
          ));
        }
      }

      // Insert or Update active cameras
      // We need to refresh availableCameras list logic because we might have just created some
      // But we can just fetch from DB or use the ID.
      // Actually we need the snapshot.
      // If we created it, we can fetch it.

      // Re-fetch cameras to get snapshots for new IDs
      const allDbCameras = await camerasResource.list();

      for (const newId of finalSelectedIds) {
        const cam = allDbCameras.find((c: Record<string, unknown>) => c.id === newId);
        if (!cam) continue;

        if (existingCamIds.has(newId)) {
          await db.update(sceneCamerasTable).set({
            snapshot: cam
          }).where(and(
            eq(sceneCamerasTable.sceneId, sceneId),
            eq(sceneCamerasTable.cameraId, newId)
          ));
        } else {
          await db.insert(sceneCamerasTable).values({
            sceneId,
            cameraId: newId,
            snapshot: cam
          });
        }
      }

      // 4. Save Teleoperator (Diff & Upsert)
      const existingTeleops = await db.select().from(sceneTeleoperatorsTable).where(eq(sceneTeleoperatorsTable.sceneId, sceneId));
      const existingTeleop = existingTeleops[0];

      let desiredTeleopId: number | null = null;
      if (leaderModel) {
        const parsed = parseInt(leaderModel, 10);
        if (!isNaN(parsed)) desiredTeleopId = parsed;
      }

      if (existingTeleop) {
        if (desiredTeleopId === null) {
          // Was present, now removed
          await db.delete(sceneTeleoperatorsTable).where(and(
            eq(sceneTeleoperatorsTable.sceneId, sceneId),
            eq(sceneTeleoperatorsTable.teleoperatorId, existingTeleop.teleoperatorId)
          ));
        } else if (existingTeleop.teleoperatorId !== desiredTeleopId) {
          // Changed model: Delete old, Insert new
          await db.delete(sceneTeleoperatorsTable).where(and(
            eq(sceneTeleoperatorsTable.sceneId, sceneId),
            eq(sceneTeleoperatorsTable.teleoperatorId, existingTeleop.teleoperatorId)
          ));
          await db.insert(sceneTeleoperatorsTable).values({
            sceneId,
            teleoperatorId: desiredTeleopId,
            snapshot: { config: leaderConfig }
          });
        } else {
          // Same model: Update snapshot
          await db.update(sceneTeleoperatorsTable).set({
            snapshot: { config: leaderConfig }
          }).where(and(
            eq(sceneTeleoperatorsTable.sceneId, sceneId),
            eq(sceneTeleoperatorsTable.teleoperatorId, desiredTeleopId)
          ));
        }
      } else {
        // No existing, but have desired
        if (desiredTeleopId !== null) {
          await db.insert(sceneTeleoperatorsTable).values({
            sceneId,
            teleoperatorId: desiredTeleopId,
            snapshot: { config: leaderConfig}
          });
        }
      }

      // return parentResult so callers (like "Create Dataset" flow) can continue
      return parentResult;

    } catch (e) {
      console.error(e);
      alert('Failed to save scene details');
      return;
    }
  };

  // Open DatasetForm for the current scene. If the scene isn't persisted yet, attempt to save first.
  const handleCreateDatasetForScene = async () => {
    // If scene already has an id (editing existing), use it; otherwise save first
    let sceneId = initialData?.id || null;
    if (!sceneId) {
      const saved = await saveConfiguration();
      if (!saved || !saved.id) {
        // saveConfiguration already alerts on validation errors
        return;
      }
      sceneId = saved.id;
    }

    setDatasetInitialData({ sceneId });
    setOpenDatasetDialog(true);
  };

  const handleDatasetSavedFromDialog = async (payload: Record<string, unknown>) => {
    try {
      const [saved] = await db.insert(datasetsTable).values({
        name: payload.name || `Dataset - ${new Date().toLocaleString()}`,
        sceneId: payload.sceneId,
        skillId: payload.skillId || null,
        data: payload
      }).returning();
      toast?.success?.('Dataset created');
      setOpenDatasetDialog(false);
      return saved;
    } catch (e) {
      console.error('Failed to create dataset', e);
      toast?.error?.('Failed to create dataset');
      throw e;
    }
  };

  const deviceOptions = getDeviceOptions();
  const selectedRobot = knownRobots.find(r => r.id === selectedRobotId);

  if (showAdvanced) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <UiButton onClick={() => setShowAdvanced(false)} variant="secondary">
            &larr; Back to Basic Config
          </UiButton>
        </div>

        <UiCard className="p-4 bg-white">
          <h3 className="text-lg font-medium mb-2">Scene XML Editor</h3>
          <p className="text-sm text-gray-500 mb-2">
            Edit the MuJoCo XML definition for this scene directly.
          </p>
          <textarea
            className="w-full h-96 font-mono p-2 border rounded text-xs leading-relaxed overflow-auto whitespace-pre"
            value={xmlContent}
            onChange={(e) => setXmlContent(e.target.value)}
          />
          <div className="mt-4 flex justify-end">
            <div className="flex gap-2">
              {onCancel && <UiButton onClick={onCancel} variant="secondary">Cancel</UiButton>}
              <UiButton onClick={saveConfiguration} variant="primary">Save Scene</UiButton>
            </div>
          </div>
        </UiCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <UiCard className="p-8 space-y-8 shadow-none border-0">
        <div className="mb-6 flex items-start gap-4">
          {onCancel && (
            <UiButton variant="ghost" onClick={onCancel} className="mr-4">
              &larr; Back
            </UiButton>
          )}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 text-left">Scene Setup</h2>
            <p className="text-gray-500 mt-1 text-left">Configure your scene, robot, and leader devices</p>
          </div>
        </div>

        
        <section>
          <UiInput
            label="Scene Name"
            value={sceneName}
            onChange={(e) => setSceneName(e.target.value)}
            placeholder="e.g. Table Top Manipulation"
          />
          <div className="mt-4">
            <UiInput
              label="Scene XML Path"
              value={sceneXmlPath}
              onChange={(e) => setSceneXmlPath(e.target.value)}
              placeholder="/path/to/scene.xml"
              className="font-mono text-sm"
            />
          </div>

        </section>
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
            <UiButton variant="ghost" className="text-xs text-gray-500" onClick={scanPorts} disabled={scanning}>
              {scanning ? 'Scanning...' : 'Refresh Devices'}
            </UiButton>
          </div>
        </section>
        {/* Camera Configuration */}
        <section>
          <h3 className="text-lg font-medium mb-4">Camera(s)</h3>
          <div className="space-y-4">
            {cameraSlots.map((slot, idx) => (
              <CameraSelectionDropdown
                key={slot.key}
                label={`Camera ${idx + 1}`}
                cameras={[...availableCameras, ...xmlCameras]}
                selectedCameraId={slot.id}
                onSelect={(id) => updateCameraSlot(idx, id)}
                onCamerasChanged={refreshCameras}
                onRemove={cameraSlots.length > 1 ? () => removeCameraSlot(idx) : undefined}
              />
            ))}

            <div className="pt-2">
              <UiButton variant="secondary" onClick={addCameraSlot} className="text-sm">
                + Add Another Camera
              </UiButton>
            </div>
          </div>
        </section>

        {/* Leader Configuration */}
        <section>
          <h3 className="text-lg font-medium mb-4">Leader Arm (Teleoperator)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                  <UiSelect
                    label="Teleoperator"
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
                      <UiButton
                        onClick={scanPorts}
                        variant="secondary"
                        disabled={scanning}
                        className="text-xs py-1 px-2 h-auto"
                      >
                        Refresh Ports
                      </UiButton>
                    </div>
                  </div>
                  {serialPorts.length === 0 ? (
                    <div className="text-sm text-gray-500 italic p-2 border rounded bg-gray-50">No devices found. Connect via USB.</div>
                  ) : (
                    <UiSelect
                      value={leaderConfig?.path || ''}
                      onChange={(e) => handleLeaderPortSelect(e.target.value)}
                      options={[
                        { label: 'Select a device...', value: '' },
                        ...deviceOptions
                      ]}
                    />
                  )}
                </div>
          </div>
        </section>

        <div className="flex justify-between pt-4">
          <UiButton onClick={() => setShowAdvanced(true)} variant="secondary">Advanced Mode</UiButton>
          <div className="flex gap-2">
            <UiButton
              variant="ghost"
              onClick={handleCreateDatasetForScene}
              disabled={!initialData?.id && !sceneName}
              title={!initialData?.id ? 'Save the scene first or click Save then create a dataset' : 'Create a new dataset for this scene'}
            >
              Create Dataset
            </UiButton>
            {onCancel && <UiButton onClick={onCancel} variant="secondary">Cancel</UiButton>}
            <UiButton onClick={saveConfiguration} variant="primary">Save Scene</UiButton>
          </div>
        </div>
      </UiCard>

      {/* DatasetForm dialog (create a new Dataset preselected to this Scene) */}
      <Dialog open={openDatasetDialog} onClose={() => setOpenDatasetDialog(false)} maxWidth="lg" fullWidth>
        <DialogContent dividers>
          <DatasetFormView
            initialData={datasetInitialData || { sceneId: initialData?.id }}
            onCancel={() => setOpenDatasetDialog(false)}
            onSaved={handleDatasetSavedFromDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SceneForm;
