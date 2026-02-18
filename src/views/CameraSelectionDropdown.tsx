import React, { useState, useEffect, useRef } from 'react';
import { TextField, MenuItem, Divider, ListSubheader, Box, IconButton } from '@mui/material';
import { Pencil, Plus } from '../icons';
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

  // Simulation params (MJCF)
  const [posX, setPosX] = useState<number>(camera.posX || 0);
  const [posY, setPosY] = useState<number>(camera.posY || 0);
  const [posZ, setPosZ] = useState<number>(camera.posZ || 0);
  
  const [quatW, setQuatW] = useState<number>(camera.quatW !== undefined ? camera.quatW : 1);
  const [quatX, setQuatX] = useState<number>(camera.quatX || 0);
  const [quatY, setQuatY] = useState<number>(camera.quatY || 0);
  const [quatZ, setQuatZ] = useState<number>(camera.quatZ || 0);

  const [xyaxesX1, setXyaxesX1] = useState<number>(camera.xyaxesX1 !== undefined ? camera.xyaxesX1 : 1);
  const [xyaxesY1, setXyaxesY1] = useState<number>(camera.xyaxesY1 || 0);
  const [xyaxesZ1, setXyaxesZ1] = useState<number>(camera.xyaxesZ1 || 0);
  const [xyaxesX2, setXyaxesX2] = useState<number>(camera.xyaxesX2 || 0);
  const [xyaxesY2, setXyaxesY2] = useState<number>(camera.xyaxesY2 !== undefined ? camera.xyaxesY2 : 1);
  const [xyaxesZ2, setXyaxesZ2] = useState<number>(camera.xyaxesZ2 || 0);

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
        
        updates.posX = posX;
        updates.posY = posY;
        updates.posZ = posZ;

        updates.quatW = quatW;
        updates.quatX = quatX;
        updates.quatY = quatY;
        updates.quatZ = quatZ;

        updates.xyaxesX1 = xyaxesX1;
        updates.xyaxesY1 = xyaxesY1;
        updates.xyaxesZ1 = xyaxesZ1;
        updates.xyaxesX2 = xyaxesX2;
        updates.xyaxesY2 = xyaxesY2;
        updates.xyaxesZ2 = xyaxesZ2;
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
            <label className="block text-xs font-medium text-gray-700">POS (x, y, z)</label>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="X" type="number" step="0.01" value={posX} onChange={(e: any) => setPosX(parseFloat(e.target.value))} />
              <Input placeholder="Y" type="number" step="0.01" value={posY} onChange={(e: any) => setPosY(parseFloat(e.target.value))} />
              <Input placeholder="Z" type="number" step="0.01" value={posZ} onChange={(e: any) => setPosZ(parseFloat(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">QUAT (w, x, y, z) <span className="font-light text-gray-400">Optional</span></label>
            <div className="grid grid-cols-4 gap-2">
              <Input placeholder="W" type="number" step="0.01" value={quatW} onChange={(e: any) => setQuatW(parseFloat(e.target.value))} />
              <Input placeholder="X" type="number" step="0.01" value={quatX} onChange={(e: any) => setQuatX(parseFloat(e.target.value))} />
              <Input placeholder="Y" type="number" step="0.01" value={quatY} onChange={(e: any) => setQuatY(parseFloat(e.target.value))} />
              <Input placeholder="Z" type="number" step="0.01" value={quatZ} onChange={(e: any) => setQuatZ(parseFloat(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">XYAXES (x1, y1, z1, x2, y2, z2) <span className="font-light text-gray-400">Optional</span></label>
            <div className="grid grid-cols-6 gap-1">
              <Input placeholder="X1" type="number" step="0.01" value={xyaxesX1} onChange={(e: any) => setXyaxesX1(parseFloat(e.target.value))} />
              <Input placeholder="Y1" type="number" step="0.01" value={xyaxesY1} onChange={(e: any) => setXyaxesY1(parseFloat(e.target.value))} />
              <Input placeholder="Z1" type="number" step="0.01" value={xyaxesZ1} onChange={(e: any) => setXyaxesZ1(parseFloat(e.target.value))} />
              <Input placeholder="X2" type="number" step="0.01" value={xyaxesX2} onChange={(e: any) => setXyaxesX2(parseFloat(e.target.value))} />
              <Input placeholder="Y2" type="number" step="0.01" value={xyaxesY2} onChange={(e: any) => setXyaxesY2(parseFloat(e.target.value))} />
              <Input placeholder="Z2" type="number" step="0.01" value={xyaxesZ2} onChange={(e: any) => setXyaxesZ2(parseFloat(e.target.value))} />
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
  const [editingId, setEditingId] = useState<number | null>(null);

  const createCamera = async (data: any) => {
    try {
      const res = await camerasResource.create(data);
      await onCamerasChanged();
      if (res && res.id) {
        onSelect(res.id);
        setEditingId(res.id); // Immediately edit
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create camera");
    }
  };

  const xmlCameras = cameras.filter(c => c.isXml);
  const realCameras = cameras.filter(c => c.modality === 'real' && !c.isXml);
  const simCameras = cameras.filter(c => c.modality === 'simulated' && !c.isXml);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '__create_real__') {
      createCamera({
        name: `Real Camera ${new Date().toLocaleString()}`,
        modality: 'real'
      });
    } else if (val === '__create_sim__') {
      createCamera({
        name: `Simulated Camera ${new Date().toLocaleString()}`,
        modality: 'simulated',
        resolution: '1280x720',
        fps: 30,
        positionX: 0, positionY: 0, positionZ: 0,
        rotationX: 0, rotationY: 0, rotationZ: 0
      });
    } else if (val) {
      onSelect(Number(val));
    }
  };

  return (
    <Box mb={2}>
      <Box display="flex" gap={1} alignItems="flex-start">
        <TextField
          select
          label={label || "Camera"}
          value={selectedCameraId || ''}
          onChange={handleChange}
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
          SelectProps={{
            renderValue: (selected) => {
              const c = cameras.find(c => c.id === selected);
              if (!c) {
                if (selected) return <span className="text-gray-700 font-medium">Unknown camera (id: {String(selected)})</span>;
                return <span className="text-gray-500">Select or create camera...</span>;
              }
              return (
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <span className="font-medium">{c.name}</span>
                  {c.isXml ? (
                    <Badge color="purple" tooltip="Defined in XML">xml</Badge>
                  ) : (
                    c.modality === 'real' ? <Badge color="green">real</Badge> : <Badge color="blue">sim</Badge>
                  )}
                </Box>
              );
            }
          }}
        >
          {/* If the selected camera isn't present in the options (e.g. DB entry not loaded), show a disabled placeholder so MUI doesn't warn */}
          {selectedCameraId !== null && !selectedCamera && (
            <MenuItem key="__selected_missing_camera__" value={selectedCameraId} disabled sx={{ fontStyle: 'italic' }}>
              Unknown camera (id: {selectedCameraId})
            </MenuItem>
          )}

          {realCameras.length > 0 && <ListSubheader>Real</ListSubheader>}
          {realCameras.map(c => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))} 

          {simCameras.length > 0 && <ListSubheader>Simulated</ListSubheader>}
          {simCameras.map(c => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}

          {xmlCameras.length > 0 && <ListSubheader>XML Defined</ListSubheader>}
          {xmlCameras.map(c => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}

          <Divider />
          <MenuItem value="__create_real__" sx={{ color: 'primary.main', gap: 1 }}>
            <Plus className="w-4 h-4" /> Create New Real Camera
          </MenuItem>
          <MenuItem value="__create_sim__" sx={{ color: 'primary.main', gap: 1 }}>
            <Plus className="w-4 h-4" /> Create New Simulated Camera
          </MenuItem>
        </TextField>

        {selectedCamera && !selectedCamera.isXml && (
          <IconButton
            onClick={() => setEditingId(selectedCamera.id)}
            size="small"
            sx={{
              border: '1px solid #e5e7eb',
              borderRadius: 1,
              p: '8px',
              mt: '2px' // Align approximately with input
            }}
            title="Edit Camera Properties"
          >
            <Pencil className="w-5 h-5 text-gray-500" />
          </IconButton>
        )}
        {onRemove && (
          <IconButton
            onClick={() => onRemove(selectedCameraId!)}
            size="small"
            color="default"
            sx={{ mt: '2px' }}
            title="Remove Camera slot"
          >
            <span className="text-lg font-bold leading-none">×</span>
          </IconButton>
        )}
      </Box>
    </Box>
  );
};
