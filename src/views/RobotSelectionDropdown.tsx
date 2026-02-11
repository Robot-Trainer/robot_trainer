import React, { useState, useEffect, useRef } from 'react';
import { TextField, MenuItem, Divider, ListSubheader, Box, IconButton } from '@mui/material';
import { Pencil, Plus } from '../icons';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import { robotsResource } from '../db/resources';

interface RobotEditorProps {
  robot: any;
  availableModels: { label: string, value: string }[];
  connectedDevices: any[];
  onSave: () => void;
  onCancel: () => void;
}

const RobotEditor: React.FC<RobotEditorProps> = ({ robot, availableModels, connectedDevices, onSave, onCancel }) => {
  const [name, setName] = useState(robot.name || '');
  const [model, setModel] = useState(robot.robotModelId ? String(robot.robotModelId) : '');
  const [serialNumber, setSerialNumber] = useState(robot.serialNumber || '');
  const isReal = robot.modality === 'real';

  useEffect(() => {
    // If model is empty and we have options, maybe default to first? 
    // Or keep it empty to force user selection.
    if (!model && availableModels.length > 0) {
      setModel(availableModels[0].value);
    }
  }, []);

  const handleSave = async () => {
    try {
      const parsedModelId = model ? parseInt(model, 10) : null;
      await robotsResource.update(robot.id, {
        name,
        serialNumber: isReal ? serialNumber : '',
        modality: isReal ? 'real' : 'simulated',
        robotModelId: parsedModelId,
        data: { ...robot.data, type: isReal ? 'real' : 'simulation' }
      });
      onSave();
    } catch (e) {
      console.error("Failed to save robot", e);
      alert("Failed to save robot details");
    }
  };

  const deviceOptions = connectedDevices.map(d => ({
    label: `${d.manufacturer || 'Device'} (${d.path}) - ${d.serialNumber}`,
    value: d.serialNumber
  }));

  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4 shadow-sm relative">
      <h4 className="font-semibold text-sm text-gray-700">Edit {isReal ? 'Real' : 'Simulated'} Robot</h4>

      <Input
        label="Name"
        value={name}
        onChange={(e: any) => setName(e.target.value)}
        placeholder="e.g. My Primary Arm"
      />

      <Select
        label="Model"
        value={model}
        onChange={(e: any) => setModel(e.target.value)}
        options={[{ label: 'Select Model...', value: '' }, ...availableModels]}
      />

      {isReal && (
        <Select
          label="Connected Device (Serial Number)"
          value={serialNumber}
          onChange={(e: any) => setSerialNumber(e.target.value)}
          options={[
            { label: 'Select Device...', value: '' },
            ...deviceOptions,
            // Allow keeping existing serial even if not currently connected
            ...(serialNumber && !deviceOptions.find(d => d.value === serialNumber) ? [{ label: `Currently Disconnected (${serialNumber})`, value: serialNumber }] : [])
          ]}
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel} className="text-xs">Cancel</Button>
        <Button onClick={handleSave} className="text-xs">Save Changes</Button>
      </div>
    </div>
  );
};


interface RobotSelectionDropdownProps {
  robots: any[];
  connectedDevices: any[];
  availableModels: { label: string, value: string }[];
  selectedRobotId: number | null;
  onSelect: (robotId: number) => void;
  onRobotsChanged: () => void; // refetch trigger
  label?: string;
}

export const RobotSelectionDropdown: React.FC<RobotSelectionDropdownProps> = ({
  robots,
  connectedDevices,
  availableModels,
  selectedRobotId,
  onSelect,
  onRobotsChanged,
  label
}) => {
  const [editingRobotId, setEditingRobotId] = useState<number | null>(null);

  const createRobot = async (data: any) => {
    try {
      const res = await robotsResource.create({
        ...data,
      });
      await onRobotsChanged(); // Refresh list to get the new robot
      if (res && res.id) {
        onSelect(res.id);
        setEditingRobotId(res.id); // Immediately edit
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create robot");
    }
  };

  // Categorize
  const realConnected = robots.filter(r =>
    r.modality === 'real' && connectedDevices.some(d => d.serialNumber === r.serialNumber)
  );

  const simulated = robots.filter(r => r.modality === 'simulated');

  const realDisconnected = robots.filter(r =>
    r.modality === 'real' && !connectedDevices.some(d => d.serialNumber === r.serialNumber)
  );

  const unknownDevices = connectedDevices.filter(d =>
    !robots.some(r => r.serialNumber === d.serialNumber)
  );

  // Determine display label for selected
  const selectedRobot = robots.find(r => r.id === selectedRobotId);

  // If editing, render editor instead of dropdown
  if (editingRobotId !== null) {
    const robotToEdit = robots.find(r => r.id === editingRobotId);
    if (robotToEdit) {
      return (
        <div className="mb-4">
          {label && <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>}
          <RobotEditor
            robot={robotToEdit}
            availableModels={availableModels}
            connectedDevices={connectedDevices}
            onSave={() => { setEditingRobotId(null); onRobotsChanged(); }}
            onCancel={() => setEditingRobotId(null)}
          />
        </div>
      );
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = String(e.target.value);
    if (val === '__create_real__') {
      createRobot({
        name: `Real Robot ${new Date().toLocaleString()}`,
        data: { type: 'real' },
        modality: 'real',
        robotModelId: availableModels.length > 0 ? parseInt(availableModels[0].value, 10) : null,
        serialNumber: ''
      });
    } else if (val === '__create_sim__') {
      createRobot({
        name: `Simulated Robot ${new Date().toLocaleString()}`,
        data: { type: 'simulation' },
        modality: 'simulated',
        robotModelId: availableModels.length > 0 ? parseInt(availableModels[0].value, 10) : null,
        serialNumber: 'sim-' + Date.now()
      });
    } else if (val.startsWith('__create_unknown_')) {
      const idx = parseInt(val.split('_').pop()!, 10);
      const d = unknownDevices[idx];
      if (d) {
        createRobot({
          name: `New Robot (${d.serialNumber?.substring(0, 6)})`,
          serialNumber: d.serialNumber,
          modality: 'real',
          data: { type: 'real' },
          robotModelId: availableModels.length > 0 ? parseInt(availableModels[0].value, 10) : null,
          notes: `Detected device: ${d.manufacturer}`
        });
      }
    } else if (val) {
      onSelect(Number(val));
    }
  };

  return (
    <Box mb={2}>
      <Box display="flex" gap={1} alignItems="flex-start">
        <TextField
          select
          label={label || "Follower Robot"}
          value={selectedRobotId || ''}
          onChange={handleChange}
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
          SelectProps={{
            renderValue: (selected) => {
              const r = robots.find(r => r.id === selected);
              if (!r) return <span className="text-gray-500">Select or create follower...</span>;
              return (
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <span className="font-medium">{r.name}</span>
                  {r.modality === 'real' && (
                    <>
                      <Badge color="green">real</Badge>
                      {connectedDevices.some(d => d.serialNumber === r.serialNumber) ? (
                        <Badge color="green">connected</Badge>
                      ) : (
                        <Badge color="red">disconnected</Badge>
                      )}
                    </>
                  )}
                  {r.modality === 'simulated' && (
                    <Badge color="blue">sim</Badge>
                  )}
                </Box>
              );
            }
          }}
        >
          {/* 1. Real & Connected */}
          {realConnected.length > 0 && <ListSubheader>Real & Connected</ListSubheader>}
          {realConnected.map(r => (
            <MenuItem key={r.id} value={r.id}>
              {r.name}
            </MenuItem>
          ))}

          {/* 3. Scanned (Unregistered) */}
          {unknownDevices.length > 0 && <ListSubheader>Detected New Devices</ListSubheader>}
          {unknownDevices.map((d, i) => (
            <MenuItem key={`unk-${i}`} value={`__create_unknown_${i}`} sx={{ fontStyle: 'italic' }}>
              Add: {d.serialNumber} ({d.manufacturer})
            </MenuItem>
          ))}

          {/* 2. Simulated */}
          {simulated.length > 0 && <ListSubheader>Simulated</ListSubheader>}
          {simulated.map(r => (
            <MenuItem key={r.id} value={r.id}>
              {r.name}
            </MenuItem>
          ))}

          {/* 4. Real & Disconnected */}
          {realDisconnected.length > 0 && <ListSubheader>Offline / Disconnected</ListSubheader>}
          {realDisconnected.map(r => (
            <MenuItem key={r.id} value={r.id} sx={{ color: 'text.secondary' }}>
              {r.name}
            </MenuItem>
          ))}

          <Divider />
          <MenuItem value="__create_real__" sx={{ color: 'primary.main', gap: 1 }}>
            <Plus className="w-4 h-4" /> Create New Real Robot
          </MenuItem>
          <MenuItem value="__create_sim__" sx={{ color: 'primary.main', gap: 1 }}>
            <Plus className="w-4 h-4" /> Create New Simulated Robot
          </MenuItem>
        </TextField>

        {selectedRobot && (
          <IconButton
            onClick={() => setEditingRobotId(selectedRobot.id)}
            size="small"
            sx={{
              border: '1px solid #e5e7eb',
              borderRadius: 1,
              p: '8px',
              mt: '2px'
            }}
            title="Edit Robot Properties"
          >
            <Pencil className="w-5 h-5 text-gray-500" />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};
