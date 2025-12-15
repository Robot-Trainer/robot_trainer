import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { ChevronRight, CheckCircle } from '../icons';

interface SerialPort {
  path: string;
  manufacturer: string;
  serialNumber: string;
  productId?: string;
  vendorId?: string;
  pnpId?: string;
}

export const SetupWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [cameras, setCameras] = useState<Array<any>>([]);
  const [scanning, setScanning] = useState(false);
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [calibration, setCalibration] = useState({ leader: false, follower: false });

  const addCamera = () => {
    setCameras(prev => [...prev, { id: Date.now(), name: `Camera ${prev.length + 1}`, active: true }]);
  };

  const scanPorts = async () => {
    setScanning(true);
    setScanError(null);
    try {
      const ports = await window.electronAPI.scanSerialPorts();
      setSerialPorts(ports);
      if (ports.length > 0) {
        setCalibration(prev => ({ ...prev, leader: true }));
      }
    } catch (error) {
      setScanError(`Failed to scan USB ports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-8">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">New Robot Setup</h2>
        <p className="text-gray-500 mt-1">Configure your leader/follower arms and perception system</p>
      </div>

      <div className="flex items-center justify-center mb-10">
        {[1,2,3].map(num => (
          <div key={num} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 
              ${step === num ? 'border-blue-600 bg-blue-600 text-white' : step > num ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-400'}`}>
              {num}
            </div>
            {num !== 3 && <div className={`w-24 h-0.5 mx-2 ${step > num ? 'bg-green-500' : 'bg-gray-200'}`} /> }
          </div>
        ))}
      </div>

      <Card className="p-8 min-h-[400px]">
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-medium">Hardware</h3>
                <p className="text-sm text-gray-500">Attach leader and follower arms</p>
              </div>
              <div>
                <Button variant="ghost" onClick={scanPorts} disabled={scanning}>{scanning ? 'Scanning…' : 'Scan Ports'}</Button>
              </div>
            </div>

            {scanError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {scanError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold">Connected Devices</h4>
                <div className="space-y-2 mt-2">
                  {serialPorts.length === 0 && <p className="text-sm text-gray-500">No USB devices found. Click "Scan Ports" to search.</p>}
                  {serialPorts.map((port, idx) => (
                    <div key={idx} className="p-3 border rounded-md bg-gray-50">
                      <div className="font-medium text-sm">{port.manufacturer || 'Unknown Device'}</div>
                      <div className="text-xs text-gray-500 mt-1">Port: {port.path}</div>
                      {port.serialNumber && port.serialNumber !== 'N/A' && (
                        <div className="text-xs text-gray-500">Serial: {port.serialNumber}</div>
                      )}
                      {port.manufacturer && port.manufacturer !== 'N/A' && (
                        <div className="text-xs text-gray-500">Manufacturer: {port.manufacturer}</div>
                      )}
                      {port.pnpId && port.pnpId !== 'N/A' && (
                        <div className="text-xs text-gray-500">Pnp ID: {port.pnpId}</div>
                      )}
                      {port.productId && port.productId !== 'N/A' && (
                        <div className="text-xs text-gray-500">Product ID: {port.productId}</div>
                      )}
                      {port.vendorId && port.vendorId !== 'N/A' && (
                        <div className="text-xs text-gray-500">Vendor ID: {port.vendorId}</div>
                      )}                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold">Calibration</h4>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div>Leader Arm</div>
                    <div className="text-sm text-gray-500">{calibration.leader ? 'Calibrated' : 'Not Calibrated'}</div>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div>Follower Arm</div>
                    <div className="text-sm text-gray-500">{calibration.follower ? 'Calibrated' : 'Not Calibrated'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Perception</h3>
                <p className="text-sm text-gray-500">Configure vision and sensors</p>
              </div>
              <div>
                <Button variant="secondary">Run Diagnostics</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold">Vision</h4>
                <p className="text-sm text-gray-500 mt-2">Point a camera at the calibration target and verify feed.</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold">Network</h4>
                <p className="text-sm text-gray-500 mt-2">Ensure devices are reachable on the same subnet.</p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Setup Complete!</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">Your robot is configured and ready to proceed to training.</p>
            <Button className="mx-auto px-8" onClick={() => window.location.reload()}>Initialize Dashboard</Button>
          </div>
        )}
      </Card>

      <div className="flex justify-between mt-6">
        <Button variant="ghost" disabled={step === 1} onClick={() => setStep(s => Math.max(1, s-1))}>Back</Button>
        {step < 3 ? (
          <Button onClick={() => setStep(s => Math.min(3, s+1))}>
            Next Step <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default SetupWizard;
