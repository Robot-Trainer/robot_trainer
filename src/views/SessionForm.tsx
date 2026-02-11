import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db/db';
import { eq } from 'drizzle-orm';
import { getRobotConfigurationSnapshot } from '../db/selectors';
import {
  robotConfigurationsTable,
  skillsTable,
  configRobotsTable,
  configCamerasTable,
  configTeleoperatorsTable,
  camerasTable,
  robotsTable,
  episodesTable
} from '../db/schema';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextField from '@mui/material/TextField';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import { Play, CheckCircle, ChevronRight } from '../icons';
import { VideoPlayer } from '../ui/VideoPlayer';

// Additional Icons
const Pause = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
);
const Stop = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M6 6h12v12H6z" /></svg>
);
const RefreshCw = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const XCircle = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);
const Circle = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><circle cx="12" cy="12" r="8" /></svg>
);

const ExternalLink = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const TELEOP_TYPE_MAP: Record<string, string> = {
  "Phone": "phone",
  "OmxLeader": "omx_leader",
  "SO101Leader": "so101_leader",
  "KeyboardTeleop": "keyboard",
  "KeyboardEndEffectorTeleop": "keyboard_ee",
  "KeyboardRoverTeleop": "keyboard_rover",
  "SO100Leader": "so100_leader",
  "HomunculusGlove": "homunculus_glove",
  "HomunculusArm": "homunculus_arm",
  "KochLeader": "koch_leader",
  "Reachy2Teleoperator": "reachy2_teleoperator",
  "BiSO100Leader": "bi_so100_leader",
  "GamepadTeleop": "gamepad",
};

type ConfigStatus = {
  ready: boolean;
  issues: string[];
  mode: 'sim' | 'real' | 'mixed' | 'unknown';
  cameraCount: number;
  robotCount: number;
  teleopCount: number;
};

interface ConfigDropdownProps {
  configs: any[];
  selectedConfigId: number | null;
  statusMap: Record<number, ConfigStatus>;
  onSelect: (id: number) => void;
}

const RobotConfigurationDropdown: React.FC<ConfigDropdownProps> = ({ configs, selectedConfigId, statusMap, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedConfig = configs.find(c => c.id === selectedConfigId);
  const selectedStatus = selectedConfig ? statusMap[selectedConfig.id] : undefined;

  const renderBadges = (status?: ConfigStatus) => {
    if (!status) return null;
    const issueText = status.issues.length > 0 ? status.issues.join(', ') : undefined;
    return (
      <>
        {status.mode === 'sim' && <Badge color="blue">sim</Badge>}
        {status.mode === 'real' && <Badge color="green">real</Badge>}
        {status.mode === 'mixed' && <Badge color="yellow">mixed</Badge>}
        {status.ready
          ? <Badge color="green">ready</Badge>
          : <Badge color="red" tooltip={issueText || 'Not ready'}>not ready</Badge>}
      </>
    );
  };

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Robot Configuration</label>
      <div className="relative cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center min-h-[38px]">
          {selectedConfig ? (
            <div className="flex items-center flex-wrap gap-1">
              <span className="font-medium">{selectedConfig.name}</span>
              {renderBadges(selectedStatus)}
            </div>
          ) : (
            <span className="text-gray-500">Select configuration...</span>
          )}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
          <ChevronRight className="h-4 w-4 rotate-90" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {configs.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">No configurations found</div>
          )}
          {configs.map(cfg => {
            const status = statusMap[cfg.id];
            return (
              <div
                key={cfg.id}
                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 flex items-center justify-between"
                onClick={() => { onSelect(cfg.id); setIsOpen(false); }}
              >
                <div className="flex items-center flex-wrap gap-1">
                  <span className="font-normal block truncate">{cfg.name}</span>
                  {renderBadges(status)}
                </div>
                {selectedConfigId === cfg.id && <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface Props {
  onCancel: () => void;
  onSaved: (item: any) => void;
  initialData?: any;
}

export const SessionForm: React.FC<Props> = ({ onCancel, onSaved, initialData }) => {
  // State
  const [sessionName, setSessionName] = useState('');
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [configStatusMap, setConfigStatusMap] = useState<Record<number, ConfigStatus>>({});
  const [, setSerialPorts] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);

  const [cameras, setCameras] = useState<any[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  const [recording, setRecording] = useState(false);

  // Map cameraId -> wsUrl
  const [cameraStreams, setCameraStreams] = useState<{ [key: number]: string }>({});
  const [simStreamUrl, setSimStreamUrl] = useState<string | null>(null);

  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Dataset Config
  const [repoId, setRepoId] = useState('');
  const [singleTask, setSingleTask] = useState('');
  const [fps, setFps] = useState<number>(30);
  const [saving, setSaving] = useState(false);

  // Timers and refs
  const recordingStartTime = useRef<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState('00:00');
  const timerRef = useRef<any>(null);

  const scanSerialPorts = async () => {
    try {
      const ports = await (window as any).electronAPI?.scanSerialPorts?.();
      const list = ports || [];
      setSerialPorts(list);
      return list;
    } catch (e) {
      console.error('Failed to scan serial ports', e);
      setSerialPorts([]);
      return [];
    }
  };

  const isCameraConnected = (cam: any) => {
    const data = cam?.data || {};
    return Boolean(data.path || data.devicePath || data.rtspUrl || data.url);
  };

  const refreshConfigStatuses = async (configList: any[]) => {
    if (!configList || configList.length === 0) {
      setConfigStatusMap({});
      return;
    }

    const ports = await scanSerialPorts();
    const nextMap: Record<number, ConfigStatus> = {};

    for (const cfg of configList) {
      try {
        const [robotRows, cameraRows, teleopRows] = await Promise.all([
          db.select({ robot: robotsTable })
            .from(configRobotsTable)
            .innerJoin(robotsTable, eq(configRobotsTable.robotId, robotsTable.id))
            .where(eq(configRobotsTable.configurationId, cfg.id)),
          db.select({ camera: camerasTable })
            .from(configCamerasTable)
            .innerJoin(camerasTable, eq(configCamerasTable.cameraId, camerasTable.id))
            .where(eq(configCamerasTable.configurationId, cfg.id)),
          db.select().from(configTeleoperatorsTable)
            .where(eq(configTeleoperatorsTable.configurationId, cfg.id))
        ]);

        const robots = robotRows.map(r => r.robot);
        const cameras = cameraRows.map(r => r.camera);
        const teleops = teleopRows;

        const hasRobot = robots.length > 0;
        const hasCameras = cameras.length > 0;
        const hasTeleop = teleops.length > 0;

        const hasRealItems = robots.some(r => r.modality === 'real') || cameras.some(c => c.modality === 'real');
        const hasSimItems = robots.some(r => r.modality === 'simulated') || cameras.some(c => c.modality === 'simulated');
        const mode: ConfigStatus['mode'] = hasRealItems && hasSimItems ? 'mixed' : hasRealItems ? 'real' : hasSimItems ? 'sim' : 'unknown';

        const allRobotsSim = hasRobot && robots.every(r => r.modality === 'simulated');
        const allCamerasSim = hasCameras && cameras.every(c => c.modality === 'simulated');
        const isSimConfigReady = hasRobot && hasCameras && hasTeleop && allRobotsSim && allCamerasSim;

        const issues: string[] = [];
        let ready = false;

        if (isSimConfigReady) {
          ready = true;
        } else {
          if (!hasRobot) issues.push('missing robot');
          if (!hasCameras) issues.push('missing cameras');
          if (!hasTeleop) issues.push('missing teleoperator');

          const realRobotDisconnected = robots
            .filter(r => r.modality === 'real')
            .some(r => !r.serialNumber || !ports.some((p: any) => p.serialNumber && r.serialNumber === p.serialNumber));
          if (realRobotDisconnected) issues.push('real robot not connected');

          const realCameraDisconnected = cameras
            .filter(c => c.modality === 'real')
            .some(c => !isCameraConnected(c));
          if (realCameraDisconnected) issues.push('real camera not connected');

          const teleopDisconnected = teleops.some((t: any) => {
            const snap = t.snapshot || {};
            if (snap.type !== 'real') return false;
            const cfg = snap.config || {};
            const serial = cfg.serialNumber;
            const path = cfg.path;
            if (!serial && !path) return true;
            if (serial && ports.some((p: any) => p.serialNumber === serial)) return false;
            if (path && ports.some((p: any) => p.path === path)) return false;
            return true;
          });
          if (teleopDisconnected) issues.push('teleoperator not connected');

          if (hasRobot && hasCameras && !realRobotDisconnected && !realCameraDisconnected && !teleopDisconnected) {
            ready = true;
          }
        }

        nextMap[cfg.id] = {
          ready,
          issues,
          mode,
          cameraCount: cameras.length,
          robotCount: robots.length,
          teleopCount: teleops.length
        };
      } catch (e) {
        console.error('Failed to compute configuration status', e);
        nextMap[cfg.id] = {
          ready: false,
          issues: ['status unavailable'],
          mode: 'unknown',
          cameraCount: 0,
          robotCount: 0,
          teleopCount: 0
        };
      }
    }

    setConfigStatusMap(nextMap);
  };

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedConfigs, loadedSkills] = await Promise.all([
          db.select().from(robotConfigurationsTable),
          db.select().from(skillsTable)
        ]);
        setConfigs(loadedConfigs);
        setSkills(loadedSkills);

        // Pre-select if initialData
        if (initialData) {
          setSessionName(initialData.name);
          setSelectedConfigId(initialData.robotConfigurationId);
          setSelectedSkillId(initialData.skillId);
          // Load episodes for session
          if (initialData.id) {
            const eps = await db.select().from(episodesTable).where(eq(episodesTable.sessionId, initialData.id));
            setEpisodes(eps.map(e => ({
              ...e,
              status: e.name.includes('[success]') ? 'success' : e.name.includes('[failure]') ? 'failure' : 'unknown',
              duration: 'N/A' // Not stored in schema
            })));
          }

          // Dataset Config if existing
          const ds = initialData.datasetConfig || {};
          setRepoId(ds.repo_id || '');
          setSingleTask(ds.single_task || '');
          if (typeof ds.fps === 'number') setFps(ds.fps);

        } else {
          // Defaults if creating new
          if (loadedConfigs.length > 0) setSelectedConfigId(loadedConfigs[0].id);
          if (loadedSkills.length > 0) setSelectedSkillId(loadedSkills[0].id);

          const username = await (window as any).electronAPI?.getUsername?.() || 'user';
          setRepoId(`${username}/new-dataset`);
          // Try to set single task from skill if selected
          if (loadedSkills.length > 0) setSingleTask(loadedSkills[0].name);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();

    // Listeners
    const offStopped = (window as any).electronAPI?.onSimulationStopped
      ? (window as any).electronAPI.onSimulationStopped(() => {
        setSimRunning(false);
        setSimStreamUrl(null);
      })
      : null;

    return () => {
      if (offStopped) offStopped();
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (configs.length === 0) return;
    refreshConfigStatuses(configs);
  }, [configs]);

  // Fetch Cameras when Config changes
  useEffect(() => {
    if (!selectedConfigId) {
      setCameras([]);
      return;
    }
    const fetchCameras = async () => {
      try {
        // Join configCameras and cameras
        const result = await db.select({
          camera: camerasTable
        })
          .from(configCamerasTable)
          .innerJoin(camerasTable, eq(configCamerasTable.cameraId, camerasTable.id))
          .where(eq(configCamerasTable.configurationId, selectedConfigId));

        setCameras(result.map(r => r.camera));
      } catch (e) {
        console.error("Failed to fetch cameras", e);
      }
    };
    fetchCameras();
  }, [selectedConfigId]);


  // Timer logic
  useEffect(() => {
    if (recording) {
      recordingStartTime.current = Date.now();
      timerRef.current = setInterval(() => {
        const diff = Date.now() - (recordingStartTime.current || 0);
        const secs = Math.floor(diff / 1000);
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        setRecordingDuration(`${m}:${s}`);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingDuration('00:00');
    }
  }, [recording]);

  // Actions
  const handleStartSimulation = async () => {
    if (!selectedConfigId) return;

    try {
      const snapshot = await getRobotConfigurationSnapshot(selectedConfigId);
      if (!snapshot) return;

      const follower = snapshot.robots[0];
      const teleop = snapshot.teleoperators[0];

      const cameras: Record<string, any> = {};
      snapshot.cameras.forEach((c: any) => {
        cameras[c.name] = { ...c.data, ...c._snapshot };
      });

      const recordConfig: any = {
        repo_id: repoId,
        single_task: singleTask,
        fps: fps,
        robot: {
          type: (follower as any)?.model?.dirName,
          cameras,
          ...(follower?.data || {}),
          ...(follower?._snapshot || {})
        }
      };

      if (teleop) {
        recordConfig.teleop = {
          type: TELEOP_TYPE_MAP[(teleop as any).className],
          ...(teleop?.data || {}),
          ...(teleop?._snapshot || {})
        };
      }

      const res = await (window as any).electronAPI?.startSimulation(recordConfig);
      if (res && res.ok) {
        setSimRunning(true);
        if (res.wsUrl) setSimStreamUrl(res.wsUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopSimulation = async () => {
    try {
      await (window as any).electronAPI?.stopSimulation();
      setSimRunning(false);
      setSimStreamUrl(null);
    } catch (e) { console.error(e); }
  };

  const handleResetSimulation = async () => {
    await handleStopSimulation();
    // Short delay to ensure cleanup?
    setTimeout(handleStartSimulation, 500);
  };

  const handleRecordToggle = () => {
    if (recording) {
      // Stop
      setRecording(false);
      // Add pending episode (in UI only until annotated/saved)
      const newEp = {
        id: 'temp-' + Date.now(),
        name: 'New Episode',
        status: 'pending',
        duration: recordingDuration,
        timestamp: new Date().toLocaleTimeString(),
        isTemp: true
      };
      setEpisodes(prev => [...prev, newEp]);
    } else {
      // Start
      setRecording(true);
    }
  };

  const annotateEpisode = async (status: 'success' | 'failure') => {
    // Find last episode
    const lastIdx = episodes.length - 1;
    if (lastIdx < 0) return;
    const lastEp = episodes[lastIdx];

    // Update local state
    const newEps = [...episodes];
    newEps[lastIdx] = { ...lastEp, status, name: `Episode ${episodes.length} [${status}]` };
    setEpisodes(newEps);

    // Persist if we have session ID
    if (initialData?.id) {
      try {
        await db.insert(episodesTable).values({
          name: `Episode ${newEps[lastIdx].timestamp} [${status}]`,
          sessionId: initialData.id
        });
        // Reload? Or just assume success.
      } catch (e) {
        console.error("Failed to save episode", e);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedConfigId || !selectedSkillId) return;
    setSaving(true);
    try {
      const snapshot = await getRobotConfigurationSnapshot(selectedConfigId);

      const datasetConfig = {
        repo_id: repoId,
        single_task: singleTask,
        fps: fps,
        // Default other fields that schema requires or we want
        root: null,
        video: true,
        push_to_hub: true
      };

      const payload = {
        id: initialData?.id,
        name: sessionName,
        robotConfigurationId: selectedConfigId,
        skillId: selectedSkillId,
        datasetConfig,
        robotConfigSnapshot: snapshot
      };

      onSaved(payload);
    } catch (e) {
      console.error('Failed to save session', e);
    } finally {
      setSaving(false);
    }
  };

  // Logic to start real cameras if available
  const activeCameras = cameras.filter(c => c.modality === 'real');
  const hasRealCameras = activeCameras.length > 0;

  // Start cameras effect (naive: start all real cameras when config is selected)
  useEffect(() => {
    const startCams = async () => {
      const newStreams: { [key: number]: string } = {};
      for (const cam of activeCameras) {
        // Assumption: cam.data contains 'path' or we use serialNumber to find path?
        // Usually path is needed. Let's assume cam.data.path exists or we scan. 
        // Since we can't easily scan map here without more info, we'll try to use serial or data.path.
        // For now, let's assume 'data.path' is stored when camera was added.
        const path = (cam.data as any)?.path || (cam.data as any)?.devicePath;
        if (path) {
          try {
            const res = await (window as any).electronAPI.startCamera(path);
            if (res && res.ok && res.wsUrl) {
              newStreams[cam.id] = res.wsUrl;
            }
          } catch (e) {
            console.error(`Failed to start camera ${cam.name}`, e);
          }
        }
      }
      setCameraStreams(newStreams);
    };

    if (hasRealCameras) {
      startCams();
    }

    return () => {
      // Cleanup streams? usage of stopVideo
    };
  }, [cameras]);


  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top Bar */}
      <header className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <TextField
              label="Session Name"
              variant="standard"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="Enter Session Name"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-64">
            <RobotConfigurationDropdown
              configs={configs}
              selectedConfigId={selectedConfigId}
              statusMap={configStatusMap}
              onSelect={(id) => setSelectedConfigId(id)}
            />
          </div>
          <div className="w-64">
            <Select
              label="Skill"
              value={selectedSkillId ? String(selectedSkillId) : ''}
              onChange={(e) => setSelectedSkillId(Number(e.target.value))}
              options={skills.map(s => ({ label: s.name, value: String(s.id) }))}
            />
          </div>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Session'}
          </Button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto">

          {/* Dataset Configuration */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dataset</h3>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1 font-medium">Repo ID</label>
              <input
                className="px-2 py-1.5 rounded border border-gray-300 text-xs w-full focus:ring-1 focus:ring-blue-500 outline-none"
                value={repoId}
                onChange={e => setRepoId(e.target.value)}
                placeholder="username/dataset-name"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1 font-medium">Task Description</label>
              <input
                className="px-2 py-1.5 rounded border border-gray-300 text-xs w-full focus:ring-1 focus:ring-blue-500 outline-none"
                value={singleTask} // Changed from description to singleTask
                onChange={e => setSingleTask(e.target.value)}
                placeholder="e.g. Pick the cube"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1 font-medium">FPS</label>
              <select
                className="px-2 py-1.5 rounded border border-gray-300 text-xs w-full bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                value={fps}
                onChange={e => setFps(Number(e.target.value))}
              >
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
                <option value={15}>15 FPS</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Simulation Controls */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Simulation</h3>
            <Button
              variant={simRunning ? "ghost" : "primary"}
              className="w-full justify-center gap-2"
              onClick={simRunning ? handleStopSimulation : handleStartSimulation}
            >
              {simRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {simRunning ? "Pause Sim" : "Start Sim"}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900"
              onClick={handleResetSimulation}
              disabled={!simRunning}
            >
              <RefreshCw className="w-4 h-4" /> Reset Sim
            </Button>
          </div>

          <hr className="border-gray-200" />

          {/* Recording Controls */}
          <div className={`space-y-3 p-4 rounded-lg border text-center transition-colors ${recording ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recording</h3>
            <div className="text-2xl font-mono font-bold text-gray-900 mb-2">
              {recordingDuration}
            </div>
            <Button
              variant={recording ? "danger" : "danger"}
              className="w-full justify-center gap-2"
              onClick={handleRecordToggle}
            >
              {recording ? <Stop className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              {recording ? "Stop Rec" : "Record"}
            </Button>
          </div>

          {/* Annotation Controls */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Episode Annotation</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border border-green-200"
                onClick={() => annotateEpisode('success')}
              >
                <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs">Success</span>
              </Button>
              <Button
                variant="ghost"
                className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-200"
                onClick={() => annotateEpisode('failure')}
              >
                <XCircle className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs">Failure</span>
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center">Annotate last episode</p>
          </div>

        </div>

        {/* Right Area: Camera Views */}
        <div className="flex-1 bg-gray-100 p-4">
          {cameras.length === 0 && !simStreamUrl && (
            <div className="h-full flex items-center justify-center text-gray-400">
              No cameras configured or simulation stopped.
            </div>
          )}

          <div className={`grid gap-4 h-full ${cameras.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {cameras.map(cam => {
              const isSim = cam.modality === 'simulated';
              const camLabel = cam.name || `Camera ${cam.id}`;
              const camPath = (cam.data as any)?.path || (cam.data as any)?.devicePath || (cam.data as any)?.rtspUrl || (cam.data as any)?.url;

              if (isSim) {
                return (
                  <div key={cam.id} className="bg-black relative rounded-lg overflow-hidden flex items-center justify-center border border-gray-800 shadow-sm group">
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10">{camLabel}</div>

                    <button
                      onClick={() => (window as any).electronAPI.openVideoWindow('simulation')}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded shadow-sm backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 z-20"
                      title="Open in new window"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    {simStreamUrl ? (
                      <VideoPlayer url={simStreamUrl} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-white/50 text-sm">Simulation not running</div>
                    )}
                  </div>
                );
              }

              return (
                <div key={cam.id} className="bg-black relative rounded-lg overflow-hidden flex items-center justify-center border border-gray-800 shadow-sm">
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">{camLabel}</div>
                  {cameraStreams[cam.id] ? (
                    <VideoPlayer url={cameraStreams[cam.id]} className="w-full h-full object-contain" />
                  ) : camPath ? (
                    <div className="text-white/50 text-sm">Connecting...</div>
                  ) : (
                    <div className="text-white/50 text-sm">No device path</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Area: Episodes */}
      <div className="h-64 bg-white border-t border-gray-200 overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between sticky top-0">
          <h3 className="font-semibold text-gray-700 text-sm">Session Episodes</h3>
          <span className="text-xs text-gray-500">{episodes.length} episodes</span>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {episodes.map((ep, idx) => (
              <tr key={ep.id || idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ep.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ep.timestamp || ep.createdAt}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ep.duration}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ep.status === 'success' ? 'bg-green-100 text-green-800' :
                    ep.status === 'failure' ? 'bg-red-100 text-red-800' :
                      ep.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                    {ep.status || 'Unknown'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {episodes.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">No episodes recorded in this session yet.</div>
        )}
      </div>
    </div>
  );
};

export default SessionForm;
