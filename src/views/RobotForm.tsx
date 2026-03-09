import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Grid,
  Typography,
  Stack,
  Box,
  Alert,
  Paper,
  CircularProgress,
  Chip,
} from "@mui/material";
import UsbIcon from "@mui/icons-material/Usb";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { robotModelsResource } from "../db/resources";
import { db } from "../db/db";
import { eq } from "drizzle-orm";
import { robotModelsTable, scenesTable, sceneRobotsTable } from "../db/schema";
import Editor from "@monaco-editor/react";
import MujocoPreview from "../ui/MujocoPreview";
import CameraDiscovery, { type CameraEntry } from "../ui/CameraDiscovery";

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

type RobotModality = "real" | "simulated";

const extractCameraSerialNumber = (camera: CameraEntry): string => {
  const explicitSerial = String((camera as any).serialNumber || "").trim();
  if (explicitSerial) return explicitSerial;

  const label = String((camera as any).deviceLabel || "");
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

const getModelModality = (model: any): RobotModality | null => {
  if (model?.modality === "real" || model?.modality === "simulated") {
    return model.modality;
  }

  const cls = String(model?.className || "").toLowerCase();
  if (cls.includes("follower")) return "real";
  if (cls.includes("mujoco") || cls.includes("sim")) return "simulated";
  return null;
};

const RobotForm: React.FC<RobotFormProps> = ({
  onSaved,
  onCancel,
  initialData,
}) => {
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [modality, setModality] = useState<RobotModality>("real");
  const [robotModelId, setRobotModelId] = useState<string>("");
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [modelOptions, setModelOptions] = useState<any[]>([]);
  const [modelOptionItems, setModelOptionItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  const [realPortPath, setRealPortPath] = useState<string>("");
  const [disableTorqueOnDisconnect, setDisableTorqueOnDisconnect] =
    useState(true);
  const [useDegrees, setUseDegrees] = useState(false);
  const [maxRelativeTarget, setMaxRelativeTarget] = useState<string>("");
  const [robotConfigId, setRobotConfigId] = useState<string>("");
  const [calibrationDir, setCalibrationDir] = useState<string>("");

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

  // Camera discovery state for real robots
  const [discoveredCameras, setDiscoveredCameras] = useState<CameraEntry[]>([]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await robotModelsResource.list();
        setModelOptions(models);
        setModelOptionItems(
          models.map((m: any) => ({ label: m.name, value: String(m.id) })),
        );
      } catch (e) {
        setModelOptions([]);
        setModelOptionItems([]);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!initialData) return;
    setName(initialData.name || "");
    setNotes(initialData.notes || "");
    setModality((initialData.modality as RobotModality) || "real");
    setSerialNumber(initialData.serialNumber || "");
    setRobotModelId(
      initialData.robotModelId ? String(initialData.robotModelId) : "",
    );

    const cfg = initialData.data?.config || {};
    setRealPortPath(cfg.port || "");
    setDisableTorqueOnDisconnect(cfg.disable_torque_on_disconnect ?? true);
    setUseDegrees(cfg.use_degrees ?? false);
    setMaxRelativeTarget(
      cfg.max_relative_target != null ? String(cfg.max_relative_target) : "",
    );
    setRobotConfigId(cfg.id || "");
    setCalibrationDir(cfg.calibration_dir || "");

    // Load modelXml for editing simulated robots
    const xml = initialData.data?.modelXml || "";
    if (xml) {
      setEditorXml(xml);
      setPreviewXml(xml);
    }

    // Load saved cameras for real robots
    const savedCams = initialData.data?.cameras;
    if (Array.isArray(savedCams)) {
      // Cameras are serialized without live streams — we don't restore streams here
      // The user will re-detect cameras when editing
    }
  }, [initialData]);

  const selectedModel = modelOptions.find(
    (m: any) => String(m.id) === String(robotModelId),
  );
  const selectedModelModality = getModelModality(selectedModel);

  useEffect(() => {
    if (selectedModelModality) {
      setModality(selectedModelModality);
    }
  }, [selectedModelModality]);

  // When editing an existing simulated robot, load modelXml from the linked robot model
  useEffect(() => {
    if (!initialData || !selectedModel) return;
    if (selectedModel.modelXml && !editorXml) {
      setEditorXml(selectedModel.modelXml);
      setPreviewXml(selectedModel.modelXml);
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

  const handleSave = async () => {
    if (!onSaved) return;
    setSubmitting(true);
    try {
      if (modality === "simulated" && modelFileData && !initialData) {
        const modelName = name || modelFileData.baseName;

        let pathForDb: string | undefined = undefined;
        const xmlForDb: string | null = null;

        if (modelFilePath) {
          if (modelFileData.format === "zip") {
            const result = await (window as any).electronAPI.saveRobotModelZip(
              modelFilePath,
            );
            pathForDb = result.modelPath;
          } else {
            const result = await (window as any).electronAPI.saveRobotModelFile(
              modelFilePath,
            );
            pathForDb = result.modelPath;
          }
        }

        const [insertedModel] = await db
          .insert(robotModelsTable)
          .values({
            name: modelName,
            dirName: "custom",
            className: "GenericMujocoEnv",
            configClassName: "CustomMujocoEnvConfig",
            modelXml: xmlForDb,
            modelPath: pathForDb,
            modelFormat: modelFileData.format,
            properties: modelFileData.metadata,
          })
          .returning();

        const payload = {
          name: modelName,
          notes,
          modality: "simulated" as const,
          serialNumber: "",
          robotModelId: insertedModel.id,
          data: { type: "simulation" },
          _autoCreateConfig: true,
          _modelMetadata: modelFileData.metadata,
        };

        const createdRobot = await onSaved(payload);

        if (createdRobot && createdRobot.id) {
          const [scene] = await db
            .insert(scenesTable)
            .values({
              name: `${modelName} Scene`,
            })
            .returning();

          await db.insert(sceneRobotsTable).values({
            sceneId: scene.id,
            robotId: createdRobot.id,
            snapshot: {
              id: createdRobot.id,
              name: modelName,
              modality: "simulated",
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
        maxRelativeTarget.trim() === "" ||
        Number.isNaN(Number(maxRelativeTarget))
          ? null
          : Number(maxRelativeTarget);

      const payloadData = {
        ...(initialData?.data || {}),
        type: modality === "real" ? "real" : "simulation",
      } as any;

      if (modality === "real") {
        payloadData.config = {
          ...(payloadData.config || {}),
          port: realPortPath,
          disable_torque_on_disconnect: disableTorqueOnDisconnect,
          max_relative_target: maxRelativeTargetValue,
          use_degrees: useDegrees,
          id: robotConfigId || null,
          calibration_dir: calibrationDir || null,
        };

        // Save discovered cameras metadata (without live streams)
        if (discoveredCameras.length > 0) {
          payloadData.cameras = discoveredCameras.map((c) => {
            const { resolution, fps } = getCameraResolutionAndFps(c);
            return {
              name: c.name,
              resolution,
              fps,
              serial_number: extractCameraSerialNumber(c),
              modality: "real",
            };
          });
        }
      } else if (payloadData.config) {
        delete payloadData.config;
      }

      // Save edited modelXml for simulated robots
      if (modality === "simulated" && editorXml && initialData) {
        payloadData.modelXml = editorXml;

        // Also update the linked robot model's modelXml in the database
        if (selectedModel?.id) {
          try {
            await db
              .update(robotModelsTable)
              .set({ modelXml: editorXml })
              .where(eq(robotModelsTable.id, selectedModel.id));
          } catch {
            // non-critical; the data is still saved on the robot
          }
        }
      }

      const payload = {
        name,
        notes,
        modality,
        serialNumber: modality === "real" ? serialNumber : "",
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
        setScanError(
          "Permission denied when accessing serial ports. Try running with appropriate permissions.",
        );
      } else if (msg.match(/no ports|no devices|Could not find any/i)) {
        setScanError(
          "No serial devices found. Ensure devices are connected and try again.",
        );
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
            options={[
              { label: "Select Robot Model...", value: "" },
              ...modelOptionItems,
            ]}
            renderOption={(opt) => {
              if (opt.value === "") return opt.label;
              const model = modelOptions.find(
                (m: any) => String(m.id) === String(opt.value),
              );
              const mod = getModelModality(model);
              return (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ width: "100%" }}
                >
                  <span>{opt.label}</span>
                  {mod === "real" && (
                    <Chip
                      label="Real"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{
                        height: 20,
                        "& .MuiChip-label": { px: 0.5, fontSize: "0.7rem" },
                      }}
                    />
                  )}
                  {mod === "simulated" && (
                    <Chip
                      label="Sim"
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{
                        height: 20,
                        "& .MuiChip-label": { px: 0.5, fontSize: "0.7rem" },
                      }}
                    />
                  )}
                </Stack>
              );
            }}
          />
        </Grid>
        {showExplicitModalitySelector ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <Select
              label="Modality"
              value={modality}
              onChange={(e: any) =>
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

      {modality === "real" && (
        <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6" fontSize="1rem">
              Real Robot Configuration (LeRobot)
            </Typography>
            <Button variant="ghost" onClick={scanPorts} disabled={scanning}>
              <Stack direction="row" spacing={1} alignItems="center">
                {scanning ? (
                  <CircularProgress size={16} />
                ) : (
                  <RefreshIcon fontSize="small" />
                )}
                <span>{scanning ? "Scanning..." : "Scan Ports"}</span>
              </Stack>
            </Button>
          </Stack>

          {scanError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {scanError}
            </Alert>
          )}

          {serialPorts.length === 0 && !scanning ? (
            <Typography
              variant="body2"
              color="textSecondary"
              align="center"
              sx={{ py: 2 }}
            >
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
                      setSerialNumber(p.serialNumber || "");
                      setRealPortPath(p.path || "");
                    }}
                    sx={{
                      p: 1.5,
                      cursor: "pointer",
                      borderColor: isSelected ? "primary.main" : "divider",
                      bgcolor: isSelected
                        ? "primary.soft"
                        : "background.default",
                      backgroundColor: isSelected
                        ? "rgba(25, 118, 210, 0.08)"
                        : undefined,
                      transition: "all 0.2s",
                      "&:hover": { borderColor: "primary.main" },
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
                      {isSelected && (
                        <Typography
                          variant="caption"
                          color="primary"
                          fontWeight="bold"
                        >
                          SELECTED
                        </Typography>
                      )}
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
                value={disableTorqueOnDisconnect ? "true" : "false"}
                onChange={(e: any) =>
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
                onChange={(e: any) => setUseDegrees(e.target.value === "true")}
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

      {modality === "real" && (
        <CameraDiscovery
          cameras={discoveredCameras}
          onAdd={handleAddCamera}
          onRemove={handleRemoveCamera}
        />
      )}

      {modality === "simulated" && !initialData && (
        <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
          <Stack spacing={2}>
            <Typography variant="h6" fontSize="1rem">
              Model File (MJCF)
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
                  <Chip
                    label={modelFileData.format.toUpperCase()}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${modelFileData.metadata.numJoints} joints`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${modelFileData.metadata.actuatorNames.length} actuators`}
                    size="small"
                    variant="outlined"
                  />
                  {modelFileData.metadata.hasGripper && (
                    <Chip
                      label="Gripper detected"
                      size="small"
                      color="success"
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

      {modality === "simulated" && initialData && (
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
                <Editor
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
    </Stack>
  );
};

export default RobotForm;
