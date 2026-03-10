import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Stack,
  Typography,
  Alert,
  Paper,
  IconButton,
  CircularProgress,
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Badge from './Badge';

export interface CameraEntry {
  name: string;
  deviceId: string;
  deviceLabel: string;
  stream: MediaStream;
}

interface CameraDiscoveryProps {
  /** Currently added cameras */
  cameras: CameraEntry[];
  /** Called when a camera is added */
  onAdd: (camera: CameraEntry) => void;
  /** Called when a camera is removed by name */
  onRemove: (name: string) => void;
}

/**
 * Camera discovery and preview panel for real robot configuration.
 *
 * Uses navigator.mediaDevices.enumerateDevices() to find video input
 * devices. Lets the user preview a camera feed, name it, and add
 * it to the robot configuration. Similar to the camera management
 * in the lerobot.js cyberpunk example.
 */
export const CameraDiscovery: React.FC<CameraDiscoveryProps> = ({
  cameras,
  onAdd,
  onRemove,
}) => {
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraName, setCameraName] = useState('');
  const [permissionState, setPermissionState] = useState<string>('unknown');
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Attach preview stream to video element
  useEffect(() => {
    const video = previewVideoRef.current;
    if (video && previewStream) {
      video.srcObject = previewStream;
      video.play().catch(() => {});
    }
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [previewStream]);

  // Cleanup preview stream on unmount
  useEffect(() => {
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const loadCameras = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      // Check permission status
      try {
        const perm = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        setPermissionState(perm.state);
      } catch {
        // permissions.query not supported in all browsers
      }

      // Enumerate devices
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter((d) => d.kind === 'videoinput');

      // If labels are missing, request permission first
      const hasLabels = videoDevices.some((d) => d.label);
      if (!hasLabels && videoDevices.length > 0) {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter((d) => d.kind === 'videoinput');
        tempStream.getTracks().forEach((t) => t.stop());
        setPermissionState('granted');
      }

      setAvailableCameras(videoDevices);

      // Auto-select and preview first camera if none selected
      if (videoDevices.length > 0 && !selectedDeviceId) {
        await switchPreview(videoDevices[0].deviceId);
      }
    } catch (e: any) {
      setPermissionState('denied');
      setError(e.message || String(e));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, selectedDeviceId]);

  const switchPreview = useCallback(
    async (deviceId: string) => {
      try {
        // Stop current preview
        if (previewStream) {
          previewStream.getTracks().forEach((t) => t.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        setPreviewStream(newStream);
        setSelectedDeviceId(deviceId);
      } catch (e: any) {
        setError(`Failed to access camera: ${e.message || String(e)}`);
      }
    },
    [previewStream]
  );

  const handleAdd = useCallback(() => {
    if (!cameraName.trim()) {
      setError('Please enter a camera name');
      return;
    }
    if (cameras.some((c) => c.name === cameraName.trim())) {
      setError(`A camera named "${cameraName.trim()}" already exists`);
      return;
    }
    if (!previewStream || !selectedDeviceId) {
      setError('Please select and preview a camera first');
      return;
    }

    // Clone the stream for recording/storage
    const clonedStream = previewStream.clone();
    const device = availableCameras.find((c) => c.deviceId === selectedDeviceId);

    onAdd({
      name: cameraName.trim(),
      deviceId: selectedDeviceId,
      deviceLabel: device?.label || `Camera ${selectedDeviceId.slice(0, 8)}...`,
      stream: clonedStream,
    });

    setCameraName('');
    setError(null);
  }, [cameraName, cameras, previewStream, selectedDeviceId, availableCameras, onAdd]);

  const handleRemove = useCallback(
    (name: string) => {
      const cam = cameras.find((c) => c.name === name);
      if (cam) {
        cam.stream.getTracks().forEach((t) => t.stop());
      }
      onRemove(name);
    },
    [cameras, onRemove]
  );

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontSize="1rem">
            Camera Discovery
          </Typography>
          <Button variant="ghost" onClick={loadCameras} disabled={isLoading}>
            <Stack direction="row" spacing={1} alignItems="center">
              {isLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
              <span>{isLoading ? 'Scanning...' : 'Detect Cameras'}</span>
            </Stack>
          </Button>
        </Stack>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

        {permissionState === 'denied' && (
          <Alert severity="warning">
            Camera permission denied. Please allow camera access in your browser settings.
          </Alert>
        )}

        {availableCameras.length === 0 && !isLoading ? (
          <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
            Click &quot;Detect Cameras&quot; to find connected video devices.
          </Typography>
        ) : (
          <>
            {/* Camera selector */}
            {availableCameras.length > 0 && (
              <Select
                label="Select Camera Device"
                value={selectedDeviceId}
                onChange={(e: any) => switchPreview(e.target.value)}
                options={availableCameras.map((cam) => ({
                  label: cam.label || `Camera (${cam.deviceId.slice(0, 12)}...)`,
                  value: cam.deviceId,
                }))}
              />
            )}

            {/* Preview */}
            {previewStream && (
              <Box
                sx={{
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'black',
                  position: 'relative',
                }}
              >
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', display: 'block', maxHeight: 300 }}
                />
                <Badge
                  label="Live Preview"
                  color="green"
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                />
              </Box>
            )}

            {/* Add camera controls */}
            {previewStream && (
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <Box sx={{ flexGrow: 1 }}>
                  <Input
                    label="Camera Name"
                    value={cameraName}
                    onChange={(e: any) => setCameraName(e.target.value)}
                    placeholder="e.g. main, wrist, overhead"
                  />
                </Box>
                <Button onClick={handleAdd}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AddIcon fontSize="small" />
                    <span>Add Camera</span>
                  </Stack>
                </Button>
              </Stack>
            )}
          </>
        )}

        {/* Added cameras list */}
        {cameras.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Added Cameras ({cameras.length})
            </Typography>
            <Stack spacing={1}>
              {cameras.map((cam) => (
                <CameraCard key={cam.name} camera={cam} onRemove={handleRemove} />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

/** Individual camera card showing live feed */
const CameraCard: React.FC<{
  camera: CameraEntry;
  onRemove: (name: string) => void;
}> = ({ camera, onRemove }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.srcObject = camera.stream;
      video.play().catch(() => {});
    }
    return () => {
      if (video) video.srcObject = null;
    };
  }, [camera.stream]);

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 120,
            height: 68,
            borderRadius: 0.5,
            overflow: 'hidden',
            bgcolor: 'black',
            flexShrink: 0,
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
        <Box flexGrow={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <VideocamIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2">{camera.name}</Typography>
          </Stack>
          <Typography variant="caption" color="textSecondary">
            {camera.deviceLabel}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => onRemove(camera.name)} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );
};

export default CameraDiscovery;
