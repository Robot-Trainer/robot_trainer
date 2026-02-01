import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { CameraSelectionDropdown } from './CameraSelectionDropdown';
import { camerasResource } from '../db/resources';

interface CameraConfigurationFormProps {
  initialCameras?: any[];
  onSave?: (cameras: any[]) => void;
  onCancel?: () => void;
}

const CameraConfigurationForm: React.FC<CameraConfigurationFormProps> = ({ initialCameras = [], onSave, onCancel }) => {
  const [cameraSlots, setCameraSlots] = useState<{ id: number | null, key: number }[]>([]);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCameras = async () => {
    try {
      const cams = await camerasResource.list();
      setAvailableCameras(cams);
      return cams;
    } catch (e) {
      console.error("Failed to load cameras", e);
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      const cams = await refreshCameras();
      setLoading(false);

      if (initialCameras && initialCameras.length > 0) {
        const slots = initialCameras.map((c, i) => {
          // Check if initial camera exists in DB
          const exists = c.id && typeof c.id === 'number' && cams.find((dbCam: any) => dbCam.id === c.id);
          return {
            id: exists ? c.id : null,
            key: Date.now() + i
          };
        });
        setCameraSlots(slots);
      } else {
        // Start with one empty slot if nothing provided
        setCameraSlots([{ id: null, key: Date.now() }]);
      }
    };
    init();
  }, []); // Run once on mount

  const addSlot = () => {
    setCameraSlots([...cameraSlots, { id: null, key: Date.now() }]);
  };

  const removeSlot = (index: number) => {
    const newSlots = [...cameraSlots];
    newSlots.splice(index, 1);
    setCameraSlots(newSlots);
  };

  const updateSlot = (index: number, cameraId: number) => {
    const newSlots = [...cameraSlots];
    newSlots[index].id = cameraId;
    setCameraSlots(newSlots);
  };

  const handleSave = () => {
    // Filter to get full camera objects
    const selectedIds = cameraSlots.map(s => s.id).filter((id): id is number => id !== null);
    const selectedCameras = selectedIds.map(id => availableCameras.find(c => c.id === id)).filter(Boolean);

    if (onSave) {
      onSave(selectedCameras);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
        <div>
          <h3 className="text-lg font-medium">Cameras</h3>
          <p className="text-sm text-gray-500">Configure cameras. You can select existing cameras or create new ones.</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading && <div className="text-sm text-gray-500">Loading cameras...</div>}

        {!loading && cameraSlots.map((slot, idx) => (
          <CameraSelectionDropdown
            key={slot.key}
            label={`Camera ${idx + 1}`}
            cameras={availableCameras}
            selectedCameraId={slot.id}
            onSelect={(id) => updateSlot(idx, id)}
            onCamerasChanged={refreshCameras}
            onRemove={() => removeSlot(idx)}
          />
        ))}

        <div className="pt-2">
          <Button variant="secondary" onClick={addSlot} className="text-sm">
            + Add Another Camera
          </Button>
        </div>

        {onSave && (
          <div className="mt-8 flex justify-end gap-2 border-t pt-4">
            {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
            <Button onClick={handleSave}>Save Configuration</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraConfigurationForm;
