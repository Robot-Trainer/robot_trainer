import React from 'react';
import { Box } from '@mui/material';
import ResourceManager from '../ui/ResourceManager';
import { robotModelsTable } from '../db/schema';

export const robotModelFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'dirName', label: 'Dir Name', required: true },
  { name: 'className', label: 'Class Name', required: true },
  { name: 'configClassName', label: 'Config Class Name', required: true },
  { name: 'properties', label: 'Properties', defaultValue: '{}' },
  { name: 'modelXml', label: 'Model XML' },
  { name: 'modelPath', label: 'Model Path' },
  { name: 'modelFormat', label: 'Model Format' },
];

const RobotModelsView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <ResourceManager
        title="Robot Models"
        table={robotModelsTable}
        fields={robotModelFields}
      />
    </Box>
  );
};

export default RobotModelsView;
