import React from 'react';
import { Box } from '@mui/material';
import { ResourceManager, type GridCol } from '../ui/ResourceManager';
import { robotsTable, type RobotRecord } from '../db/schema';
import RobotForm from './RobotForm';
import Badge from '../ui/Badge';

const modalityBadgeColor = (modality: string): "green" | "blue" | "gray" => {
  if (modality === "real") return "green";
  if (modality === "simulated") return "blue";
  return "gray";
};


const gridCols: GridCol[] = [
  {
    field: "name",
    headerName: "Name",
    render: (row) => (row as RobotRecord).name
  },
  {
    field: "modality",
    headerName: "Modality",
    render: (row) => {
      const robot = row as RobotRecord;
      return (
        <Badge
          key={robot.modality}
          variant="outlined"
          label={robot.modality}
          color={modalityBadgeColor(robot.modality)}
        />
      );
    }
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
