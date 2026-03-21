import React, { useMemo, useState } from "react";
import {
  Box,
  Divider,
  IconButton,
  ListSubheader,
  MenuItem,
  TextField,
} from "@mui/material";
import { Pencil, Plus } from "../icons";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import Badge from "../ui/Badge";
import { normalizeCamera, type CameraData } from "../types/camera";

interface CameraEditorProps {
  camera: CameraData;
  onSave: (next: CameraData) => void;
  onCancel: () => void;
}

const CameraEditor: React.FC<CameraEditorProps> = ({
  camera,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(camera.name);
  const [serialNumber, setSerialNumber] = useState(camera.serialNumber);
  const [resolution, setResolution] = useState(camera.resolution || "1280x720");
  const [fps, setFps] = useState<number>(camera.fps || 30);

  const [posX, setPosX] = useState<number>(camera.pose.pos[0]);
  const [posY, setPosY] = useState<number>(camera.pose.pos[1]);
  const [posZ, setPosZ] = useState<number>(camera.pose.pos[2]);
  const [quatW, setQuatW] = useState<number>(camera.pose.quat[0]);
  const [quatX, setQuatX] = useState<number>(camera.pose.quat[1]);
  const [quatY, setQuatY] = useState<number>(camera.pose.quat[2]);
  const [quatZ, setQuatZ] = useState<number>(camera.pose.quat[3]);
  const [xyaxesX1, setXyaxesX1] = useState<number>(camera.pose.xyaxes[0]);
  const [xyaxesY1, setXyaxesY1] = useState<number>(camera.pose.xyaxes[1]);
  const [xyaxesZ1, setXyaxesZ1] = useState<number>(camera.pose.xyaxes[2]);
  const [xyaxesX2, setXyaxesX2] = useState<number>(camera.pose.xyaxes[3]);
  const [xyaxesY2, setXyaxesY2] = useState<number>(camera.pose.xyaxes[4]);
  const [xyaxesZ2, setXyaxesZ2] = useState<number>(camera.pose.xyaxes[5]);

  const isReal = camera.modality === "real";

  const handleSave = () => {
    onSave(
      normalizeCamera({
        ...camera,
        name,
        serialNumber: isReal
          ? serialNumber
          : serialNumber || `sim-cam-${camera.id}`,
        modality: isReal ? "real" : "simulated",
        resolution,
        fps,
        pose: {
          pos: [posX, posY, posZ],
          quat: [quatW, quatX, quatY, quatZ],
          xyaxes: [xyaxesX1, xyaxesY1, xyaxesZ1, xyaxesX2, xyaxesY2, xyaxesZ2],
        },
      }),
    );
  };

  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4 shadow-sm relative">
      <h4 className="font-semibold text-sm text-gray-700">
        Edit {isReal ? "Real" : "Simulated"} Camera
      </h4>

      <Input
        label="Name"
        value={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setName(e.target.value)
        }
      />

      {isReal ? (
        <Input
          label="Serial Number"
          value={serialNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setSerialNumber(e.target.value)
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Resolution"
              value={resolution}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                setResolution(e.target.value)
              }
              options={[
                { label: "1280x720 (720p)", value: "1280x720" },
                { label: "1920x1080 (1080p)", value: "1920x1080" },
                { label: "640x480 (480p)", value: "640x480" },
              ]}
            />
            <Input
              label="FPS"
              type="number"
              value={fps}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                setFps(Number(e.target.value))
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="POS X" type="number" value={posX} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPosX(Number(e.target.value))} />
            <Input placeholder="POS Y" type="number" value={posY} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPosY(Number(e.target.value))} />
            <Input placeholder="POS Z" type="number" value={posZ} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPosZ(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="QUAT W" type="number" value={quatW} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setQuatW(Number(e.target.value))} />
            <Input placeholder="QUAT X" type="number" value={quatX} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setQuatX(Number(e.target.value))} />
            <Input placeholder="QUAT Y" type="number" value={quatY} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setQuatY(Number(e.target.value))} />
            <Input placeholder="QUAT Z" type="number" value={quatZ} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setQuatZ(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-6 gap-2">
            <Input placeholder="X1" type="number" value={xyaxesX1} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setXyaxesX1(Number(e.target.value))} />
            <Input placeholder="Y1" type="number" value={xyaxesY1} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setXyaxesY1(Number(e.target.value))} />
            <Input placeholder="Z1" type="number" value={xyaxesZ1} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setXyaxesZ1(Number(e.target.value))} />
            <Input placeholder="X2" type="number" value={xyaxesX2} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setXyaxesX2(Number(e.target.value))} />
            <Input placeholder="Y2" type="number" value={xyaxesY2} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setXyaxesY2(Number(e.target.value))} />
            <Input placeholder="Z2" type="number" value={xyaxesZ2} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setXyaxesZ2(Number(e.target.value))} />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel} className="text-xs">
          Cancel
        </Button>
        <Button onClick={handleSave} className="text-xs">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

interface CameraSelectionDropdownProps {
  cameras: CameraData[];
  selectedCameraId: number | null;
  onSelect: (id: number) => void;
  onCamerasChanged: (next: CameraData[]) => void;
  label?: string;
  onRemove?: (id: number) => void;
}

export const CameraSelectionDropdown: React.FC<CameraSelectionDropdownProps> = ({
  cameras,
  selectedCameraId,
  onSelect,
  onCamerasChanged,
  label,
  onRemove,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const normalized = useMemo(() => cameras.map((c) => normalizeCamera(c)), [cameras]);

  const createCamera = (data: Partial<CameraData> & Record<string, unknown>) => {
    const created = normalizeCamera(data);
    const next = [...normalized, created];
    onCamerasChanged(next);
    onSelect(created.id);
    setEditingId(created.id);
  };

  const updateCamera = (camera: CameraData) => {
    const next = normalized.map((c) => (c.id === camera.id ? camera : c));
    onCamerasChanged(next);
    setEditingId(null);
  };

  const xmlCameras = normalized.filter((c) => c.isXml);
  const realCameras = normalized.filter((c) => c.modality === "real" && !c.isXml);
  const simCameras = normalized.filter((c) => c.modality === "simulated" && !c.isXml);
  const selectedCamera = normalized.find((c) => c.id === selectedCameraId);

  if (editingId !== null) {
    const cam = normalized.find((c) => c.id === editingId);
    if (cam) {
      return (
        <div className="mb-4">
          {label && (
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {label}
            </label>
          )}
          <CameraEditor
            camera={cam}
            onSave={updateCamera}
            onCancel={() => setEditingId(null)}
          />
        </div>
      );
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "__create_real__") {
      createCamera({
        id: Date.now(),
        name: `Real Camera ${new Date().toLocaleString()}`,
        modality: "real",
      });
      return;
    }
    if (val === "__create_sim__") {
      createCamera({
        id: Date.now(),
        name: `Simulated Camera ${new Date().toLocaleString()}`,
        modality: "simulated",
        resolution: "1280x720",
        fps: 30,
      });
      return;
    }
    if (val) onSelect(Number(val));
  };

  return (
    <Box mb={2}>
      <Box display="flex" gap={1} alignItems="flex-start">
        <TextField
          select
          label={label || "Camera"}
          value={selectedCameraId || ""}
          onChange={handleChange}
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
          SelectProps={{
            renderValue: (selected) => {
              const c = normalized.find((cam) => cam.id === selected);
              if (!c) {
                if (selected) {
                  return (
                    <span className="text-gray-700 font-medium">
                      Unknown camera (id: {String(selected)})
                    </span>
                  );
                }
                return <span className="text-gray-500">Select or create camera...</span>;
              }
              return (
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <span className="font-medium">{c.name}</span>
                  {c.isXml ? (
                    <Badge color="purple" tooltip="Defined in XML">xml</Badge>
                  ) : c.modality === "real" ? (
                    <Badge color="green">real</Badge>
                  ) : (
                    <Badge color="blue">simulated</Badge>
                  )}
                </Box>
              );
            },
          }}
        >
          {selectedCameraId !== null && !selectedCamera && (
            <MenuItem
              key="__selected_missing_camera__"
              value={selectedCameraId}
              disabled
              sx={{ fontStyle: "italic" }}
            >
              Unknown camera (id: {selectedCameraId})
            </MenuItem>
          )}
          {realCameras.length > 0 && <ListSubheader>Real</ListSubheader>}
          {realCameras.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
          {simCameras.length > 0 && <ListSubheader>Simulated</ListSubheader>}
          {simCameras.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
          {xmlCameras.length > 0 && <ListSubheader>XML Defined</ListSubheader>}
          {xmlCameras.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
          <Divider />
          <MenuItem value="__create_real__" sx={{ color: "primary.main", gap: 1 }}>
            <Plus className="w-4 h-4" /> Create New Real Camera
          </MenuItem>
          <MenuItem value="__create_sim__" sx={{ color: "primary.main", gap: 1 }}>
            <Plus className="w-4 h-4" /> Create New Simulated Camera
          </MenuItem>
        </TextField>

        {selectedCamera && !selectedCamera.isXml && (
          <IconButton
            onClick={() => setEditingId(selectedCamera.id)}
            size="small"
            sx={{ border: "1px solid #e5e7eb", borderRadius: 1, p: "8px", mt: "2px" }}
            title="Edit Camera Properties"
          >
            <Pencil className="w-5 h-5 text-gray-500" />
          </IconButton>
        )}
        {onRemove && (
          <IconButton
            onClick={() => onRemove(selectedCameraId ?? -1)}
            size="small"
            color="default"
            sx={{ mt: "2px" }}
            title="Remove Camera slot"
          >
            <span className="text-lg font-bold leading-none">×</span>
          </IconButton>
        )}
      </Box>
    </Box>
  );
};
