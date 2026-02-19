import React from "react";
import ResourceManager, { GridCol } from "../ui/ResourceManager";
import { scenesTable } from "../db/schema";
import { scenesResource } from "../db/resources";
import SceneForm from "./SceneForm";
import { Chip, Box, Typography } from "@mui/material";

const gridCols: GridCol[] = [
  {
    field: "name",
    headerName: "Name",
    render: (row: any) => row.name
  },
  {
    field: "robotName",
    headerName: "Robot",
    render: (row: any) => row.robotName || <Typography variant="body2" color="text.disabled">No Robot</Typography>
  },
  {
    field: "robotModality",
    headerName: "Modality",
    render: (row: any) => {
      if (!row.robotModality) return <Typography variant="body2" color="text.disabled">-</Typography>;
      return (
        <Chip
          label={row.robotModality.charAt(0).toUpperCase() + row.robotModality.slice(1)}
          size="small"
          variant="outlined"
          color={row.robotModality === 'simulated' ? 'primary' : 'success'}
          sx={{ height: 24 }}
        />
      );
    }
  },
  {
    field: "cameraCount",
    headerName: "Cameras",
    render: (row: any) => (
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2" fontWeight="500">{row.cameraCount || 0}</Typography>
        <Typography variant="caption" color="text.secondary">cam{row.cameraCount === 1 ? '' : 's'}</Typography>
      </Box>
    )
  },
];

const ScenesView: React.FC = () => {
  return (
    <div className="p-6">
      <ResourceManager
        title="Scenes"
        table={scenesTable}
        resource={scenesResource}
        gridCols={gridCols}
        renderForm={(props) => <SceneForm {...props} />}
      />
    </div>
  );
};

export default ScenesView;
