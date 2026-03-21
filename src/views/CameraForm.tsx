import React, { useState } from "react";
import {
  Box,
  Stack,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Grid,
} from "@mui/material";
import CameraDiscoveryPanel from "../ui/CameraDiscovery";
import UiInput from "../ui/Input";
import UiButton from "../ui/Button";

type CameraModality = "real" | "simulated";

type CameraFormData = {
  name: string;
  modality: CameraModality;
  serialNumber: string;
  resolution: string;
  fps: number;
};

interface CameraFormProps {
  onCancel: () => void;
  onSaved: (item: CameraFormData) => Promise<void>;
  initialData?: Partial<CameraFormData>;
}

const CameraForm: React.FC<CameraFormProps> = ({
  onCancel,
  onSaved,
  initialData,
}) => {
  const [modality, setModality] = useState<CameraModality>(
    initialData?.modality || "real",
  );

  // Shared state
  const [name, setName] = useState(initialData?.name || "");
  const [resolution, setResolution] = useState(initialData?.resolution || "");
  const [fps, setFps] = useState(initialData?.fps || 0);

  // Real specific
  const [serialNumber, setSerialNumber] = useState(
    initialData?.serialNumber || "",
  );

  const handleSave = async () => {
    const data: CameraFormData = {
      ...(initialData || {}),
      name,
      modality,
      serialNumber: modality === "real" ? serialNumber : "",
      resolution,
      fps: Number(fps),
    };
    await onSaved(data);
  };

  return (
    <Box>
      <Typography variant="h6" mb={3}>
        {initialData ? "Edit" : "Create"} Camera
      </Typography>

      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Camera Type</FormLabel>
        <RadioGroup
          row
          value={modality}
          onChange={(e) => setModality(e.target.value as "real" | "simulated")}
        >
          <FormControlLabel
            value="real"
            control={<Radio />}
            label="Real Camera"
          />
          <FormControlLabel
            value="simulated"
            control={<Radio />}
            label="Simulated Camera"
          />
        </RadioGroup>
      </FormControl>

      {modality === "real" ? (
        <Box sx={{ mb: 3 }}>
          <CameraDiscoveryPanel
            cameras={[]}
            mode="single"
            initialDeviceId={serialNumber}
            initialName={name}
            onSelectionChange={(data) => {
              setSerialNumber(data.deviceId);
              setName(data.name);
            }}
          />
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
            <UiInput
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Camera Name"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <UiInput
              label="Resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="e.g. 1920x1080"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <UiInput
              label="FPS"
              type="number"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              placeholder="e.g. 30"
            />
          </Grid>
        </Grid>
      )}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <UiButton variant="ghost" onClick={onCancel}>
          Cancel
        </UiButton>
        <UiButton onClick={handleSave}>
          {initialData ? "Save" : "Create"}
        </UiButton>
      </Stack>
    </Box>
  );
};

export default CameraForm;
