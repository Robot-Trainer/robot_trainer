import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db/db';
import { eq } from 'drizzle-orm';
import {
  robotConfigurationsTable,
  skillsTable,
  configCamerasTable,
  camerasTable,
  episodesTable,
  sessionsTable
} from '../db/schema';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Play, Session, CheckCircle } from '../icons';
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
  const [skills, setSkills] = useState<any[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);

  const [cameras, setCameras] = useState<any[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  const [recording, setRecording] = useState(false);

  // Map cameraId -> wsUrl
  const [cameraStreams, setCameraStreams] = useState<{ [key: number]: string }>({});
  const [simStreamUrl, setSimStreamUrl] = useState<string | null>(null);

  const [episodes, setEpisodes] = useState<any[]>([]);

  // Timers and refs
  const recordingStartTime = useRef<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState('00:00');
  const timerRef = useRef<any>(null);

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
        } else {
          // Defaults
          if (loadedConfigs.length > 0) setSelectedConfigId(loadedConfigs[0].id);
          if (loadedSkills.length > 0) setSelectedSkillId(loadedSkills[0].id);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
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
    try {
      const config = configs.find(c => c.id === selectedConfigId);
      // We pass some dummy config for now, or real config if we had it
      const res = await (window as any).electronAPI?.startSimulation({
        // Pass relevant config params if available in your config object
      });
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
          <Button variant="ghost" onClick={onCancel}>← Back</Button>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-semibold uppercase">Session Name</label>
            <input
              className="border-b border-gray-300 focus:border-blue-500 outline-none text-lg font-medium text-gray-900 w-64"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="Enter Session Name"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-64">
            <Select
              label="Robot Configuration"
              value={selectedConfigId ? String(selectedConfigId) : ''}
              onChange={(e) => setSelectedConfigId(Number(e.target.value))}
              options={configs.map(c => ({ label: c.name, value: String(c.id) }))}
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
          <Button variant="primary" onClick={() => onSaved({
            id: initialData?.id,
            name: sessionName,
            robotConfigurationId: selectedConfigId,
            skillId: selectedSkillId
          })}>Save Session</Button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto">

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
            {/* 1. Simulation Stream (if active and running) */}
            {simStreamUrl && (
              <div className="bg-black relative rounded-lg overflow-hidden flex items-center justify-center border border-gray-800 shadow-sm">
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Simulation</div>
                <VideoPlayer url={simStreamUrl} className="w-full h-full object-contain" />
              </div>
            )}

            {/* 2. Real Camera Streams */}
            {activeCameras.map(cam => (
              <div key={cam.id} className="bg-black relative rounded-lg overflow-hidden flex items-center justify-center border border-gray-800 shadow-sm">
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">{cam.name}</div>
                {cameraStreams[cam.id] ? (
                  <VideoPlayer url={cameraStreams[cam.id]} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-white/50 text-sm">Connecting...</div>
                )}
              </div>
            ))}
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
