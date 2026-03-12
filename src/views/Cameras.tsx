import React from 'react';
import { Box } from '@mui/material';
import { ResourceManager, type GridCol } from '../ui/ResourceManager';
import { camerasTable } from '../db/schema';
import CameraForm from './CameraForm';

const CameraFields: GridCol[] = [
  { field: 'name', headerName: 'Name' },
];

const CamerasView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <ResourceManager title="Cameras" table={camerasTable} gridCols={CameraFields}
        renderForm={(props) => <CameraForm {...props} />}
      />
    </Box>
  );
};

export default CamerasView;
