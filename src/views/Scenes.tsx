import React from "react";
import ResourceManager, { GridCol } from "../ui/ResourceManager";
import { scenesTable } from "../db/schema";
import { scenesResource } from "../db/resources";
import SceneForm from "./SceneForm";
import { Typography } from "@mui/material";
import Badge from "../ui/Badge";

const gridCols: GridCol[] = [
  {
    field: "name",
    headerName: "Name",
    render: (row: any) => row.name
  },
  {
    field: "robotName",
    headerName: "Robot",
    render: (row: any) => row.robotName || "No Robot"
  },
  {
    field: "robotModality",
    headerName: "Modality",
    render: (row: any) => {
      if (!row.robotModality) return <Typography variant="body2" color="text.disabled">-</Typography>;
      return (
        <Badge
          label={row.robotModality}
          variant="outlined"
          color={row.robotModality === 'simulated' ? 'blue' : 'green'}
          sx={{ height: 24 }}
        />
      );
    }
  },
  {
    field: "cameraCount",
    headerName: "Cameras",
    render: (row: any) => row.cameraCount || 0
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
