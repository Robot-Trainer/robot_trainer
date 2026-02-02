import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { robotModelsResource } from '../db/resources';

interface SerialPort { path: string; manufacturer: string; serialNumber: string; productId?: string; vendorId?: string; pnpId?: string; }

interface RobotFormProps {
  onSaved?: (item: any) => Promise<any> | void;
  onCancel?: () => void;
  initialData?: any;
}

const RobotForm: React.FC<RobotFormProps> = ({ onSaved, onCancel, initialData }) => {
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [modality, setModality] = useState<'real' | 'simulated'>('real');
  const [robotModelId, setRobotModelId] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await robotModelsResource.list();
        const opts = models.map((m: any) => ({ label: m.name, value: String(m.id) }));
        setModelOptions(opts);
      } catch (e) {
        setModelOptions([]);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!initialData) return;
    setName(initialData.name || '');
    setNotes(initialData.notes || '');
    setModality((initialData.modality as 'real' | 'simulated') || 'real');
    setSerialNumber(initialData.serialNumber || '');
    setRobotModelId(initialData.robotModelId ? String(initialData.robotModelId) : '');
  }, [initialData]);

  const handleSave = async () => {
    if (!onSaved) return;
    const parsedModelId = robotModelId ? parseInt(robotModelId, 10) : null;
    const payload = {
      name,
      notes,
      modality,
      serialNumber: modality === 'real' ? serialNumber : '',
      robotModelId: parsedModelId,
      data: {
        ...(initialData?.data || {}),
        type: modality === 'real' ? 'real' : 'simulation'
      }
    };
    await onSaved(payload);
  };

  const scanPorts = async () => {
    setScanning(true);
    setScanError(null);
    try {
      const ports = await (window as any).electronAPI.scanSerialPorts();
      setSerialPorts(ports || []);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.match(/permission|access/i)) {
        setScanError('Permission denied when accessing serial ports. Try running with appropriate permissions.');
      } else if (msg.match(/no ports|no devices|Could not find any/i)) {
        setScanError('No serial devices found. Ensure devices are connected and try again.');
      } else {
        setScanError(`Failed to scan USB ports: ${msg}`);
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
        <h3 className="text-lg font-medium">Robots</h3>
        <div>
          <Button variant="ghost" onClick={scanPorts} disabled={scanning}>
            {scanning ? "Scanning…" : "Scan ports"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Robot Name"
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          placeholder="e.g. My Primary Arm"
        />
        <Select
          label="Robot Model"
          value={robotModelId}
          onChange={(e: any) => setRobotModelId(e.target.value)}
          options={[{ label: 'Select Robot Model...', value: '' }, ...modelOptions]}
        />
        <Select
          label="Modality"
          value={modality}
          onChange={(e: any) => setModality(e.target.value as 'real' | 'simulated')}
          options={[
            { label: 'Real', value: 'real' },
            { label: 'Simulated', value: 'simulated' }
          ]}
        />
        <Input
          label="Notes"
          value={notes}
          onChange={(e: any) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </div>

      {scanError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {scanError}
        </div>
      )}

      <div>
        {serialPorts.length === 0 ? (
          <div>
            <p className="text-sm text-gray-500 mb-4">No devices found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {serialPorts.map((p, i) => (
              <div
                key={i}
                data-path={p.path}
                onClick={() => setSerialNumber(p.serialNumber || '')}
                className={`serial-port-card p-3 border rounded-md bg-gray-50 flex items-start gap-3 cursor-pointer ${
                  serialNumber && p.serialNumber === serialNumber ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">
                      {p.manufacturer || "Unknown Device"}
                    </div>
                    <div className="text-xs text-gray-500">Port: {p.path}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Serial: {p.serialNumber || "N/A"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <div
            className="serial-port-card p-3 border rounded-md bg-gray-50 flex items-start gap-3"
          >
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">
                  Simulated Device
                </div>
                <div className="text-xs text-gray-500">Port: Not applicable</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Serial: Not Applicable
              </div>
            </div>
          </div>
        </div>{" "}
        <div>
          <p>
            <Button
              className="inline-block mt-4 mr-2 mb-4"
              variant="secondary"
              onClick={scanPorts}
              disabled={scanning}
            >
              {scanning ? "Scanning…" : "Scan ports"}
            </Button>
            <Button className="inline-block ml-2" variant="secondary">
              Create a simulated device
            </Button>
          </p>
        </div>
      </div>

      {modality === 'real' && (
        <Select
          label="Connected Device (Serial Number)"
          value={serialNumber}
          onChange={(e: any) => setSerialNumber(e.target.value)}
          options={[
            { label: 'No device', value: '' },
            ...serialPorts.map((p) => ({
              label: `${p.manufacturer || 'Device'} (${p.path}) - ${p.serialNumber || 'N/A'}`,
              value: p.serialNumber || ''
            }))
          ]}
        />
      )}

      <div className="mt-6 flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave}>Save Robot</Button>
      </div>
    </div>
  );
};

export default RobotForm;
