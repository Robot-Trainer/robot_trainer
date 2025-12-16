import React, { useEffect, useState } from 'react';
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
  const [pythonScanning, setPythonScanning] = useState(false);
  const [pythonError, setPythonError] = useState<string | null>(null);
  const [robotPlugins, setRobotPlugins] = useState<Array<any>>([]);
  const [teleopPlugins, setTeleopPlugins] = useState<Array<any>>([]);
  const [anacondaScanning, setAnacondaScanning] = useState(false);
  const [anacondaError, setAnacondaError] = useState<string | null>(null);
  const [anacondaResult, setAnacondaResult] = useState<{ found: boolean; path: string | null; envs: Array<{ name: string; pythonPath?: string | null }>; platform?: string; condaAvailable?: boolean; condaVersion?: string } | null>(null);
  const [selectedCondaEnv, setSelectedCondaEnv] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmPythonPath, setConfirmPythonPath] = useState<string | null>(null);
  const [anacondaMessage, setAnacondaMessage] = useState<string | null>(null);
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [selectedTeleop, setSelectedTeleop] = useState<string | null>(null);

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

  const scanPythonPlugins = async () => {
    setPythonScanning(true);
    setPythonError(null);
    try {
      const res = await (window as any).electronAPI.listPythonPlugins();
      // Expect { robots: [...], teleoperators: [...] }
      setRobotPlugins(res?.robots || []);
      setTeleopPlugins(res?.teleoperators || []);
      if ((res?.robots || []).length > 0) setSelectedRobot((res.robots[0].class_name) || null);
      if ((res?.teleoperators || []).length > 0) setSelectedTeleop((res.teleoperators[0].class_name) || null);
    } catch (error) {
      setPythonError(error instanceof Error ? error.message : String(error));
    } finally {
      setPythonScanning(false);
    }
  };

  const checkAnaconda = async () => {
    setAnacondaScanning(true);
    setAnacondaError(null);
    setAnacondaResult(null);
    setSelectedCondaEnv(null);
    setAnacondaMessage(null);
    try {
      const res = await (window as any).electronAPI.checkAnaconda();
      setAnacondaResult(res);
      if (res?.found && (res.envs || []).length > 0) {
        setSelectedCondaEnv(res.envs[0].name || res.envs[0]);
      }
    } catch (err) {
      setAnacondaError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnacondaScanning(false);
    }
  };

  const openConfirmForSelectedEnv = () => {
    if (!anacondaResult || !selectedCondaEnv) return;
    const env = anacondaResult.envs.find((e) => e.name === selectedCondaEnv);
    let pythonExec: string | null = null;
    if (env && env.pythonPath) pythonExec = env.pythonPath;
    else if (anacondaResult.path) {
      const envRoot = `${anacondaResult.path}${anacondaResult.path.endsWith('/') ? '' : '/'}${selectedCondaEnv}`;
      pythonExec = (anacondaResult.platform === 'win32') ? `${envRoot}\\python.exe` : `${envRoot}/bin/python`;
    }
    setConfirmPythonPath(pythonExec);
    setConfirmModalOpen(true);
  };

  const confirmSavePythonPath = async () => {
    if (!confirmPythonPath) return;
    try {
      await (window as any).electronAPI.saveSystemSettings({ pythonPath: confirmPythonPath });
      setAnacondaMessage(`Saved Python path: ${confirmPythonPath}`);
      setConfirmModalOpen(false);
    } catch (e) {
      setAnacondaError(e instanceof Error ? e.message : String(e));
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
                  <div className="mt-4 p-3 border rounded-md bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Python Plugins</div>
                      <Button variant="ghost" onClick={scanPythonPlugins} disabled={pythonScanning}>{pythonScanning ? 'Scanning…' : 'Scan Python Plugins'}</Button>
                    </div>
                    {pythonError && <div className="text-sm text-red-600 mb-2">{pythonError}</div>}
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-600">Robot Class</label>
                        <Select
                          value={selectedRobot || ''}
                          onChange={(e: any) => setSelectedRobot(e.target.value)}
                          options={[{ label: 'Select robot', value: '' }, ...robotPlugins.map((r) => ({ label: `${r.name || r.class_name} — ${r.class_name}`, value: r.class_name }))]}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-600">Teleoperator Class</label>
                        <Select
                          value={selectedTeleop || ''}
                          onChange={(e: any) => setSelectedTeleop(e.target.value)}
                          options={[{ label: 'Select teleoperator', value: '' }, ...teleopPlugins.map((t) => ({ label: `${t.name || t.class_name} — ${t.class_name}`, value: t.class_name }))]}
                        />
                      </div>
                    </div>
                    <div className="mt-4 p-3 border rounded-md bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Python Environment</div>
                        <Button variant="ghost" onClick={checkAnaconda} disabled={anacondaScanning}>{anacondaScanning ? 'Detecting…' : 'Detect Anaconda'}</Button>
                      </div>
                      {anacondaError && <div className="text-sm text-red-600 mb-2">{anacondaError}</div>}
                      {!anacondaResult && <div className="text-sm text-gray-500">Click "Detect Anaconda" to look for a local Anaconda installation.</div>}

                      {anacondaResult && anacondaResult.found && (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600">Detected envs at: <span className="font-mono text-sm">{anacondaResult.path}</span></div>
                          <div className="space-y-1 mt-2">
                            {anacondaResult.envs.length === 0 && <div className="text-sm text-gray-500">No environments found in the Anaconda envs directory.</div>}
                            {anacondaResult.envs.map((envObj) => (
                              <label key={envObj.name} className="flex items-center gap-3 p-2 border rounded-md">
                                <input type="radio" name="condaEnv" checked={selectedCondaEnv === envObj.name} onChange={() => setSelectedCondaEnv(envObj.name)} />
                                <div className="text-sm">{envObj.name}</div>
                                {envObj.pythonPath && <div className="ml-auto text-xs text-gray-500">{envObj.pythonPath}</div>}
                              </label>
                            ))}
                          </div>

                          <div className="flex items-center gap-3">
                            <Button onClick={openConfirmForSelectedEnv} disabled={!selectedCondaEnv}>Use this environment</Button>
                            <div className="text-sm text-gray-500">or</div>
                            <Button variant="ghost" onClick={() => { window.dispatchEvent(new CustomEvent('robotflow:navigate', { detail: 'system-settings' })); }}>Point to custom Python</Button>
                          </div>
                          {anacondaMessage && <div className="text-sm text-green-600">{anacondaMessage}</div>}
                        </div>
                      )}

                      {anacondaResult && !anacondaResult.found && (
                        <div className="space-y-2">
                          <div className="text-sm">No Anaconda installation detected in your home directory.</div>
                          <div className="flex items-center gap-3">
                            <Button onClick={() => window.open('https://www.anaconda.com/download/success', '_blank')}>Install Anaconda</Button>
                            <Button variant="ghost" onClick={() => { window.dispatchEvent(new CustomEvent('robotflow:navigate', { detail: 'system-settings' })); }}>Point to custom Python</Button>
                          </div>
                          <div className="text-sm text-gray-600">Anaconda is recommended for machine learning workflows used by Robot Trainer.</div>
                        </div>
                      )}
                    </div>
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

      {/* Confirmation modal for selecting python executable */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-md shadow-lg w-96 p-6">
            <h3 className="text-lg font-medium mb-2">Confirm Python Path</h3>
            <p className="text-sm text-gray-600 mb-4">Please confirm the Python executable that will be used by Robot Trainer.</p>
            <div className="p-3 mb-4 bg-gray-50 border rounded text-sm font-mono break-all">{confirmPythonPath || 'No Python executable detected for this environment.'}</div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmModalOpen(false)}>Cancel</Button>
              <Button onClick={confirmSavePythonPath} disabled={!confirmPythonPath}>Confirm</Button>
            </div>
          </div>
        </div>
      )}

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
