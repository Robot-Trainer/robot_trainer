import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
// import { AVAILABLE_ROBOTS, AVAILABLE_TELEOPERATORS } from '../lib/constants';
const AVAILABLE_ROBOTS: string[] = ['mock_robot'];
const AVAILABLE_TELEOPERATORS: string[] = ['mock_teleop'];
import RobotDevicesWizard from './RobotDevicesWizard';
import CameraConfigurationWizard from './CameraConfigurationWizard';
import useUIStore from '../lib/uiStore';

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
  const [followerType, setFollowerType] = useState<'real' | 'simulation'>('real');
  const [followerModel, setFollowerModel] = useState<string>('');
  const [followerConfig, setFollowerConfig] = useState<any>(null);

  const [leaderType, setLeaderType] = useState<'keyboard' | 'gamepad' | 'real' | 'phone'>('keyboard');
  const [leaderModel, setLeaderModel] = useState<string>('');
  const [leaderConfig, setLeaderConfig] = useState<any>(null);

  const [cameras, setCameras] = useState<any[]>([]);

  const [showRobotModal, setShowRobotModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Initialize defaults
  useEffect(() => {
    console.log('RobotConfigurationWizard mounted');
    try {
      if (AVAILABLE_ROBOTS && AVAILABLE_ROBOTS.length > 0 && !followerModel) {
        setFollowerModel(AVAILABLE_ROBOTS[0]);
      }
      if (AVAILABLE_TELEOPERATORS && AVAILABLE_TELEOPERATORS.length > 0 && !leaderModel) {
        // Try to find a reasonable default or just the first one
        setLeaderModel(AVAILABLE_TELEOPERATORS[0]);
      }
    } catch (e) {
      console.error('Error initializing defaults:', e);
    }
  }, []);

  const handleRobotSelect = (config: { follower?: any, leader?: any }) => {
    if (config.follower) {
      setFollowerConfig(config.follower);
      // If we selected a real robot, we might want to infer the model if possible, 
      // but for now we just store the config (port info).
    }
    if (config.leader) {
      setLeaderConfig(config.leader);
    }
    setShowRobotModal(false);
  };

  const handleCameraSave = (newCameras: any[]) => {
    setCameras(newCameras);
    setShowCameraModal(false);
  };

  const saveConfiguration = async () => {
    const config = {
      followerType,
      followerModel: followerType === 'simulation' ? followerModel : undefined,
      followerConfig: followerType === 'real' ? followerConfig : undefined,
      leaderType,
      leaderModel: leaderType === 'real' ? leaderModel : undefined, // Or if leaderType is gamepad/keyboard, maybe we don't need model?
      leaderConfig: leaderType === 'real' ? leaderConfig : undefined,
      cameras: followerType === 'real' ? cameras : [], // Cameras only for real robot
      createdAt: new Date().toISOString(),
    };

    console.log('Saving config:', config);
    try {
      const res = await (window as any).electronAPI.saveRobotConfig(config);
      if (res && res.ok) {
        // Maybe advance step or show success
        // alert('Configuration saved!');
        if (onSaved) onSaved(config);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save configuration');
    }
  };

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
          <h3 className="text-lg font-medium mb-4">Follower Arm</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Select
                value={followerType}
                onChange={(e) => setFollowerType(e.target.value as 'real' | 'simulation')}
                options={[
                  { label: 'Real Robot', value: 'real' },
                  { label: 'Simulation', value: 'simulation' },
                ]}
              />
            </div>

            {followerType === 'simulation' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Robot Model</label>
                <Select
                  value={followerModel}
                  onChange={(e) => setFollowerModel(e.target.value)}
                  options={(AVAILABLE_ROBOTS || []).map(r => ({ label: r, value: r }))}
                />
              </div>
            )}

            {followerType === 'real' && (
              <div className="flex items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Configuration</label>
                  <div className="p-2 border rounded bg-gray-50 text-sm h-10 flex items-center">
                    {followerConfig ? `${followerConfig.manufacturer || 'Device'} (${followerConfig.path})` : 'No device selected'}
                  </div>
                </div>
                <Button className="ml-2" onClick={() => setShowRobotModal(true)}>Configure</Button>
              </div>
            )}
          </div>
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
                    options={(AVAILABLE_TELEOPERATORS || []).map(t => ({ label: t, value: t }))}
                  />
                </div>
                <div className="col-span-2">
                   <div className="flex items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Device Configuration</label>
                      <div className="p-2 border rounded bg-gray-50 text-sm h-10 flex items-center">
                        {leaderConfig ? `${leaderConfig.manufacturer || 'Device'} (${leaderConfig.path})` : 'No device selected'}
                      </div>
                    </div>
                    <Button className="ml-2" onClick={() => setShowRobotModal(true)}>Configure</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <hr />

        {/* Camera Configuration */}
        <section>
          <h3 className="text-lg font-medium mb-4">Cameras</h3>
          {followerType === 'simulation' ? (
            <div className="text-gray-500 italic">Cameras are disabled in simulation mode.</div>
          ) : (
            <div>
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  {cameras.length === 0 ? 'No cameras configured.' : `${cameras.length} camera(s) configured.`}
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

        <div className="flex justify-end pt-4">
          <Button onClick={saveConfiguration} variant="primary">Save Configuration</Button>
        </div>
      </Card>

      {showRobotModal && (
        <Modal title="Configure Robot Devices" onClose={() => setShowRobotModal(false)}>
          <RobotDevicesWizard 
            onSelect={handleRobotSelect} 
            onCancel={() => setShowRobotModal(false)} 
          />
        </Modal>
      )}

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
