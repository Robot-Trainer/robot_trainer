import React from 'react';
import { Box } from '@mui/material';
import { ResourceManager, type GridCol } from '../ui/ResourceManager';
import { camerasTable } from '../db/schema';

const CameraFields: GridCol[] = [
  { field: 'serialNumber', headerName: 'Serial Number' },
  { field: 'name', headerName: 'Name' },
  { field: 'resolution', headerName: 'Resolution' },
  { field: 'fps', headerName: 'FPS' },
];

const CamerasView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <ResourceManager title="Cameras" table={camerasTable} gridCols={CameraFields} />
    </Box>
  );
};

export default CamerasView;
