import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Pencil, Plus, CheckCircle, Zap } from '../icons';
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
  const [isOpen, setIsOpen] = useState(false);
  const [editingRobotId, setEditingRobotId] = useState<number | null>(null);
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

  const createRobot = async (data: any) => {
    try {
      const res = await robotsResource.create({
        ...data,
        // Let DB handle createdAt via defaultNow()
      });
      await onRobotsChanged(); // Refresh list to get the new robot
      if (res && res.id) {
        onSelect(res.id);
        setEditingRobotId(res.id); // Immediately edit
        setIsOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create robot");
    }
  };

  const handleEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRobotId(id);
    onSelect(id);
    setIsOpen(false);
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

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      {label && <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>}

      <div className="flex gap-2">
        <div
          className="flex-1 relative cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center min-h-[38px]">
            {selectedRobot ? (
              <div className="flex items-center flex-wrap gap-1">
                <span className="font-medium">{selectedRobot.name}</span>
                {selectedRobot.modality === 'real' && (
                  <>
                    <Badge color="green">real</Badge>
                    {connectedDevices.some(d => d.serialNumber === selectedRobot.serialNumber) ? (
                      <Badge color="green">connected</Badge>
                    ) : (
                      <Badge color="red">disconnected</Badge>
                    )}
                  </>
                )}
                {selectedRobot.modality === 'simulated' && (
                  <Badge color="blue">sim</Badge>
                )}
              </div>
            ) : (
              <span className="text-gray-500">Select or create follower...</span>
            )}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <ChevronRight className="h-4 w-4 rotate-90" />
          </div>
        </div>
        {selectedRobot && (
          <button
            onClick={(e) => handleEdit(selectedRobot.id, e)}
            className="p-2 text-gray-500 hover:text-blue-600 border rounded-md bg-white"
            title="Edit Robot Properties"
          >
            <Pencil className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">

          {/* 1. Real & Connected */}
          {realConnected.map(r => (
            <div
              key={r.id}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 flex items-center justify-between"
              onClick={() => { onSelect(r.id); setIsOpen(false); }}
            >
              <div className="flex items-center">
                <span className="font-normal block truncate">{r.name}</span>
                <Badge color="green">real</Badge>
                <Badge color="green">connected</Badge>
              </div>
              {selectedRobotId === r.id && <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />}
            </div>
          ))}

          {/* 2. Simulated */}
          {simulated.map(r => (
            <div
              key={r.id}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 flex items-center justify-between"
              onClick={() => { onSelect(r.id); setIsOpen(false); }}
            >
              <div className="flex items-center">
                <span className="font-normal block truncate">{r.name}</span>
                <Badge color="blue">sim</Badge>
              </div>
              {selectedRobotId === r.id && <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />}
            </div>
          ))}

          {/* 3. Scanned (Unregistered) */}
          {unknownDevices.map((d, i) => (
            <div
              key={`unk-${i}`}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 flex items-center justify-between group"
              onClick={() => createRobot({
                name: `New Robot (${d.serialNumber?.substring(0, 6)})`,
                serialNumber: d.serialNumber,
                modality: 'real',
                data: { type: 'real' },
                robotModelId: availableModels.length > 0 ? parseInt(availableModels[0].value, 10) : null,
                notes: `Detected device: ${d.manufacturer}`
              })}
            >
              <div className="flex items-center">
                <span className="font-normal block truncate text-gray-600 italic">
                  S/N: {d.serialNumber}
                </span>
                <Badge color="green">connected</Badge>
                <Badge color="yellow" tooltip="Not configured yet">real</Badge>
              </div>
              <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 mr-2 font-medium">Click to configure</span>
            </div>
          ))}

          {/* 4. Real & Disconnected */}
          {realDisconnected.map(r => (
            <div
              key={r.id}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 flex items-center justify-between"
              onClick={() => { onSelect(r.id); setIsOpen(false); }}
            >
              <div className="flex items-center">
                <span className="font-normal block truncate text-gray-500">{r.name}</span>
                <Badge color="green">real</Badge>
                <Badge color="red">disconnected</Badge>
              </div>
              {selectedRobotId === r.id && <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />}
            </div>
          ))}

          <hr className="my-1 border-gray-200" />

          {/* 5. New Options */}
          <div
            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-blue-700 flex items-center"
            onClick={() => createRobot({
              name: `Real Robot ${new Date().toLocaleString()}`,
              data: { type: 'real' },
              modality: 'real',
              robotModelId: availableModels.length > 0 ? parseInt(availableModels[0].value, 10) : null,
              serialNumber: ''
            })}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Real Robot
          </div>
          <div
            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-blue-700 flex items-center"
            onClick={() => createRobot({
              name: `Simulated Robot ${new Date().toLocaleString()}`,
              data: { type: 'simulation' },
              modality: 'simulated',
              robotModelId: availableModels.length > 0 ? parseInt(availableModels[0].value, 10) : null,
              serialNumber: 'sim-' + Date.now()
            })}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Simulated Robot
          </div>

        </div>
      )}
    </div>
  );
};
