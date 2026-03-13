import React, { useState, useEffect, useRef } from 'react';
import { Tabs, Tab, Box, Grid, Typography } from '@mui/material';
import { db } from '../db/db';
import { eq } from 'drizzle-orm';
import { getSceneSnapshot } from '../db/selectors';
import {
  scenesTable,
  skillsTable,
  sceneRobotsTable,
  sceneTeleoperatorsTable,
  robotsTable,
  episodesTable
} from '../db/schema';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import Badge from '../ui/Badge';
import { useToast } from '../ui/ToastContext';
import { Play, CheckCircle, ChevronRight, Pause, Stop, RefreshCw, XCircle, Circle } from '../icons';
import { MuJoCoSimView } from '../ui/MuJoCoSimView';
import type { MuJoCoSimViewHandle } from '../ui/MuJoCoSimView';
import { MujocoSimulation } from '../lib/MujocoSimulation';
import type { CameraSpec, ObservationData, SimulationState } from '../lib/MujocoSimulation';
import { SimDatasetRecorder } from '../lib/SimDatasetRecorder';
import { normalizeCameraList } from '../types/camera';

type SceneStatus = {
  ready: boolean;
  issues: string[];
  mode: 'sim' | 'real' | 'mixed' | 'unknown';
  cameraCount: number;
  robotCount: number;
  teleopCount: number;
};

const TAB_RECORD = 0;
const TAB_SETTINGS = 1;
const TAB_EPISODES = 2;

interface SceneDropdownProps {
  scenes: Record<string, unknown>[];
  selectedSceneId: number | null;
  statusMap: Record<number, SceneStatus>;
  onSelect: (id: number) => void;
}

const SceneDropdown: React.FC<SceneDropdownProps> = ({ scenes, selectedSceneId, statusMap, onSelect }) => {
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

  const selectedScene = scenes.find(c => c.id === selectedSceneId);
  const selectedStatus = selectedScene ? statusMap[selectedScene.id] : undefined;

  const renderBadges = (status?: SceneStatus) => {
    if (!status) return null;
    const issueText = status.issues.length > 0 ? status.issues.join(', ') : undefined;
    return (
      <>
        {status.mode === 'sim' && <Badge color="blue">simulated</Badge>}
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
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Scene</label>
      <div className="relative cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center min-h-[38px]">
          {selectedScene ? (
            <div className="flex items-center flex-wrap gap-1">
              <span className="font-medium">{selectedScene.name}</span>
              {renderBadges(selectedStatus)}
            </div>
          ) : (
            <span className="text-gray-500">Select scene...</span>
          )}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
          <ChevronRight className="h-4 w-4 rotate-90" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {scenes.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">No scenes found</div>
          )}
          {scenes.map(scn => {
            const status = statusMap[scn.id];
            return (
              <div
                key={scn.id}
                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 flex items-center justify-between"
                onClick={() => { onSelect(scn.id); setIsOpen(false); }}
              >
                <div className="flex items-center flex-wrap gap-1">
                  <span className="font-normal block truncate">{scn.name}</span>
                  {renderBadges(status)}
                </div>
                {selectedSceneId === scn.id && <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface Props {
  _onCancel?: () => void;
  onSaved: (item: Record<string, unknown>) => void;
  initialData?: Record<string, unknown>;
}

export const DatasetForm: React.FC<Props> = ({ _onCancel, onSaved, initialData }) => {
  const toast = useToast();
  // State
  const [datasetName, setDatasetName] = useState('');
  const [scenes, setScenes] = useState<Record<string, unknown>[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [sceneStatusMap, setSceneStatusMap] = useState<Record<number, SceneStatus>>({});
  const [, setSerialPorts] = useState<Record<string, unknown>[]>([]);
  const [skills, setSkills] = useState<Record<string, unknown>[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);

  const [cameras, setCameras] = useState<Record<string, unknown>[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  const [recording, setRecording] = useState(false);

  // WASM simulation instances
  const simRef = useRef<MujocoSimulation | null>(null);
  const recorderRef = useRef<SimDatasetRecorder | null>(null);
  const simViewRef = useRef<MuJoCoSimViewHandle | null>(null);
  const [simInitialising, setSimInitialising] = useState(false);


  const [episodes, setEpisodes] = useState<Record<string, unknown>[]>([]);
  const [_loadingInitial, setLoadingInitial] = useState(true);
  const [tabValue, setTabValue] = useState(TAB_RECORD);
  const [datasetRobotModality, setDatasetRobotModality] = useState<'real' | 'simulated'>('simulated');

  // Dataset Config
  const [repoId, setRepoId] = useState('');
  const [datasetDir, setDatasetDir] = useState('');
  const [singleTask, setSingleTask] = useState('');
  const [fps, setFps] = useState<number>(30);
  const [saving, setSaving] = useState(false);
  const [datasetDirManuallySet, setDatasetDirManuallySet] = useState(false);

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<{ message: string; traceback?: string } | null>(null);

  useEffect(() => {
    if (initialData) {
      setDatasetName(initialData.name || '');
      setSelectedSkillId(initialData.skillId || null);
      if (initialData.sceneId) setSelectedSceneId(initialData.sceneId);
      if (initialData.datasetConfig) {
        setRepoId(initialData.datasetConfig.repo_id || '');
        setSingleTask(initialData.datasetConfig.single_task || '');
        setFps(initialData.datasetConfig.fps || 30);
      }
      setDatasetDir(initialData.datasetDir || '');
      setDatasetDirManuallySet(Boolean(initialData.datasetDir));
    }
  }, [initialData]);

  const resolveDefaultDatasetDir = async (nextRepoId: string) => {
    if (!window.electronAPI?.getDefaultDatasetDir) return;
    if (!nextRepoId || !nextRepoId.trim()) return;
    try {
      const defaultDir = await window.electronAPI.getDefaultDatasetDir(nextRepoId);
      if (defaultDir) {
        setDatasetDir(defaultDir);
      }
    } catch (e) {
      console.error('Failed to resolve default dataset directory', e);
    }
  };

  const handleChooseDatasetDir = async () => {
    try {
      const selected = await window.electronAPI?.selectDatasetDirectory?.();
      if (selected) {
        setDatasetDir(selected);
        setDatasetDirManuallySet(true);
      }
    } catch (e) {
      console.error('Failed to choose dataset directory', e);
    }
  };

  useEffect(() => {
    if (!repoId) return;
    if (datasetDirManuallySet && datasetDir) return;
    resolveDefaultDatasetDir(repoId);
  }, [repoId, datasetDirManuallySet]);

  // Simulation error handling is done via the MujocoSimulation.onError callback
  // when the sim is started (see handleStartSimulation).

  // Timers and refs
  const recordingStartTime = useRef<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState('00:00');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const scanSerialPorts = async () => {
    try {
      const ports = await window.electronAPI?.scanSerialPorts?.();
      const list = ports || [];
      setSerialPorts(list);
      return list;
    } catch (e) {
      console.error('Failed to scan serial ports', e);
      setSerialPorts([]);
      return [];
    }
  };

  const isCameraConnected = (cam: Record<string, unknown>) => {
    const data = cam?.data || {};
    return Boolean(data.path || data.devicePath || data.rtspUrl || data.url);
  };

  const computeSceneStatus = async (
    sceneId: number,
    getPorts: () => Promise<Record<string, unknown>[]>
  ): Promise<SceneStatus> => {
    const [robotRows, sceneRows, teleopRows] = await Promise.all([
      db.select({ robot: robotsTable })
        .from(sceneRobotsTable)
        .innerJoin(robotsTable, eq(sceneRobotsTable.robotId, robotsTable.id))
        .where(eq(sceneRobotsTable.sceneId, sceneId)),
      db.select().from(scenesTable).where(eq(scenesTable.id, sceneId)).limit(1),
      db.select().from(sceneTeleoperatorsTable)
        .where(eq(sceneTeleoperatorsTable.sceneId, sceneId))
    ]);

    const robots = robotRows.map(r => r.robot);
    const cameras = normalizeCameraList(sceneRows[0]?.data && (sceneRows[0].data as Record<string, unknown>).cameras);
    const teleops = teleopRows;

    const hasRobot = robots.length > 0;
    const hasCameras = cameras.length > 0;
    const hasTeleop = teleops.length > 0;

    const hasRealItems = robots.some(r => r.modality === 'real') || cameras.some(c => c.modality === 'real');
    const hasSimItems = robots.some(r => r.modality === 'simulated') || cameras.some(c => c.modality === 'simulated');
    const mode: SceneStatus['mode'] = hasRealItems && hasSimItems ? 'mixed' : hasRealItems ? 'real' : hasSimItems ? 'sim' : 'unknown';

    const allRobotsSim = hasRobot && robots.every(r => r.modality === 'simulated');
    const allCamerasSim = hasCameras && cameras.every(c => c.modality === 'simulated');
    const isSimSceneReady = hasRobot && hasCameras && hasTeleop && allRobotsSim && allCamerasSim;

    const issues: string[] = [];

    if (isSimSceneReady) {
      return {
        ready: true,
        issues,
        mode,
        cameraCount: cameras.length,
        robotCount: robots.length,
        teleopCount: teleops.length
      };
    }

    if (!hasRobot) issues.push('This scene is missing a robot.');
    if (!hasCameras) issues.push('This scene is missing cameras.');
    if (!hasTeleop) issues.push('This scene is missing a teleoperator mode.');

    // Only scan serial ports when we actually need to validate real hardware connectivity.
    const needsPortCheck =
      robots.some(r => r.modality === 'real') ||
      teleops.some((t: Record<string, unknown>) => (t.snapshot || {}).type === 'real');
    const ports = needsPortCheck ? await getPorts() : [];

    const realRobotDisconnected = robots
      .filter(r => r.modality === 'real')
      .some(r => !r.serialNumber || !ports.some((p: Record<string, unknown>) => p.serialNumber && r.serialNumber === p.serialNumber));
    if (realRobotDisconnected) issues.push('real robot not connected');

    const realCameraDisconnected = cameras
      .filter(c => c.modality === 'real')
      .some(c => !isCameraConnected(c));
    if (realCameraDisconnected) issues.push('real camera not connected');

    const teleopDisconnected = teleops.some((t: Record<string, unknown>) => {
      const snap = t.snapshot || {};
      if (snap.type !== 'real') return false;
      const cfg = snap.config || {};
      const serial = cfg.serialNumber;
      const path = cfg.path;
      if (!serial && !path) return true;
      if (serial && ports.some((p: Record<string, unknown>) => p.serialNumber === serial)) return false;
      if (path && ports.some((p: Record<string, unknown>) => p.path === path)) return false;
      return true;
    });
    if (teleopDisconnected) issues.push('teleoperator not connected');

    const ready = hasRobot && hasCameras && !realRobotDisconnected && !realCameraDisconnected && !teleopDisconnected;

    return {
      ready,
      issues,
      mode,
      cameraCount: cameras.length,
      robotCount: robots.length,
      teleopCount: teleops.length
    };
  };

  const refreshSceneStatuses = async (sceneList: Record<string, unknown>[]) => {
    if (!sceneList || sceneList.length === 0) {
      setSceneStatusMap({});
      return {};
    }
    const nextMap: Record<number, SceneStatus> = {};

    let portsPromise: Promise<Record<string, unknown>[]> | null = null;
    const getPorts = () => {
      if (!portsPromise) portsPromise = scanSerialPorts();
      return portsPromise;
    };

    for (const scn of sceneList) {
      try {
        nextMap[scn.id] = await computeSceneStatus(scn.id, getPorts);
      } catch (e) {
        console.error('Failed to compute scene status', e);
        nextMap[scn.id] = {
          ready: false,
          issues: ['status unavailable'],
          mode: 'unknown',
          cameraCount: 0,
          robotCount: 0,
          teleopCount: 0
        };
      }
    }

    setSceneStatusMap(nextMap);
    return nextMap;
  };

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedScenes, loadedSkills] = await Promise.all([
          db.select().from(scenesTable),
          db.select().from(skillsTable)
        ]);
        setScenes(loadedScenes);
        setSkills(loadedSkills);

        // Pre-select if initialData
        if (initialData) {
          setDatasetName(initialData.name);
          setSelectedSceneId(initialData.sceneId);
          setSelectedSkillId(initialData.skillId);
          // Load episodes for dataset
          if (initialData.id) {
            const eps = await db.select().from(episodesTable).where(eq(episodesTable.datasetId, initialData.id));
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
          if (initialData.datasetDir) {
            setDatasetDir(initialData.datasetDir);
            setDatasetDirManuallySet(true);
          } else if (ds.repo_id) {
            resolveDefaultDatasetDir(ds.repo_id);
          }

        } else {
          // Defaults if creating new
          if (loadedScenes.length > 0) setSelectedSceneId(loadedScenes[0].id);
          if (loadedSkills.length > 0) setSelectedSkillId(loadedSkills[0].id);

          const username = await window.electronAPI?.getUsername?.() || 'user';
          const defaultRepoId = `${username}/new-dataset`;
          setRepoId(defaultRepoId);
          resolveDefaultDatasetDir(defaultRepoId);
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

    return () => {
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (scenes.length === 0) return;
    refreshSceneStatuses(scenes);
  }, [scenes]);

  // Fetch Cameras when Scene changes
  useEffect(() => {
    if (!selectedSceneId) {
      setCameras([]);
      return;
    }
    const fetchCameras = async () => {
      try {
        const [scene] = await db.select().from(scenesTable).where(eq(scenesTable.id, selectedSceneId)).limit(1);
        setCameras(normalizeCameraList(scene?.data && (scene.data as Record<string, unknown>).cameras));
      } catch (e) {
        console.error("Failed to fetch cameras", e);
      }
    };
    fetchCameras();
  }, [selectedSceneId]);

  useEffect(() => {
    if (!selectedSceneId) {
      setDatasetRobotModality('simulated');
      return;
    }

    const loadSceneRobotModality = async () => {
      try {
        const robotRows = await db
          .select({ robot: robotsTable })
          .from(sceneRobotsTable)
          .innerJoin(robotsTable, eq(sceneRobotsTable.robotId, robotsTable.id))
          .where(eq(sceneRobotsTable.sceneId, selectedSceneId));

        const firstRobot = robotRows[0]?.robot;
        if (firstRobot?.modality === 'real') {
          setDatasetRobotModality('real');
        } else {
          setDatasetRobotModality('simulated');
        }
      } catch (e) {
        console.error('Failed to load scene robot modality', e);
        setDatasetRobotModality('simulated');
      }
    };

    loadSceneRobotModality();
  }, [selectedSceneId]);


  // Timer logic

  useEffect(() => {
    if (recording) {
      if (!recordingStartTime.current) {
        recordingStartTime.current = Date.now();
      }

      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!recordingStartTime.current) return;
        const elapsedMs = Date.now() - recordingStartTime.current;
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setRecordingDuration(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      timerRef.current = null;
      recordingStartTime.current = null;
      setRecordingDuration('00:00');
    }

    return () => {
      clearInterval(timerRef.current);
    };
  }, [recording]);

  const checkSceneReadiness = async () => {
    if (!selectedSceneId) {
       toast.error('No scene selected');
       return false;
    }

    let status: SceneStatus | undefined;
    try {
      status = await computeSceneStatus(selectedSceneId, scanSerialPorts);
      setSceneStatusMap((prev) => ({ ...prev, [selectedSceneId]: status! }));
    } catch (e) {
      console.error('Failed to compute selected scene status', e);
      status = undefined;
    }

    if (!status || !status.ready) {
      setErrorMessage({
        message: 'Scene is not ready',
        traceback: status?.issues?.join('\n') || 'Status unavailable'
      });
      setErrorModalOpen(true);
      return false;
    }
    return true;
  };

  const handleStartSimulation = async () => {
    if (!(await checkSceneReadiness())) return;
    if (!selectedSceneId) return;
    if (simInitialising) return;

    setSimInitialising(true);
    try {
      const snapshot = await getSceneSnapshot(selectedSceneId);
      if (!snapshot) return;

      const follower = snapshot.robots[0];

      // Only custom simulated robots with model XML are supported
      const isCustomSimulated = follower?.modality === 'simulated'
        && follower?.model?.className === 'GenericMujocoEnv'
        && (follower?.model?.modelXml || follower?.model?.modelPath);

      if (!isCustomSimulated) {
        throw new Error('Only custom simulated robots with model XML are supported');
      }

      // Build camera specs from snapshot
      const cameraSpecs: CameraSpec[] = snapshot.cameras.map((c: Record<string, unknown>) => {
        const rawData = c.data?.mujoco || c.data || {};
        const pose = c.pose || {};
        const pos = pose.pos || rawData.pos || [0, 0, 0];
        const quat = pose.quat || rawData.quat;
        const xyaxes = pose.xyaxes || rawData.xyaxes;

        return {
          name: c.name || `camera_${c.id}`,
          pos,
          quat,
          xyaxes,
          euler: rawData.euler,
          target: rawData.target,
          fovy: rawData.fovy,
          width: parseInt(c.resolution?.split('x')[0]) || 128,
          height: parseInt(c.resolution?.split('x')[1]) || 128,
        };
      });

      const modelProps: Record<string, unknown> = follower.model.properties || {};

      // Create and initialise the WASM simulation
      const sim = new MujocoSimulation();
      await sim.init({
        modelXml: follower.model.modelXml,
        cameras: cameraSpecs,
        homePosition: modelProps.homePosition || undefined,
        controlDt: 0.02,
        physicsDt: 0.002,
      });

      // Set up error handler
      sim.onError = (error) => {
        setErrorMessage({ message: error.message });
        setErrorModalOpen(true);
        setSimRunning(false);
      };

      simRef.current = sim;

      // Create dataset recorder
      const recorder = new SimDatasetRecorder(sim, {
        fps,
        taskDescription: singleTask || 'manipulation',
        cameraNames: cameraSpecs.map(c => c.name),
      });
      recorderRef.current = recorder;

      sim.start();
      setSimRunning(true);
    } catch (e) {
      console.error(e);
      setErrorMessage({
        message: e instanceof Error ? e.message : String(e),
      });
      setErrorModalOpen(true);
    } finally {
      setSimInitialising(false);
    }
  };

  const handleStopSimulation = async () => {
    try {
      const sim = simRef.current;
      if (sim) {
        sim.dispose();
        simRef.current = null;
      }
      recorderRef.current = null;
      setSimRunning(false);
    } catch (e) { console.error(e); }
  };

  const handleResetSimulation = async () => {
    const sim = simRef.current;
    if (sim) {
      sim.reset();
    }
  };

  const handleRecordToggle = async () => {
    if (recording) {
      // Stop recording — finalise current episode
      const recorder = recorderRef.current;
      if (recorder) {
        const summary = recorder.finishEpisode('pending');
        const newEp = {
          id: 'temp-' + Date.now(),
          name: summary ? `Episode ${summary.index}` : 'New Episode',
          status: 'pending' as const,
          duration: recordingDuration,
          timestamp: new Date().toLocaleTimeString(),
          isTemp: true
        };
        setEpisodes(prev => [...prev, newEp]);
      }
      setRecording(false);
    } else {
      // Start recording
      if (!(await checkSceneReadiness())) return;
      const recorder = recorderRef.current;
      const sim = simRef.current;
      if (!recorder || !sim) {
        toast.error('Start the simulation first before recording');
        return;
      }

      // Hook onStep to capture frames while recording
      const canvas = simViewRef.current?.getCanvas() ?? undefined;
      recorder.startRecording(canvas);

      sim.onStep = (obs: ObservationData, state: SimulationState) => {
        recorder.recordFrame(obs, state);
      };

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

    // Update recorder
    recorderRef.current?.annotateLastEpisode(status);

    // Persist if we have dataset ID
    if (initialData?.id) {
      try {
        await db.insert(episodesTable).values({
          name: `Episode ${newEps[lastIdx].timestamp} [${status}]`,
          datasetId: initialData.id
        });
      } catch (e) {
        console.error("Failed to save episode", e);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedSceneId) return;
    setSaving(true);
    try {
      const snapshot = await getSceneSnapshot(selectedSceneId);

      const datasetConfig = {
        repo_id: repoId,
        single_task: singleTask,
        fps: fps,
        // Default other fields that schema requires or we want
        root: datasetDir || null,
        dataset_dir: datasetDir,
        video: true,
        push_to_hub: true
      };

      const payload = {
        id: initialData?.id,
        name: datasetName,
        sceneId: selectedSceneId,
        skillId: selectedSkillId,
        datasetDir: datasetDir,
        datasetConfig,
        sceneSnapshot: snapshot,
      };

      await onSaved(payload);
    } catch (e) {
      toast.error('Failed to save dataset: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const cameraCount = cameras.length;
  const videoGridClass = cameraCount <= 1
    ? 'grid-cols-1'
    : cameraCount <= 4
      ? 'grid-cols-2'
      : 'grid-cols-3';

  // Cleanup simulation objects on unmount
  useEffect(() => {
    return () => {
      try {
        simRef.current?.dispose();
      } catch (e) {
        console.error('Failed to dispose simulation during unmount', e);
      }
      simRef.current = null;
      recorderRef.current = null;
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top Bar */}
      <header className="bg-white px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <Input
              label="Dataset Name"
              value={datasetName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDatasetName(e.target.value)}
              placeholder="Enter Dataset Name"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Dataset'}
          </Button>
        </div>
      </header>

      <Box className="px-4 bg-white">
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Record / Simulate" />
          <Tab label="Settings" />
          <Tab label="Dataset Episodes" />
        </Tabs>
      </Box>

      {/* Main Area */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {tabValue === TAB_SETTINGS && (
          <Box className="h-full overflow-y-auto p-4">
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <SceneDropdown
                  scenes={scenes}
                  selectedSceneId={selectedSceneId}
                  statusMap={sceneStatusMap}
                  onSelect={(id) => setSelectedSceneId(id)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Select
                  label="Skill"
                  value={selectedSkillId ? String(selectedSkillId) : ''}
                  onChange={(e) => setSelectedSkillId(Number(e.target.value))}
                  options={skills.map(s => ({ label: s.name, value: String(s.id) }))}
                />
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle2" color="text.secondary">Dataset Configuration</Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Input
                  label="Repo ID"
                  value={repoId}
                  onChange={e => {
                    setRepoId(e.target.value);
                    if (!datasetDirManuallySet) {
                      setDatasetDir('');
                    }
                  }}
                  placeholder="username/dataset-name"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Input
                      label="Dataset Directory"
                      value={datasetDir}
                      onChange={e => {
                        setDatasetDir(e.target.value);
                        setDatasetDirManuallySet(true);
                      }}
                      placeholder="Select local dataset directory"
                    />
                  </Grid>
                  <Grid size={12}>
                    <Button
                      variant="ghost"
                      className="w-full justify-center"
                      onClick={handleChooseDatasetDir}
                    >
                      Browse Directory
                    </Button>
                  </Grid>
                </Grid>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Input
                  label="Task Description"
                  value={singleTask}
                  onChange={e => setSingleTask(e.target.value)}
                  placeholder="e.g. Pick the cube"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Select
                  label="FPS"
                  value={fps}
                  onChange={e => setFps(Number(e.target.value))}
                  options={[
                    { label: '30 FPS', value: 30 },
                    { label: '60 FPS', value: 60 },
                    { label: '15 FPS', value: 15 }
                  ]}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {tabValue === TAB_RECORD && (
          <div className="h-full flex overflow-hidden">
            <div className="w-72 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto">
              {datasetRobotModality === 'simulated' ? (
                <>
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
                </>
              ) : (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  Real robot dataset mode. Simulation controls are hidden.
                </div>
              )}

              <div className={`space-y-3 p-4 rounded-lg border text-center transition-colors ${recording ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recording</h3>
                <div className="text-2xl font-mono font-bold text-gray-900 mb-2">
                  {recordingDuration}
                </div>
                <Button
                  variant="danger"
                  className="w-full justify-center gap-2"
                  onClick={handleRecordToggle}
                >
                  {recording ? <Stop className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  {recording ? "Stop Rec" : "Record"}
                </Button>
              </div>

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

            <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
              {cameras.length === 0 && !simRunning && (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No cameras configured or simulation stopped.
                </div>
              )}

              <div className={`grid gap-4 h-full ${videoGridClass}`}>
                {cameras.map(cam => {
                  const isSim = cam.modality === 'simulated';
                  const camLabel = cam.name || `Camera ${cam.id}`;
                  const camPath = (cam.data as Record<string, unknown>)?.path || (cam.data as Record<string, unknown>)?.devicePath || (cam.data as Record<string, unknown>)?.rtspUrl || (cam.data as Record<string, unknown>)?.url;

                  if (isSim) {
                    return (
                      <div key={cam.id} className="bg-black relative rounded-lg overflow-hidden flex items-center justify-center border border-gray-800 shadow-sm">
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10 flex items-center gap-1">
                          {camLabel}
                          {(cam.data as Record<string, unknown>)?.source === 'xml' && <span className="bg-purple-600 px-1 rounded text-[10px] uppercase font-bold">XML</span>}
                        </div>

                        {simRunning && simRef.current ? (
                          <MuJoCoSimView
                            ref={simViewRef}
                            simulation={simRef.current}
                            className="w-full h-full"
                          />
                        ) : (
                          <div className="text-white/50 text-sm">Simulation not running</div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={cam.id} className="bg-black relative rounded-lg overflow-hidden flex items-center justify-center border border-gray-800 shadow-sm">
                      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">{camLabel}</div>
                      {camPath ? (
                        <div className="text-white/50 text-sm">Real camera preview unavailable in renderer-only mode</div>
                      ) : (
                        <div className="text-white/50 text-sm">No device path</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tabValue === TAB_EPISODES && (
          <div className="h-full bg-white overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between sticky top-0">
              <h3 className="font-semibold text-gray-700 text-sm">Dataset Episodes</h3>
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
              <div className="p-8 text-center text-sm text-gray-500">No episodes recorded in this dataset yet.</div>
            )}
          </div>
        )}
      </div>

      {errorModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto flex flex-col gap-4 shadow-xl">
            <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {errorMessage?.message === 'Scene is not ready' ? 'Cannot Start Recording' : 'Simulation Error'}
            </h2>
            <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto text-gray-800">
              <div className="font-semibold mb-2">{errorMessage?.message}</div>
              {errorMessage?.traceback && (
                <div className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">{errorMessage.traceback}</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setErrorModalOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatasetForm;
