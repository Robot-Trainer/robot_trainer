import React, { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  Stack,
  Box,
  Alert,
  Paper,
  CircularProgress
} from '@mui/material';
import UsbIcon from '@mui/icons-material/Usb';
import RefreshIcon from '@mui/icons-material/Refresh';
import Button from '../ui/Button'; // Keep our wrapper if preferred or swap to MUI Button
import Input from '../ui/Input';
import Select from '../ui/Select';
import { robotModelsResource } from '../db/resources';

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
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    try {
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
    } finally {
      setSubmitting(false);
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
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Input
            label="Robot Name"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            placeholder="e.g. My Primary Arm"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Select
            label="Robot Model"
            value={robotModelId}
            onChange={(e: any) => setRobotModelId(e.target.value)}
            options={[{ label: 'Select Robot Model...', value: '' }, ...modelOptions]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Select
            label="Modality"
            value={modality}
            onChange={(e: any) => setModality(e.target.value as 'real' | 'simulated')}
            options={[
              { label: 'Real', value: 'real' },
              { label: 'Simulated', value: 'simulated' }
            ]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Input
            label="Notes"
            value={notes}
            onChange={(e: any) => setNotes(e.target.value)}
            placeholder="Optional notes"
          />
        </Grid>
      </Grid>

      {modality === 'real' && (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontSize="1rem">USB Device Selection</Typography>
            <Button variant="ghost" onClick={scanPorts} disabled={scanning}>
              <Stack direction="row" spacing={1} alignItems="center">
                {scanning ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                <span>{scanning ? "Scanning..." : "Scan Ports"}</span>
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
                    onClick={() => setSerialNumber(p.serialNumber || '')}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'primary.soft' : 'background.default', // .soft might not exist in default theme without alpha
                      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : undefined,
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                    role="button"
                    aria-label={`Select device ${p.serialNumber}`}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <UsbIcon color={isSelected ? "primary" : "action"} />
                      <Box flexGrow={1}>
                        <Typography variant="subtitle2">
                          {p.manufacturer || "Unknown Device"}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Port: {p.path} • Serial: {p.serialNumber || "N/A"}
                        </Typography>
                      </Box>
                      {isSelected && <Typography variant="caption" color="primary" fontWeight="bold">SELECTED</Typography>}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}

          {/* Explicit Manual Selection or Display */}
          <Box mt={2}>
            <Input
              label="Connected Device Serial (Manual)"
              value={serialNumber}
              onChange={(e: any) => setSerialNumber(e.target.value)}
              placeholder="Select from list above or enter manually"
            />
          </Box>
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
