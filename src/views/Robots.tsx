import React from 'react';
import { Box } from '@mui/material';
import { ResourceManager, type GridCol } from '../ui/ResourceManager';
import { robotsTable } from '../db/schema';
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
    render: (row: Record<string, unknown> & { name?: string, modality?: string }) => row.name
  },
  {
    field: "modality",
    headerName: "Modality",
    render: (row: Record<string, unknown> & { name?: string, modality?: string }) => (
                  <Badge
              key={row.modality}
              variant="outlined"
              label={row.modality}
              color={modalityBadgeColor(row.modality)}
            />
    )
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
