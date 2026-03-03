import React, { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  Stack,
  Box,
  Alert,
  Paper,
  CircularProgress,
  Chip
} from '@mui/material';
import UsbIcon from '@mui/icons-material/Usb';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { robotModelsResource } from '../db/resources';
import { db } from '../db/db';
import {
  robotModelsTable,
  scenesTable,
  sceneRobotsTable
} from '../db/schema';

interface SerialPort {
  path: string;
  manufacturer: string;
  serialNumber: string;
  productId?: string;
  vendorId?: string;
  pnpId?: string;
}

interface RobotFormProps {
  onSaved?: (item: any) => Promise<any> | void;
  onCancel?: () => void;
  initialData?: any;
}

type RobotModality = 'real' | 'simulated';

const getModelModality = (model: any): RobotModality | null => {
  if (model?.modality === 'real' || model?.modality === 'simulated') {
    return model.modality;
  }

  const cls = String(model?.className || '').toLowerCase();
  if (cls.includes('follower')) return 'real';
  if (cls.includes('mujoco') || cls.includes('sim')) return 'simulated';
  return null;
};

const RobotForm: React.FC<RobotFormProps> = ({ onSaved, onCancel, initialData }) => {
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [modality, setModality] = useState<RobotModality>('real');
  const [robotModelId, setRobotModelId] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<any[]>([]);
  const [modelOptionItems, setModelOptionItems] = useState<{ label: string; value: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [realPortPath, setRealPortPath] = useState<string>('');
  const [disableTorqueOnDisconnect, setDisableTorqueOnDisconnect] = useState(true);
  const [useDegrees, setUseDegrees] = useState(false);
  const [maxRelativeTarget, setMaxRelativeTarget] = useState<string>('');
  const [robotConfigId, setRobotConfigId] = useState<string>('');
  const [calibrationDir, setCalibrationDir] = useState<string>('');

  const [modelFilePath, setModelFilePath] = useState<string | null>(null);
  const [modelFileData, setModelFileData] = useState<{
    content: string;
    format: string;
    baseName: string;
    metadata: {
      numJoints: number;
      jointNames: string[];
      actuatorNames: string[];
      siteNames: string[];
      hasGripper: boolean;
    };
  } | null>(null);
  const [modelFileError, setModelFileError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await robotModelsResource.list();
        setModelOptions(models);
        setModelOptionItems(models.map((m: any) => ({ label: m.name, value: String(m.id) })));
      } catch (e) {
        setModelOptions([]);
        setModelOptionItems([]);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!initialData) return;
    setName(initialData.name || '');
    setNotes(initialData.notes || '');
    setModality((initialData.modality as RobotModality) || 'real');
    setSerialNumber(initialData.serialNumber || '');
    setRobotModelId(initialData.robotModelId ? String(initialData.robotModelId) : '');

    const cfg = initialData.data?.config || {};
    setRealPortPath(cfg.port || '');
    setDisableTorqueOnDisconnect(cfg.disable_torque_on_disconnect ?? true);
    setUseDegrees(cfg.use_degrees ?? false);
    setMaxRelativeTarget(cfg.max_relative_target != null ? String(cfg.max_relative_target) : '');
    setRobotConfigId(cfg.id || '');
    setCalibrationDir(cfg.calibration_dir || '');
  }, [initialData]);

  const selectedModel = modelOptions.find((m: any) => String(m.id) === String(robotModelId));
  const selectedModelModality = getModelModality(selectedModel);

  useEffect(() => {
    if (selectedModelModality) {
      setModality(selectedModelModality);
    }
  }, [selectedModelModality]);

  const handleSave = async () => {
    if (!onSaved) return;
    setSubmitting(true);
    try {
      if (modality === 'simulated' && modelFileData && !initialData) {
        const modelName = name || modelFileData.baseName;

        let pathForDb: string | undefined = undefined;
        const xmlForDb: string | null = null;

        if (modelFilePath) {
          if (modelFileData.format === 'zip') {
            const result = await (window as any).electronAPI.saveRobotModelZip(modelFilePath);
            pathForDb = result.modelPath;
          } else {
            const result = await (window as any).electronAPI.saveRobotModelFile(modelFilePath);
            pathForDb = result.modelPath;
          }
        }

        const [insertedModel] = await db.insert(robotModelsTable).values({
          name: modelName,
          dirName: 'custom',
          className: 'GenericMujocoEnv',
          configClassName: 'CustomMujocoEnvConfig',
          modelXml: xmlForDb,
          modelPath: pathForDb,
          modelFormat: modelFileData.format,
          properties: modelFileData.metadata,
        }).returning();

        const payload = {
          name: modelName,
          notes,
          modality: 'simulated' as const,
          serialNumber: '',
          robotModelId: insertedModel.id,
          data: { type: 'simulation' },
          _autoCreateConfig: true,
          _modelMetadata: modelFileData.metadata,
        };

        const createdRobot = await onSaved(payload);

        if (createdRobot && createdRobot.id) {
          const [scene] = await db.insert(scenesTable).values({
            name: `${modelName} Scene`,
          }).returning();

          await db.insert(sceneRobotsTable).values({
            sceneId: scene.id,
            robotId: createdRobot.id,
            snapshot: {
              id: createdRobot.id,
              name: modelName,
              modality: 'simulated',
              robotModelId: insertedModel.id,
              model: {
                name: modelName,
                modelFormat: modelFileData.format,
                ...modelFileData.metadata,
              },
            },
          });
        }

        return;
      }

      const parsedModelId = robotModelId ? parseInt(robotModelId, 10) : null;
      const maxRelativeTargetValue =
        maxRelativeTarget.trim() === '' || Number.isNaN(Number(maxRelativeTarget))
          ? null
          : Number(maxRelativeTarget);

      const payloadData = {
        ...(initialData?.data || {}),
        type: modality === 'real' ? 'real' : 'simulation'
      } as any;

      if (modality === 'real') {
        payloadData.config = {
          ...(payloadData.config || {}),
          port: realPortPath,
          disable_torque_on_disconnect: disableTorqueOnDisconnect,
          max_relative_target: maxRelativeTargetValue,
          use_degrees: useDegrees,
          id: robotConfigId || null,
          calibration_dir: calibrationDir || null,
        };
      } else if (payloadData.config) {
        delete payloadData.config;
      }

      const payload = {
        name,
        notes,
        modality,
        serialNumber: modality === 'real' ? serialNumber : '',
        robotModelId: parsedModelId,
        data: payloadData,
      };
      await onSaved(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectModelFile = async () => {
    setModelFileError(null);
    try {
      const filePath = await (window as any).electronAPI.selectModelFile();
      if (!filePath) return;
      setModelFilePath(filePath);
      const data = await (window as any).electronAPI.readModelFile(filePath);
      setModelFileData(data);
      if (!name) setName(data.baseName);
    } catch (e) {
      setModelFileError(e instanceof Error ? e.message : String(e));
      setModelFileData(null);
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

  const showExplicitModalitySelector = !selectedModelModality;

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Input
            label="Robot Name"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            placeholder="e.g. My Primary Arm"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Select
            label="Robot Model"
            value={robotModelId}
            onChange={(e: any) => setRobotModelId(e.target.value)}
            options={[{ label: 'Select Robot Model...', value: '' }, ...modelOptionItems]}
          />
        </Grid>
        {showExplicitModalitySelector ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <Select
              label="Modality"
              value={modality}
              onChange={(e: any) => setModality(e.target.value as RobotModality)}
              options={[
                { label: 'Real', value: 'real' },
                { label: 'Simulated', value: 'simulated' }
              ]}
            />
          </Grid>
        ) : (
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              This model is configured as <strong>{modality}</strong>.
            </Typography>
          </Grid>
        )}
        <Grid size={{ xs: 12, md: 6 }}>
          <Input
            label="Notes"
            value={notes}
            onChange={(e: any) => setNotes(e.target.value)}
            placeholder="Optional notes"
          />
        </Grid>
      </Grid>

      {modality === 'real' && (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontSize="1rem">Real Robot Configuration (LeRobot)</Typography>
            <Button variant="ghost" onClick={scanPorts} disabled={scanning}>
              <Stack direction="row" spacing={1} alignItems="center">
                {scanning ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                <span>{scanning ? 'Scanning...' : 'Scan Ports'}</span>
              </Stack>
            </Button>
          </Stack>

          {scanError && <Alert severity="error" sx={{ mb: 2 }}>{scanError}</Alert>}

          {serialPorts.length === 0 && !scanning ? (
            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
              No serial devices found. Connect a device and click Scan.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {serialPorts.map((p, i) => {
                const isSelected = serialNumber === p.serialNumber;
                return (
                  <Paper
                    key={i}
                    variant="outlined"
                    onClick={() => {
                      setSerialNumber(p.serialNumber || '');
                      setRealPortPath(p.path || '');
                    }}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'primary.soft' : 'background.default',
                      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : undefined,
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                    role="button"
                    aria-label={`Select device ${p.serialNumber}`}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <UsbIcon color={isSelected ? 'primary' : 'action'} />
                      <Box flexGrow={1}>
                        <Typography variant="subtitle2">
                          {p.manufacturer || 'Unknown Device'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Port: {p.path} • Serial: {p.serialNumber || 'N/A'}
                        </Typography>
                      </Box>
                      {isSelected && <Typography variant="caption" color="primary" fontWeight="bold">SELECTED</Typography>}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}

          <Box mt={2}>
            <Input
              label="Connected Device Serial (Manual)"
              value={serialNumber}
              onChange={(e: any) => setSerialNumber(e.target.value)}
              placeholder="Select from list above or enter manually"
            />
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Input
                label="LeRobot Port"
                value={realPortPath}
                onChange={(e: any) => setRealPortPath(e.target.value)}
                placeholder="/dev/ttyUSB0"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Select
                label="Disable Torque on Disconnect"
                value={disableTorqueOnDisconnect ? 'true' : 'false'}
                onChange={(e: any) => setDisableTorqueOnDisconnect(e.target.value === 'true')}
                options={[
                  { label: 'True', value: 'true' },
                  { label: 'False', value: 'false' },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Select
                label="Use Degrees"
                value={useDegrees ? 'true' : 'false'}
                onChange={(e: any) => setUseDegrees(e.target.value === 'true')}
                options={[
                  { label: 'False', value: 'false' },
                  { label: 'True', value: 'true' },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Input
                label="Max Relative Target"
                value={maxRelativeTarget}
                onChange={(e: any) => setMaxRelativeTarget(e.target.value)}
                placeholder="e.g. 5"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Input
                label="LeRobot Robot ID"
                value={robotConfigId}
                onChange={(e: any) => setRobotConfigId(e.target.value)}
                placeholder="optional"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Input
                label="Calibration Directory"
                value={calibrationDir}
                onChange={(e: any) => setCalibrationDir(e.target.value)}
                placeholder="optional path"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {modality === 'simulated' && (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Stack spacing={2}>
            <Typography variant="h6" fontSize="1rem">Model File (MJCF)</Typography>

            <Button variant="ghost" onClick={handleSelectModelFile}>
              <Stack direction="row" spacing={1} alignItems="center">
                <UploadFileIcon fontSize="small" />
                <span>{modelFilePath ? 'Change File...' : 'Select Model File...'}</span>
              </Stack>
            </Button>

            {modelFileError && <Alert severity="error">{modelFileError}</Alert>}

            {modelFileData && (
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                <Typography variant="subtitle2" gutterBottom>
                  {modelFileData.baseName}.{modelFileData.format === 'urdf' ? 'urdf' : 'xml'}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                  <Chip label={modelFileData.format.toUpperCase()} size="small" color="primary" variant="outlined" />
                  <Chip label={`${modelFileData.metadata.numJoints} joints`} size="small" variant="outlined" />
                  <Chip label={`${modelFileData.metadata.actuatorNames.length} actuators`} size="small" variant="outlined" />
                  {modelFileData.metadata.hasGripper && <Chip label="Gripper detected" size="small" color="success" variant="outlined" />}
                </Stack>
                <Typography variant="caption" color="textSecondary">
                  Joints: {modelFileData.metadata.jointNames.join(', ') || 'None'}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 2 }}>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Robot'}
        </Button>
      </Stack>
    </Stack>
  );
};

export default RobotForm;
