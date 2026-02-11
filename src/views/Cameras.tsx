import React from 'react';
import { Box } from '@mui/material';
import ResourceManager from '../ui/ResourceManager';
import { camerasTable } from '../db/schema';
import { db } from '../db/db';

const CameraFields = [
  { name: 'serialNumber', label: 'Serial Number' },
  { name: 'name', label: 'Name' },
  { name: 'resolution', label: 'Resolution' },
  { name: 'fps', label: 'FPS', type: 'number' },
];

const CamerasView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <ResourceManager title="Cameras" table={camerasTable} />
    </Box>
  );
};

export default CamerasView;
