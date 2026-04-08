import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Grid,
  Typography,
  Stack,
  Box,
  Alert,
  Paper,
  CircularProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import UsbIcon from "@mui/icons-material/Usb";
import RefreshIcon from "@mui/icons-material/Refresh";
import CableIcon from "@mui/icons-material/Cable";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { robotModelsResource } from "../db/resources";
import { db } from "../db/db";
import {
  robotModelsTable,
  robotsTable,
  usbVendorsTable,
  type RobotModelSimProperties,
  type RobotSimProperties,
  type RobotRealProperties,
} from "../db/schema";
import { eq } from "drizzle-orm";
import MonacoEditor from "@monaco-editor/react";
import { MujocoPreview } from "../ui/MujocoPreview";
import { CalibrationDialog } from "../ui/CalibrationDialog";
import { CameraDiscovery } from "../ui/CameraDiscovery";
import { CameraEntry } from "../db/schema";
import Badge from "../ui/Badge";
import { normalizeCameraList } from "../types/camera";
import { RobotDetectorManager } from "../lib/robot_detectors";
import {
  getManagedWebSerialPorts,
  type ManagedWebSerialPort,
} from "@robot-trainer/serial";

interface DiscoveredPort {
  port: ManagedWebSerialPort["port"];
  vendorId: string;
  vendorLabel: string;
  productId: string;
  detectedModel: string | null;
}

interface RobotFormProps {
  onSaved?: (item: typeof robotsTable.$inferSelect) => Promise<unknown> | void;
  onCancel?: () => void;
  initialData?: typeof robotsTable.$inferSelect;
}
type RobotModality = "real" | "simulated";

const extractCameraSerialNumber = (camera: CameraEntry): string => {
  const explicitSerial = String((camera as CameraEntry).serialNumber || "").trim();
  if (explicitSerial) return explicitSerial;

  const label = String((camera as CameraEntry).deviceLabel || "");
  const serialMatch = label.match(/serial[:\s#-]*([a-zA-Z0-9._-]+)/i);
  if (serialMatch?.[1]) return serialMatch[1];

  return String(camera.deviceId || "").trim();
};

const getCameraResolutionAndFps = (
  camera: CameraEntry,
): { resolution: string; fps: number } => {
  const track = camera.stream?.getVideoTracks?.()[0];
  const settings = track?.getSettings?.();
  const width = typeof settings?.width === "number" ? settings.width : 0;
  const height = typeof settings?.height === "number" ? settings.height : 0;
  const frameRate =
    typeof settings?.frameRate === "number" ? settings.frameRate : 0;

  return {
    resolution: width > 0 && height > 0 ? `${width}x${height}` : "",
    fps: frameRate > 0 ? Math.round(frameRate) : 0,
  };
};

const getModelModalities = (model: typeof robotModelsTable.$inferSelect | undefined): RobotModality[] => {
  if (Array.isArray(model?.supportedModalities)) {
    const normalized = model.supportedModalities.filter(
      (m: unknown): m is RobotModality => m === "real" || m === "simulated",
    );
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
};

const getDetectedModelDisplayName = (
  detectedModel: string | null,
  modelOptions: typeof robotModelsTable.$inferSelect[],
): string => {
  if (!detectedModel) return "";

  const matchedModel = modelOptions.find((m) => m.dirName === detectedModel);
  return matchedModel?.name || detectedModel;
};

const TroubleshootingModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Troubleshooting Device Connection</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" paragraph>
          If your device is not showing up or its model isn't being detected automatically, there might be a connectivity or permission issue.
        </Typography>

        <Typography variant="h6" gutterBottom>
          Linux (Permissions)
        </Typography>
        <Typography variant="body2" paragraph>
          On Linux, your user might not have permission to access the serial device. Every time a device is plugged in, some permissions get reset unless configured correctly.
        </Typography>

        <Accordion variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">1. Permanent solution: Add your user to the device group (Recommended)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              This is the standard and safest way to gain persistent access. Once added, you will have permission to use any device that joins that group.
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                <Typography variant="body2">
                  <strong>Identify the group:</strong> Run <code>ls -l /dev/ttyACM*</code> or <code>ls -l /dev/ttyUSB*</code>. Look for the group name in the fourth column (typically <code>dialout</code> on Ubuntu/Debian or <code>uucp</code> on Arch/Fedora).
                </Typography>
              </li>
              <li style={{ marginTop: 8 }}>
                <Typography variant="body2">
                  <strong>Add your user:</strong> Run the following command (replace <code>dialout</code> with the group you found, and <code>your_username</code> with your login):
                </Typography>
                <Box sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 1, mt: 1, mb: 1 }}>
                  <code>sudo usermod -a -G dialout your_username</code>
                </Box>
              </li>
              <li style={{ marginTop: 8 }}>
                <Typography variant="body2">
                  <strong>Apply changes:</strong> You must log out and log back in (or reboot) for the group change to take effect.
                </Typography>
              </li>
            </ul>
          </AccordionDetails>
        </Accordion>

        <Accordion variant="outlined" sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">2. Create a UDEV rule</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              If the group method fails or you want specific permissions for one particular device, you can automate the chmod process using a udev rule.
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                <Typography variant="body2">
                  <strong>Create a new rules file:</strong>
                </Typography>
                <Box sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 1, mt: 1, mb: 1 }}>
                  <code>sudo nano /etc/udev/rules.d/99-serial.rules</code>
                </Box>
              </li>
              <li style={{ marginTop: 8 }}>
                <Typography variant="body2">
                  <strong>Add this line</strong> to give read/write access to all ttyACM devices:
                </Typography>
                <Box sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 1, mt: 1, mb: 1 }}>
                  <code>KERNEL=="ttyACM[0-9]*", MODE="0666"</code>
                </Box>
              </li>
              <li style={{ marginTop: 8 }}>
                <Typography variant="body2">
                  <strong>Save and exit.</strong> The rule will apply automatically the next time you plug in the device.
                </Typography>
              </li>
            </ul>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="ghost">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const CUSTOM_MODEL_VALUE = "custom";

const RobotForm: React.FC<RobotFormProps> = ({
  onSaved,
  onCancel,
  initialData,
}) => {
  const isEditing = !!initialData;
  const [discoveredPorts, setDiscoveredPorts] = useState<DiscoveredPort[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedPortIndex, setSelectedPortIndex] = useState<number | null>(null);
  const [devicePanelCollapsed, setDevicePanelCollapsed] = useState(false);
  const nameInputRef = useRef<HTMLDivElement>(null);
  const scanInProgress = useRef(false);
  const [name, setName] = useState("");
  const [modality, setModality] = useState<RobotModality>("real");
  const [robotModelId, setRobotModelId] = useState<string>("");
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [modelOptions, setModelOptions] = useState<typeof robotModelsTable.$inferSelect[]>([]);
  const [modelOptionItems, setModelOptionItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [isTeleoperator, setIsTeleoperator] = useState(false);

  const [realPortPath, setRealPortPath] = useState<string>("");
  const [disableTorqueOnDisconnect, setDisableTorqueOnDisconnect] =
    useState(true);
  const [useDegrees, setUseDegrees] = useState(false);
  const [maxRelativeTarget, setMaxRelativeTarget] = useState<string>("");
  const [calibrationDir, setCalibrationDir] = useState<string>("");
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationData, setCalibrationData] = useState<Record<string, unknown> | null>(null);

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

  // Monaco editor / 3D preview state for editing simulated robots
  const [editorXml, setEditorXml] = useState<string>("");
  const [previewXml, setPreviewXml] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const editorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the model's original XML to detect customization
  const [modelOriginalXml, setModelOriginalXml] = useState<string>("");

  // Camera discovery state for real robots
  const [discoveredCameras, setDiscoveredCameras] = useState<CameraEntry[]>([]);

  const filteredModelOptionItems = modelOptionItems.filter((opt) => {
    const model = modelOptions.find(
      (m: typeof robotModelsTable.$inferSelect) => String(m.id) === String(opt.value),
    );
    return model ? model.teleoperator === isTeleoperator : true;
  });

  const isCustomModel = robotModelId === CUSTOM_MODEL_VALUE;
  const isXmlCustomized =
    !!robotModelId &&
    !isCustomModel &&
    !!modelOriginalXml &&
    !!editorXml &&
    editorXml !== modelOriginalXml;

  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await robotModelsResource.list();
        setModelOptions(models);
        setModelOptionItems(
          models.map((m: typeof robotModelsTable.$inferSelect) => ({ label: m.name, value: String(m.id) })),
        );
      } catch (_e) {
        setModelOptions([]);
        setModelOptionItems([]);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!initialData) return;
    setName(initialData.name || "");
    setModality((initialData.modality as RobotModality) || "real");
    setSerialNumber(initialData.serialNumber || "");
    setIsTeleoperator(initialData.teleoperator === true);

    if (initialData.robotModelId) {
      setRobotModelId(String(initialData.robotModelId));
    } else if (initialData.modality === "simulated") {
      // Existing simulated robot with no model → treat as custom
      setRobotModelId(CUSTOM_MODEL_VALUE);
    } else {
      setRobotModelId("");
    }

    // Load real robot config from realProperties
    const realProps = (initialData.realProperties || {}) as RobotRealProperties;
    const cfg = realProps.config || {};
    setRealPortPath(cfg.port || "");
    setDisableTorqueOnDisconnect(cfg.disable_torque_on_disconnect ?? true);
    setUseDegrees(cfg.use_degrees ?? false);
    setMaxRelativeTarget(
      cfg.max_relative_target != null ? String(cfg.max_relative_target) : "",
    );
    setCalibrationDir(cfg.calibration_dir || "");
    setCalibrationData(realProps.calibration || null);

    // Load XML from simProperties for simulated robots
    const simProps = (initialData.simProperties || {}) as RobotSimProperties;
    const xml = simProps.xml_string || "";
    if (xml) {
      setEditorXml(xml);
      setPreviewXml(xml);
    }
  }, [initialData]);

  const selectedModel = modelOptions.find(
    (m: typeof robotModelsTable.$inferSelect) => String(m.id) === String(robotModelId),
  );
  const selectedModelModalities = isCustomModel
    ? (["simulated"] as RobotModality[])
    : getModelModalities(selectedModel);
  const selectedModelModality =
    selectedModelModalities.length === 1 ? selectedModelModalities[0] : null;

  useEffect(() => {
    if (selectedModelModality) {
      setModality(selectedModelModality);
    }
  }, [selectedModelModality]);

  // When selecting a model, load its XML into editor and track original
  useEffect(() => {
    if (!selectedModel) {
      if (!isCustomModel) {
        setModelOriginalXml("");
      }
      return;
    }
    const modelSimProps = (selectedModel.simProperties || {}) as RobotModelSimProperties;
    const modelXml = modelSimProps.xml_string || selectedModel.modelXml || "";
    setModelOriginalXml(modelXml);

    // For new robots or when switching models, populate editor with model's XML
    if (!initialData && modelXml) {
      setEditorXml(modelXml);
      setPreviewXml(modelXml);
    }
    // For existing robots, only populate if editor is empty
    if (initialData && !editorXml && modelXml) {
      setEditorXml(modelXml);
      setPreviewXml(modelXml);
    }
  }, [selectedModel, initialData]);

  // Debounced preview update when editor content changes
  const handleEditorChange = useCallback((value: string | undefined) => {
    const newXml = value || "";
    setEditorXml(newXml);

    if (editorTimerRef.current) {
      clearTimeout(editorTimerRef.current);
    }
    editorTimerRef.current = setTimeout(() => {
      setPreviewXml(newXml);
    }, 800);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (editorTimerRef.current) clearTimeout(editorTimerRef.current);
    };
  }, []);

  // Camera management callbacks
  const handleAddCamera = useCallback((camera: CameraEntry) => {
    setDiscoveredCameras((prev) => [...prev, camera]);
  }, []);

  const handleRemoveCamera = useCallback((cameraName: string) => {
    setDiscoveredCameras((prev) => prev.filter((c) => c.name !== cameraName));
  }, []);


  const handleSelectCalibrationDir = async () => {
    try {
      const dir = await window.electronAPI.selectDirectory();
      if (dir) setCalibrationDir(dir);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCalibrationSave = async (results: Record<string, unknown>) => {
    setCalibrationData(results);
    if (calibrationDir) {
      try {
        const fullPath = calibrationDir + "/calibration.json";
        await window.electronAPI.writeJsonFile(fullPath, results);
        console.log("Saved calibration back to ", fullPath);
      } catch (e) {
        console.error("Failed to save to dir", e);
      }
    }
    setIsCalibrating(false);
  };

  const handleSave = async () => {
    if (!onSaved) return;
    setSubmitting(true);
    try {
      const parsedModelId =
        isCustomModel || !robotModelId ? null : parseInt(robotModelId, 10);

      if (modality === "simulated") {
        // Build simProperties
        const simProps: RobotSimProperties = {
          ...(initialData?.simProperties as RobotSimProperties || {}),
        };

        if (isCustomModel && modelFileData) {
          // Custom model from uploaded file
          simProps.xml_string = modelFileData.content || editorXml;
          simProps.modelFormat = modelFileData.format;
          if (modelFilePath) {
            simProps.sourceDir = modelFilePath;
          }
        } else if (editorXml) {
          // Existing model or edited XML
          simProps.xml_string = editorXml;
        } else if (selectedModel) {
          // New robot with model — copy model's XML
          const modelSimProps = (selectedModel.simProperties || {}) as RobotModelSimProperties;
          simProps.xml_string = modelSimProps.xml_string || selectedModel.modelXml || "";
        }

        const payload = {
          name,
          modality: "simulated" as const,
          serialNumber: "",
          robotModelId: parsedModelId,
          teleoperator: isTeleoperator,
          data: { ...(initialData?.data || {}), type: "simulation" },
          simProperties: simProps,
          realProperties: {},
        };
        await onSaved(payload as typeof robotsTable.$inferSelect);
        return;
      }

      // Real robot save
      const maxRelativeTargetValue =
        maxRelativeTarget.trim() === "" ||
        Number.isNaN(Number(maxRelativeTarget))
          ? null
          : Number(maxRelativeTarget);

      const realProps: RobotRealProperties = {
        config: {
          port: realPortPath,
          disable_torque_on_disconnect: disableTorqueOnDisconnect,
          max_relative_target: maxRelativeTargetValue,
          use_degrees: useDegrees,
          calibration_dir: calibrationDir || undefined,
        },
        calibration: calibrationData || undefined,
      };

      // Save discovered cameras metadata (without live streams)
      if (discoveredCameras.length > 0) {
        realProps.cameras = normalizeCameraList(
          discoveredCameras.map((c) => {
            const { resolution, fps } = getCameraResolutionAndFps(c);
            return {
              id: Date.now() + Math.floor(Math.random() * 100000),
              name: c.name,
              resolution,
              fps,
              serialNumber: extractCameraSerialNumber(c),
              modality: "real",
            };
          }),
        );
      } else {
        realProps.cameras = [];
      }

      const payload = {
        name,
        modality: "real" as const,
        serialNumber,
        robotModelId: parsedModelId,
        teleoperator: isTeleoperator,
        data: { ...(initialData?.data || {}), type: "real" },
        realProperties: realProps,
        simProperties: {},
      };
      await onSaved(payload as typeof robotsTable.$inferSelect);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectModelFile = async () => {
    setModelFileError(null);
    try {
      const filePath = await window.electronAPI.selectModelFile();
      if (!filePath) return;
      setModelFilePath(filePath);
      const data = await window.electronAPI.readModelFile(filePath);
      setModelFileData(data);
      if (data.content) {
        setEditorXml(data.content);
        setPreviewXml(data.content);
      }
      if (!name) setName(data.baseName);
    } catch (err) {
      setModelFileError(err instanceof Error ? err.message : String(err));
      setModelFileData(null);
    }
  };

  const handleSelectModelFolder = async () => {
    setModelFileError(null);
    try {
      const folderPath = await window.electronAPI.selectModelFolder();
      if (!folderPath) return;
      setModelFilePath(folderPath);
      const data = await window.electronAPI.readModelFile(folderPath);
      setModelFileData(data);
      if (data.content) {
        setEditorXml(data.content);
        setPreviewXml(data.content);
      }
      if (!name) setName(data.baseName);
    } catch (err) {
      setModelFileError(err instanceof Error ? err.message : String(err));
      setModelFileData(null);
    }
  };

  const scanPorts = async () => {
    if (scanInProgress.current) return;
    scanInProgress.current = true;
    setScanning(true);
    setScanError(null);
    try {
      const ports = await getManagedWebSerialPorts({ requestIfEmpty: true });

      const detectorManager = new RobotDetectorManager();
      const results: DiscoveredPort[] = [];

      for (const { port, info, connection } of ports) {
        const vendorId = info.vendorId && info.vendorId !== "N/A" ? info.vendorId : "";
        const productId = info.productId && info.productId !== "N/A" ? info.productId : "";
        let vendorLabel = vendorId;

        const usbVendorId = port.getInfo().usbVendorId;

        if (usbVendorId != null) {
          const matchedVendor = await db
            .select({ company: usbVendorsTable.company })
            .from(usbVendorsTable)
            .where(eq(usbVendorsTable.vendorId, usbVendorId))
            .limit(1);

          vendorLabel = matchedVendor[0]?.company || vendorId;
        }

        let detectedModel: string | null = null;
        try {
          detectedModel = await detectorManager.detect(connection);
        } catch {
          // Detection failed — leave as null
        }

        results.push({ port, vendorId, vendorLabel, productId, detectedModel });
      }

      setDiscoveredPorts(results);

      if (results.length === 0) {
        setScanError("No serial devices found. Connect a device and click refresh.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setScanError(`Failed to scan USB ports: ${msg}`);
    } finally {
      scanInProgress.current = false;
      setScanning(false);
    }
  };

  // Auto-scan serial ports when adding a new robot
  useEffect(() => { if (!isEditing) { scanPorts(); } }, []);

  const handleDeviceSelect = async (dp: DiscoveredPort, index: number) => {
    setSelectedPortIndex(index);
    const initialName = dp.detectedModel || dp.vendorLabel || `Device ${index + 1}`;
    setName(initialName);
    setSerialNumber(dp.vendorId && dp.productId ? `${dp.vendorId}:${dp.productId}` : "");
    setDevicePanelCollapsed(true);
    if (calibrationDir == "") {
      const defaultDir = await window.electronAPI.getDefaultCalibrationRoot();
      const calibrationPath = initialName.replace(/\s+/g, "_").toLowerCase();
      setCalibrationDir(`${defaultDir}/${calibrationPath}`);
    }

    // Auto-populate robotModel if a model was detected and exists in loaded options
    if (dp.detectedModel) {
      const matchingModel = modelOptions.find(
        (m) => m.dirName === dp.detectedModel,
      );
      if (matchingModel) {
        setIsTeleoperator(matchingModel.teleoperator === true);

        setRobotModelId(String(matchingModel.id));
      }
    }

    // Focus name input after the collapse animation
    setTimeout(() => {
      nameInputRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 350);
  };

  const handleConnectionIconClick = async () => {
    setDevicePanelCollapsed(false);
    setSelectedPortIndex(null);
    await scanPorts();
  };

  const showExplicitModalitySelector = !isCustomModel && !selectedModelModality;
  const showSimulatedEditor = modality === "simulated" && (!!editorXml || !!initialData || (!isCustomModel && !!selectedModel));
  const showCustomFileUpload = modality === "simulated" && isCustomModel;

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
      {/* Left panel – device discovery (new robots only) */}
      {!isEditing && (
        <Box
          data-testid="device-panel"
          sx={{
            width: devicePanelCollapsed ? 0 : 350,
            minWidth: devicePanelCollapsed ? 0 : 350,
            overflow: "hidden",
            transition:
              "width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
            opacity: devicePanelCollapsed ? 0 : 1,
          }}
        >
          <Paper variant="outlined" sx={{ p: 2, minWidth: 330 }}>
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6" fontSize="1rem">
                  Detected Devices
                </Typography>
                <IconButton
                  size="small"
                  onClick={scanPorts}
                  disabled={scanning}
                  aria-label="Rescan ports"
                >
                  {scanning ? (
                    <CircularProgress size={18} />
                  ) : (
                    <RefreshIcon fontSize="small" />
                  )}
                </IconButton>
              </Stack>

              {scanError && (
                <Alert severity="error" sx={{ fontSize: "0.8rem" }}>
                  {scanError}
                </Alert>
              )}

              {scanning && discoveredPorts.length === 0 && (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <CircularProgress size={24} />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mt: 1 }}
                  >
                    Scanning for devices…
                  </Typography>
                </Box>
              )}

              {!scanning && discoveredPorts.length === 0 && (
                <Typography
                  variant="body2"
                  color="textSecondary"
                  align="center"
                  sx={{ py: 2 }}
                >
                  No serial devices found. Connect a device and click refresh.
                </Typography>
              )}

              {discoveredPorts.map((dp, i) => {
                const isSelected = selectedPortIndex === i;
                const detectedModelDisplayName = getDetectedModelDisplayName(
                  dp.detectedModel,
                  modelOptions,
                );
                const label = detectedModelDisplayName
                  ? `${detectedModelDisplayName}`
                  : `Device ${i + 1}`;
                return (
                  <Paper
                    key={i}
                    variant="outlined"
                    onClick={() => handleDeviceSelect(dp, i)}
                    sx={{
                      p: 1.5,
                      cursor: "pointer",
                      borderColor: isSelected ? "primary.main" : "divider",
                      bgcolor: isSelected
                        ? "rgba(25, 118, 210, 0.08)"
                        : "background.default",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: "action.hover",
                      },
                    }}
                    role="button"
                    aria-label={`Select device ${i + 1}`}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <UsbIcon
                        color={isSelected ? "primary" : "action"}
                        fontSize="small"
                      />
                      <Box flexGrow={1} sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {label}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          noWrap
                        >
                          {[
                            dp.vendorLabel,
                            detectedModelDisplayName || dp.productId,
                          ]
                            .filter(Boolean)
                            .join(" : ") || "Unknown"}
                        </Typography>
                        {dp.detectedModel && (
                          <Typography
                            variant="caption"
                            color="primary"
                            display="block"
                          >
                            ({dp.detectedModel})
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>

            <Box mt={2} display="flex" alignItems="center" justifyContent="center">
              <Link
                component="button"
                variant="caption"
                color="text.secondary"
                onClick={() => setShowTroubleshooting(true)}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textAlign: 'center' }}
              >
                Don't see your device, or it's not auto-detecting the robot type? <HelpOutlineIcon fontSize="inherit" />
              </Link>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Right panel – form */}
      <Stack
        spacing={3}
        sx={{ flex: 1, minWidth: 0, transition: "all 0.3s ease" }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box ref={nameInputRef}>
              <Input
                label="Robot Name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                placeholder="e.g. My Primary Arm"
              />
            </Box>
          </Grid>
          {modality === "real" && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Input
                label="Serial Number"
                value={serialNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSerialNumber(e.target.value)
                }
                placeholder="Auto-populated from device selection"
              />
            </Grid>
          )}
        </Grid>

        {modality === "real" && (
          <>

            {isEditing && (
              <>

                <Box mt={2}>
                  <Input
                    label="Serial Number"
                    value={serialNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSerialNumber(e.target.value)
                    }
                    placeholder="Auto-populated from device or enter manually"
                  />
                </Box>
              </>
            )}

            <Grid container spacing={2}>
            {/* <Grid size={{ xs: 12, md: 6 }}>
              <Input
                label="LeRobot Port"
                value={realPortPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRealPortPath(e.target.value)
                }
                placeholder="/dev/ttyUSB0"
              />
            </Grid> */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Select
                label="Disable Torque on Disconnect"
                value={disableTorqueOnDisconnect ? "true" : "false"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDisableTorqueOnDisconnect(e.target.value === "true")
                }
                options={[
                  { label: "True", value: "true" },
                  { label: "False", value: "false" },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Select
                label="Use Degrees"
                value={useDegrees ? "true" : "false"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUseDegrees(e.target.value === "true")
                }
                options={[
                  { label: "False", value: "false" },
                  { label: "True", value: "true" },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Input
                label="Max Relative Target"
                value={maxRelativeTarget}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMaxRelativeTarget(e.target.value)
                }
                placeholder="e.g. 5"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="flex-end">
                  <Box sx={{ flex: 1 }}>
                    <Input
                      label="Calibration Directory"
                      value={calibrationDir}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCalibrationDir(e.target.value)
                      }
                      placeholder="optional path"
                    />
                  </Box>
                  <Button
                    variant="ghost"
                    onClick={handleSelectCalibrationDir}
                    sx={{ mb: 1 }}
                  >
                    <FolderOpenIcon />
                  </Button>
                </Stack>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setIsCalibrating(true)}
                >
                  Calibrate Robot
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isTeleoperator}
                onChange={(e) => {
                  setIsTeleoperator(e.target.checked);
                  setRobotModelId("");
                }}
              />
            }
            label="Teleoperator"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack direction="row" alignItems="flex-end" spacing={1}>
            {!isEditing && devicePanelCollapsed && (
              <Tooltip title="Change connected device">
                <IconButton
                  onClick={handleConnectionIconClick}
                  color="primary"
                  aria-label="Change connected device"
                  sx={{ mb: 1 }}
                >
                  <CableIcon />
                </IconButton>
              </Tooltip>
            )}
            <Box sx={{ flex: 1 }}>
              <Select
                label="Robot Model"
                value={robotModelId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRobotModelId(e.target.value)
                }
                options={[
                  { label: "Select Robot Model...", value: "" },
                  { label: "Custom", value: CUSTOM_MODEL_VALUE },
                  ...filteredModelOptionItems,
                ]}
                renderOption={(opt) => {
                  if (opt.value === "" || opt.value === CUSTOM_MODEL_VALUE)
                    return opt.label;
                  const model = modelOptions.find(
                    (m: typeof robotModelsTable.$inferSelect) =>
                      String(m.id) === String(opt.value),
                  );
                  const modalities = getModelModalities(model);
                  return (
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ width: "100%" }}
                    >
                      <span>{opt.label}</span>
                      {modalities.map((mod) => (
                        <Badge
                          key={`${opt.value}-${mod}`}
                          label={mod}
                          color={mod === "real" ? "green" : "blue"}
                          variant="outlined"
                          sx={{
                            height: 20,
                            "& .MuiChip-label": { px: 0.5, fontSize: "0.7rem" },
                          }}
                        />
                      ))}
                    </Stack>
                  );
                }}
              />
            </Box>
            {isXmlCustomized && (
              <Tooltip title="The current robot is a customized version of this robot model.">
                <span>
                  <Badge
                    label="customized"
                    color="purple"
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                </span>
              </Tooltip>
            )}
          </Stack>
        </Grid>
        {showExplicitModalitySelector ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <Select
              label="Modality"
              value={modality}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setModality(e.target.value as RobotModality)
              }
              options={[
                { label: "Real", value: "real" },
                { label: "Simulated", value: "simulated" },
              ]}
            />
          </Grid>
        ) : (
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              This model is configured as{" "}
              <strong>{selectedModelModalities.join(" / ")}</strong>.
            </Typography>
          </Grid>
        )}
      </Grid>
      {modality === "real" && (
        <CameraDiscovery
          cameras={discoveredCameras}
          onAdd={handleAddCamera}
          onRemove={handleRemoveCamera}
        />
      )}

      {showCustomFileUpload && (
        <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
          <Stack spacing={2}>
            <Typography variant="h6" fontSize="1rem">
              Custom Model File (MJCF)
            </Typography>

            <Stack direction="row" spacing={2}>
              <Button variant="ghost" onClick={handleSelectModelFile}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <UploadFileIcon fontSize="small" />
                  <span>
                    {modelFilePath ? "Change File..." : "Upload Model File..."}
                  </span>
                </Stack>
              </Button>
              <Button variant="ghost" onClick={handleSelectModelFolder}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FolderOpenIcon fontSize="small" />
                  <span>Select Folder...</span>
                </Stack>
              </Button>
            </Stack>

            {modelFileError && <Alert severity="error">{modelFileError}</Alert>}

            {modelFileData && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "grey.300",
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  {modelFileData.baseName}.
                  {modelFileData.format === "urdf" ? "urdf" : "xml"}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  sx={{ mb: 1 }}
                >
                  <Badge
                    label={modelFileData.format.toUpperCase()}
                    color="blue"
                    variant="outlined"
                  />
                  <Badge
                    label={`${modelFileData.metadata.numJoints} joints`}
                    color="gray"
                    variant="outlined"
                  />
                  <Badge
                    label={`${modelFileData.metadata.actuatorNames.length} actuators`}
                    color="gray"
                    variant="outlined"
                  />
                  {modelFileData.metadata.hasGripper && (
                    <Badge
                      label="Gripper detected"
                      color="green"
                      variant="outlined"
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="textSecondary">
                  Joints:{" "}
                  {modelFileData.metadata.jointNames.join(", ") || "None"}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {showSimulatedEditor && (
        <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
          <Typography variant="h6" fontSize="1rem" sx={{ mb: 2 }}>
            Model XML Editor
          </Typography>

          <Grid container spacing={2}>
            {/* Left: Monaco Editor */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  overflow: "hidden",
                  height: 500,
                }}
              >
                <MonacoEditor
                  height="100%"
                  language="xml"
                  theme="vs-dark"
                  value={editorXml}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </Box>
            </Grid>

            {/* Right: 3D Preview */}
            <Grid size={{ xs: 12, md: 6 }}>
              <MujocoPreview
                xml={previewXml}
                height={500}
                onError={(err) => setPreviewError(err)}
                onSuccess={() => setPreviewError(null)}
              />
            </Grid>
          </Grid>

          {previewError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">XML Error</Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
              >
                {previewError}
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      <Stack
        direction="row"
        justifyContent="flex-end"
        spacing={2}
        sx={{ mt: 2 }}
      >
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={submitting}>
          {submitting ? "Saving..." : "Save Robot"}
        </Button>
      </Stack>
      {isCalibrating && (
        <CalibrationDialog
          open={isCalibrating}
          onClose={() => setIsCalibrating(false)}
          onSave={handleCalibrationSave}
          robotType={selectedModel?.dirName || "so100_follower"}
          port={selectedPortIndex != null ? discoveredPorts[selectedPortIndex]?.port as SerialPort : undefined}
          serialNumber={serialNumber}
          robotName={name || selectedModel?.name}
        />
      )}
        <TroubleshootingModal
          open={showTroubleshooting}
          onClose={() => setShowTroubleshooting(false)}
        />
      </Stack>
    </Box>
  );
};

export default RobotForm;
