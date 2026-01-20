import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Pencil, Plus, CheckCircle } from '../icons';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import { camerasResource } from '../db/resources';

interface CameraEditorProps {
  camera: any;
  onSave: () => void;
  onCancel: () => void;
}

const CameraEditor: React.FC<CameraEditorProps> = ({ camera, onSave, onCancel }) => {
  const [name, setName] = useState(camera.name || '');
  const [serialNumber, setSerialNumber] = useState(camera.serialNumber || '');
  const [resolution, setResolution] = useState(camera.resolution || '1280x720');
  const [fps, setFps] = useState<number>(camera.fps || 30);

  // Simulation params
  const [posX, setPosX] = useState<number>(camera.positionX || 0);
  const [posY, setPosY] = useState<number>(camera.positionY || 0);
  const [posZ, setPosZ] = useState<number>(camera.positionZ || 0);
  const [rotX, setRotX] = useState<number>(camera.rotationX || 0);
  const [rotY, setRotY] = useState<number>(camera.rotationY || 0);
  const [rotZ, setRotZ] = useState<number>(camera.rotationZ || 0);

  const isReal = camera.modality === 'real';

  const handleSave = async () => {
    try {
      const updates: any = {
        name,
        serialNumber: isReal ? serialNumber : (camera.serialNumber || 'sim-cam-' + Date.now()),
        modality: isReal ? 'real' : 'simulated',
      };

      if (!isReal) {
        updates.resolution = resolution;
        updates.fps = fps;
        updates.positionX = posX;
        updates.positionY = posY;
        updates.positionZ = posZ;
        updates.rotationX = rotX;
        updates.rotationY = rotY;
        updates.rotationZ = rotZ;
      }
      // For real cameras, we preserve existing values or set defaults if needed, 
      // but UI doesn't allow changing them as requested.

      await camerasResource.update(camera.id, updates);
      onSave();
    } catch (e) {
      console.error("Failed to save camera", e);
      alert("Failed to save camera details");
    }
  };

  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4 shadow-sm relative">
      <h4 className="font-semibold text-sm text-gray-700">Edit {isReal ? 'Real' : 'Simulated'} Camera</h4>

      <Input
        label="Name"
        value={name}
        onChange={(e: any) => setName(e.target.value)}
        placeholder="e.g. Overhead Camera"
      />

      {isReal ? (
        <div className="space-y-4">
          <Input
            label="Serial Number"
            value={serialNumber}
            onChange={(e: any) => setSerialNumber(e.target.value)}
            placeholder="Device Serial Number"
          />
          <div className="text-xs text-gray-500">
            Resolution, FPS, and Position settings are not manually configurable for Real cameras.
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Resolution"
              value={resolution}
              onChange={(e: any) => setResolution(e.target.value)}
              options={[
                { label: '1280x720 (720p)', value: '1280x720' },
                { label: '1920x1080 (1080p)', value: '1920x1080' },
                { label: '640x480 (480p)', value: '640x480' },
                { label: 'Custom', value: 'custom' }
              ]}
            />
            <Input
              label="FPS"
              type="number"
              value={fps}
              onChange={(e: any) => setFps(parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Position (X, Y, Z)</label>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="X" type="number" step="0.01" value={posX} onChange={(e: any) => setPosX(parseFloat(e.target.value))} />
              <Input placeholder="Y" type="number" step="0.01" value={posY} onChange={(e: any) => setPosY(parseFloat(e.target.value))} />
              <Input placeholder="Z" type="number" step="0.01" value={posZ} onChange={(e: any) => setPosZ(parseFloat(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Rotation (Roll, Pitch, Yaw)</label>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="X (Roll)" type="number" step="0.01" value={rotX} onChange={(e: any) => setRotX(parseFloat(e.target.value))} />
              <Input placeholder="Y (Pitch)" type="number" step="0.01" value={rotY} onChange={(e: any) => setRotY(parseFloat(e.target.value))} />
              <Input placeholder="Z (Yaw)" type="number" step="0.01" value={rotZ} onChange={(e: any) => setRotZ(parseFloat(e.target.value))} />
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel} className="text-xs">Cancel</Button>
        <Button onClick={handleSave} className="text-xs">Save Changes</Button>
      </div>
    </div>
  );
};


interface CameraSelectionDropdownProps {
  cameras: any[];
  selectedCameraId: number | null;
  onSelect: (id: number) => void;
  onCamerasChanged: () => void; // Trigger to refresh the camera list
  label?: string;
  onRemove?: (id: number) => void; // If we want to allow removing from selection list
}

export const CameraSelectionDropdown: React.FC<CameraSelectionDropdownProps> = ({
  cameras,
  selectedCameraId,
  onSelect,
  onCamerasChanged,
  label,
  onRemove
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createCamera = async (data: any) => {
    try {
      const res = await camerasResource.create(data);
      await onCamerasChanged();
      if (res && res.id) {
        onSelect(res.id);
        setEditingId(res.id); // Immediately edit
        setIsOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create camera");
    }
  };

  const handleEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    onSelect(id);
    setIsOpen(false);
  };

  const realCameras = cameras.filter(c => c.modality === 'real');
  const simCameras = cameras.filter(c => c.modality === 'simulated');
  const selectedCamera = cameras.find(c => c.id === selectedCameraId);

  if (editingId !== null) {
    const cam = cameras.find(c => c.id === editingId);
    if (cam) {
      return (
        <div className="mb-4">
          {label && <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>}
          <CameraEditor
            camera={cam}
            onSave={() => { setEditingId(null); onCamerasChanged(); }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )
    }
  }

  return (
    <div className="mb-2 relative" ref={dropdownRef}>
      {label && <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>}

      <div className="flex gap-2">
        <div className="flex-1 relative cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <div className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center min-h-[38px]">
            {selectedCamera ? (
              <div className="flex items-center flex-wrap gap-1">
                <span className="font-medium">{selectedCamera.name}</span>
                {selectedCamera.modality === 'real' ? <Badge color="green">real</Badge> : <Badge color="blue">sim</Badge>}
                <span className="text-gray-400 text-xs ml-2">
                  {selectedCamera.modality === 'simulated' ? `${selectedCamera.resolution} @ ${selectedCamera.fps}fps` : ''}
                </span>
              </div>
            ) : (
              <span className="text-gray-500">Select or create camera...</span>
            )}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <ChevronRight className="h-4 w-4 rotate-90" />
          </div>
        </div>
        {selectedCamera && (
          <button
            onClick={(e) => handleEdit(selectedCamera.id, e)}
            className="p-2 text-gray-500 hover:text-blue-600 border rounded-md bg-white"
            title="Edit Camera Properties"
          >
            <Pencil className="w-5 h-5" />
          </button>
        )}
        {onRemove && (
          <Button variant="ghost" onClick={() => onRemove(selectedCameraId!)} className="px-3" title="Remove Camera slot">
            X
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {/* 1. Real Cameras */}
          {realCameras.length > 0 && <div className="px-3 py-1 text-xs text-gray-500 font-semibold bg-gray-50 mt-1">Real</div>}
          {realCameras.map(c => (
            <div key={c.id}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 flex items-center justify-between"
              onClick={() => { onSelect(c.id); setIsOpen(false); }}
            >
              <div className="flex items-center">
                <span className="font-normal block truncate">{c.name}</span>
              </div>
              {selectedCameraId === c.id && <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />}
            </div>
          ))}

          {/* 2. Simulated Cameras */}
          {simCameras.length > 0 && <div className="px-3 py-1 text-xs text-gray-500 font-semibold bg-gray-50 mt-2">Simulated</div>}
          {simCameras.map(c => (
            <div key={c.id}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 flex items-center justify-between"
              onClick={() => { onSelect(c.id); setIsOpen(false); }}
            >
              <div className="flex items-center">
                <span className="font-normal block truncate">{c.name}</span>
              </div>
              {selectedCameraId === c.id && <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />}
            </div>
          ))}

          <hr className="my-1 border-gray-200" />

          <div
            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-blue-700 flex items-center"
            onClick={() => createCamera({
              name: `Real Camera ${new Date().toLocaleString()}`,
              modality: 'real'
            })}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Real Camera
          </div>
          <div
            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-blue-700 flex items-center"
            onClick={() => createCamera({
              name: `Simulated Camera ${new Date().toLocaleString()}`,
              modality: 'simulated',
              resolution: '1280x720',
              fps: 30,
              positionX: 0, positionY: 0, positionZ: 0,
              rotationX: 0, rotationY: 0, rotationZ: 0
            })}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Simulated Camera
          </div>
        </div>
      )}
    </div>
  );
};
