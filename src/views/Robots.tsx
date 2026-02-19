import React from 'react';
import { Box } from '@mui/material';
import ResourceManager from '../ui/ResourceManager';
import { robotsTable } from '../db/schema';
import RobotForm from './RobotForm';


const gridCols: GridCol[] = [
  {
    field: "name",
    headerName: "Name",
    render: (row: any) => row.name
  },
  {
    field: "modality",
    headerName: "Modality",
    render: (row: any) => row.modality
  },
];

const RobotsView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <ResourceManager
        title="Robots"
        table={robotsTable}
        gridCols={gridCols}
        renderForm={(props) => <RobotForm {...props} />}
      />
    </Box>
  );
};

export default RobotsView;
