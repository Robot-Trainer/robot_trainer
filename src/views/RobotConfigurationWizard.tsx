import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { robotModelsResource, teleoperatorModelsResource, robotsResource } from '../db/resources';
import CameraConfigurationWizard from './CameraConfigurationWizard';

import { RobotSelectionDropdown } from './RobotSelectionDropdown';

// Helper for Modal
const Modal = ({ children, onClose, title }: { children: React.ReactNode, onClose: () => void, title: string }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <Button variant="ghost" onClick={onClose}>X</Button>
      </div>
      {children}
    </div>
  </div>
);

interface RobotConfigurationWizardProps {
  onCancel?: () => void;
  onSaved?: (config: any) => void;
}

export const RobotConfigurationWizard: React.FC<RobotConfigurationWizardProps> = ({ onCancel, onSaved }) => {
  const [selectedRobotId, setSelectedRobotId] = useState<number | null>(null);

  const [leaderType, setLeaderType] = useState<'keyboard' | 'gamepad' | 'real' | 'phone'>('keyboard');
  const [leaderModel, setLeaderModel] = useState<string>('');
  const [leaderConfig, setLeaderConfig] = useState<any>(null);

  const [availableRobots, setAvailableRobots] = useState<{ label: string, value: string }[]>([]);
  const [availableTeleoperators, setAvailableTeleoperators] = useState<{ label: string, value: string }[]>([]);

  const [knownRobots, setKnownRobots] = useState<any[]>([]);
  const [serialPorts, setSerialPorts] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  const [cameras, setCameras] = useState<any[]>([]);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const fetchData = async () => {
    try {
      const robots = await robotModelsResource.list();
      const rOpts = robots.map((r: any) => ({ label: r.name, value: r.name }));
      setAvailableRobots(rOpts);

      const teleops = await teleoperatorModelsResource.list();
      const tOpts = teleops.map((t: any) => ({ label: t.data?.name || t.id, value: t.id }));
      setAvailableTeleoperators(tOpts);

      const kRobots = await robotsResource.list();
      setKnownRobots(kRobots);

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
    console.log('RobotConfigurationWizard mounted');
    fetchData();
  }, []);

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

    if (robot.modality === 'simulated') {
      setCameras([{
        id: 'sim-cam',
        name: 'Simulated Camera',
        resolution: '1280x720',
        fps: 30,
        type: 'simulated'
      }]);
    } else {
      // Real
      scanPorts();
      setCameras(prev => prev.filter(c => c.type !== 'simulated'));
    }
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

  const handleCameraSave = (newCameras: any[]) => {
    setCameras(newCameras);
    setShowCameraModal(false);
  };

  const saveConfiguration = async () => {
    if (!selectedRobotId) {
      alert("Please select a Follower Robot.");
      return;
    }
    const selectedRobot = knownRobots.find(r => r.id === selectedRobotId);
    if (!selectedRobot) {
      alert("Invalid robot selection");
      return;
    }

    if (selectedRobot.modality === 'real' && cameras.length === 0) {
      alert("Please configure a camera.");
      return;
    }

    // Try to find current port info if connected
    let currentConfig = selectedRobot.data?.config;
    if (selectedRobot.modality === 'real' && selectedRobot.serialNumber) {
      const port = serialPorts.find(p => p.serialNumber === selectedRobot.serialNumber);
      if (port) {
        currentConfig = port;
      }
    }

    const config = {
      followerType: selectedRobot.modality || 'real',
      followerModel: selectedRobot.model,
      followerConfig: currentConfig,
      leaderType,
      leaderModel,
      leaderConfig,
      cameras,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await (window as any).electronAPI.saveRobotConfig(config);
      if (res && res.ok) {
        if (onSaved) onSaved(config);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save configuration');
    }
  };

  const deviceOptions = getDeviceOptions();
  const selectedRobot = knownRobots.find(r => r.id === selectedRobotId);

  return (
    <div className="max-w-4xl mx-auto pt-8">
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
          {selectedRobot?.modality === 'simulated' ? (
            <div className="p-4 bg-blue-50 text-blue-800 rounded-md text-sm">
              Running in Simulation Mode. Using default camera configuration: <strong>720p @ 30fps</strong>.
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {cameras.length === 0 ? 'No cameras configured. Please configure a real camera.' : `${cameras.length} camera(s) configured.`}
                </div>
                <Button onClick={() => setShowCameraModal(true)}>Configure Cameras</Button>
              </div>
              {cameras.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {cameras.map((cam, idx) => (
                    <div key={idx} className="p-2 border rounded bg-gray-50 text-sm">
                      {cam.name} ({cam.resolution}, {cam.fps}fps)
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <hr />

        {/* Leader Configuration */}
        <section>
          <h3 className="text-lg font-medium mb-4">Leader Arm (Teleoperator)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Select
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teleoperator Model</label>
                  <Select
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


        <div className="flex justify-end pt-4">
          <Button onClick={saveConfiguration} variant="primary">Save Configuration</Button>
        </div>
      </Card>

      {showCameraModal && (
        <Modal title="Configure Cameras" onClose={() => setShowCameraModal(false)}>
          <CameraConfigurationWizard
            initialCameras={cameras}
            onSave={handleCameraSave}
            onCancel={() => setShowCameraModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default RobotConfigurationWizard;