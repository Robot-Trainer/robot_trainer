import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';

interface SerialPort { path: string; manufacturer: string; serialNumber: string; productId?: string; vendorId?: string; pnpId?: string; }

interface RobotFormProps {
  onSelect?: (config: { follower?: SerialPort | null, leader?: SerialPort | null }) => void;
  onCancel?: () => void;
}

const RobotForm: React.FC<RobotFormProps> = ({ onSelect, onCancel }) => {
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedFollowerPort, setSelectedFollowerPort] = useState<string | null>(null);
  const [selectedLeaderPort, setSelectedLeaderPort] = useState<string | null>(null);

  useEffect(() => {
    // no-op on mount for tests; callers may call scanPorts
  }, []);

  const handleConfirm = () => {
    if (onSelect) {
      const follower = serialPorts.find(p => p.path === selectedFollowerPort) || null;
      const leader = serialPorts.find(p => p.path === selectedLeaderPort) || null;
      onSelect({ follower, leader });
    }
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
                className="serial-port-card p-3 border rounded-md bg-gray-50 flex items-start gap-3"
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

      {onSelect && (
        <div className="mt-6 flex justify-end gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handleConfirm}>Confirm Selection</Button>
        </div>
      )}
    </div>
  );
};

export default RobotForm;
